

'use server';
import 'dotenv/config';

import { travelChatbot } from "@/ai/flows/travel-chatbot";
import { getCulturalAdvice } from "@/ai/flows/cultural-advice-chatbot";
import type { User } from "@/hooks/use-auth";
import { getSupabaseClient_server } from './supabase';
import { packages, posts, categories as categoriesData, destinations, packageTypes, bookings, contactMessages } from './data';


export async function handleTravelChat(history: Message[], query: string): Promise<string> {
  const result = await travelChatbot({ query });
  return result.response;
}

export async function handleCulturalAdvice(destination: string, query: string): Promise<string> {
  const result = await getCulturalAdvice({ destination, query });
  return result.advice;
}

type Message = {
  role: "user" | "bot";
  content: string;
};

// Helper function to create user in Supabase Auth.
async function createUserInSupabaseAuth(adminData: Omit<User, 'id'>) {
  const supabase = getSupabaseClient_server();
  const { data, error } = await supabase.auth.admin.createUser({
    email: adminData.email!,
    password: adminData.password!,
    email_confirm: true, // Auto-confirm email for admin-created users
    user_metadata: {
      name: adminData.name,
      photo_url: adminData.photo_url || '',
    }
  });

  if (error) {
    throw error;
  }
  return data.user;
}


export async function deleteUser(userId: string) {
    if (!userId) {
        return { success: false, message: "User ID is required." };
    }

    try {
        const supabase = getSupabaseClient_server();
        
        // Delete from Supabase Auth
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);
        if (authError) throw authError;

        // Delete from 'users' table (should cascade, but we do it explicitly to be safe)
        const { error: dbError } = await supabase.from('users').delete().eq('id', userId);
        if (dbError) throw dbError;

        console.log(`Successfully deleted user ${userId} from Auth and Supabase.`);
        return { success: true, message: `Successfully deleted user ${userId}.`};
    } catch (error: any) {
        console.error(`Failed to delete user ${userId}:`, error);
        let message = "An unknown error occurred.";
        if (error.message.includes('User not found')) {
            message = "User not found in Supabase Authentication. They may have already been deleted.";
        } else {
            message = error.message;
        }
        return { success: false, message: message };
    }
}


export async function emptyTrash(collectionName: 'posts' | 'bookings' | 'contact_messages' | 'media') {
    const supabase = getSupabaseClient_server();
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from(collectionName)
        .delete()
        .lt('deleted_at', thirtyDaysAgo);
  
      if (error) throw error;
  
      return { success: true, message: `Trash for ${collectionName} emptied successfully.` };
    } catch (error: any) {
      console.error(`Error emptying trash for ${collectionName}:`, error);
      return { success: false, message: error.message };
    }
}


export async function signupUser(userData: Omit<User, 'id'>) {
    try {
        const userRecord = await createUserInSupabaseAuth(userData);
        if (!userRecord) throw new Error("User creation failed in Auth.");

        const supabase = getSupabaseClient_server();
        const { password, ...restOfUserData } = userData;
        
        const { error } = await supabase
          .from('users')
          .insert({
            id: userRecord.id,
            name: restOfUserData.name,
            email: restOfUserData.email,
            role: restOfUserData.role,
            username: restOfUserData.username,
            phone: restOfUserData.phone,
            photo_url: restOfUserData.photo_url
          });
        
        if (error) throw error;

        return { success: true, user: { id: userRecord.id, ...restOfUserData } };
    } catch (error: any) {
        console.error("Error during signup:", error);
        if (error.message.includes('unique constraint')) {
            return { success: false, message: "This email is already registered. Please login or use a different email." };
        }
        return { success: false, message: `An unexpected error occurred during signup: ${error.message}` };
    }
}


export async function setupSuperAdminAndSeed(adminData: Omit<User, 'id'>) {
    const supabase = getSupabaseClient_server();
    
    try {
        // 1. Check if setup is already complete in Supabase
        const { data: statusData, error: statusError } = await supabase
            .from('site_status')
            .select('is_setup_complete')
            .limit(1)
            .maybeSingle();

        if (statusData && statusData.is_setup_complete) {
            return { success: false, message: "Setup has already been completed." };
        }
        
        // 2. Create the superadmin user in Supabase Auth
        const userRecord = await createUserInSupabaseAuth(adminData);
        if (!userRecord) throw new Error("Superadmin creation failed in Auth.");
        
        // 3. Insert the new superadmin user and other demo users into the Supabase 'users' table
        const { password, ...restOfAdminData } = adminData;
        
        // The new superadmin is created from the form.
        const superAdminForDb = { id: userRecord.id, role: 'superadmin', name: restOfAdminData.name, email: restOfAdminData.email, username: 'superadmin' };

        // Demo users to seed, excluding any potential duplicates.
        const demoUsers = [
            { id: 'user-2-admin', email: 'admin@example.com', name: 'Admin User', role: 'admin', username: 'admin' },
            { id: 'user-3-staff', email: 'staff@example.com', name: 'Staff Member', role: 'staff', username: 'staff' },
            { id: 'user-4-customer', email: 'customer1@example.com', name: 'Alice Johnson', role: 'customer', username: 'alice' },
            { id: 'user-5-customer', email: 'customer2@example.com', name: 'Bob Williams', role: 'customer', username: 'bob' },
        ];

        // Combine the new superadmin with the demo users for a single insert operation.
        const usersToSeed = [superAdminForDb, ...demoUsers];

        const { error: userInsertError } = await supabase
            .from('users')
            .insert(usersToSeed);
        
        if (userInsertError) throw userInsertError;

        // 4. Seed all other tables
        const { error: settingsError } = await supabase.from('global_settings').insert({
            id: 1,
            site_title: "TripMate",
            logo_url: "/logo.svg",
            favicon_url: "/favicon.svg",
            search_engine_visibility: true,
            footer_description: "Your adventure starts here. Discover breathtaking destinations with us.",
            quick_links: { title: "Quick Links", links: [ { id: "fl1-1", label: "About Us", url: "/about-us" }, { id: "fl1-2", label: "Packages", url: "/packages" }, { id: "fl1-3", label: "Blog", url: "/blog" } ] },
            support_links: { title: "Support", links: [ { id: "fl2-1", label: "FAQ", url: "/faq" }, { id: "fl2-2", label: "Terms of Service", url: "/terms-of-service" }, { id: "fl2-3", label: "Privacy Policy", url: "/privacy-policy" } ] },
            social_links: [ { id: "soc-1", platform: 'facebook', url: 'https://facebook.com' }, { id: "soc-2", platform: 'twitter', url: 'https://twitter.com' }, { id: "soc-3", platform: 'instagram', url: 'https://instagram.com' } ],
            google_map_embed_code: `<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3651.889926830737!2d90.3881699154402!3d23.75124979467103!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755b8bcd681372b%3A0x5c2b8755e3624576!2sBashundhara%20City!5e0!3m2!1sen!2sbd!4v1622542023537!5m2!1sen!2sbd" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>`
        });
        if(settingsError) throw settingsError;
        
        const { error: homeSettingsError } = await supabase.from('home_page_settings').insert({
            id: 'home',
            hero_image_url: "https://images.pexels.com/photos/33041/antelope-canyon-lower-canyon-arizona.jpg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
            hero_title: "Your Ultimate Adventure Awaits",
            hero_subtitle: "Discover breathtaking destinations and create unforgettable memories with our curated travel packages.",
            hero_button_label: "Explore All Packages",
            hero_button_link: "/packages",
            status: 'published'
        });
        if(homeSettingsError) throw homeSettingsError;

        const destToSeed = destinations.map(d => ({...d, id: d.slug}));
        const { error: destError } = await supabase.from('destinations').insert(destToSeed);
        if(destError) throw destError;

        const typesToSeed = packageTypes.map(t => ({...t, id: t.slug}));
        const { error: typeError } = await supabase.from('package_types').insert(typesToSeed);
        if(typeError) throw typeError;

        const packagesToSeed = packages.map(p => ({ ...p, id: p.slug }));
        const { error: pkgError } = await supabase.from('packages').insert(packagesToSeed);
        if(pkgError) throw pkgError;

        const catToSeed = categoriesData.map(c => ({ ...c, id: c.slug }));
        const { error: catError } = await supabase.from('categories').insert(catToSeed);
        if(catError) throw catError;
        
        const postsToSeed = posts.map(p => ({...p, id: p.slug}));
        const { error: postError } = await supabase.from('posts').insert(postsToSeed);
        if(postError) throw postError;

        const { error: bookingError } = await supabase.from('bookings').insert(bookings);
        if(bookingError) throw bookingError;
        
        const { error: msgError } = await supabase.from('contact_messages').insert(contactMessages);
        if(msgError) throw msgError;

        const { error: pagesError } = await supabase.from('site_pages').insert([
          { id: 'about-us', title: 'About Us', content: 'This is the default about us page content.', status: 'published' },
          { id: 'faq', title: 'Frequently Asked Questions', items: [{id: 'faq-1', question: 'What is included?', answer: 'Everything.'}], status: 'published' },
          { id: 'terms-of-service', title: 'Terms of Service', content: 'These are the terms.', status: 'published' },
          { id: 'privacy-policy', title: 'Privacy Policy', content: 'This is the privacy policy.', status: 'published' }
        ]);
        if (pagesError) throw pagesError;

        // 5. Mark setup as complete in Supabase
        const { error: setupCompleteError } = await supabase
            .from('site_status')
            .upsert({ id: 1, is_setup_complete: true }, { onConflict: 'id' });

        if (setupCompleteError) throw setupCompleteError;

        return { success: true, message: "Superadmin created and database seeded successfully." };

    } catch (error: any) {
        console.error("Error during setup:", error);
        return { success: false, message: `An unexpected error occurred during setup: ${error.message}` };
    }
}


export async function resetApplication() {
    console.log("Starting application reset...");
    const supabase = getSupabaseClient_server();
    
    try {
        // Step 1: Get all users from Supabase Auth
        const { data: { users }, error: listUsersError } = await supabase.auth.admin.listUsers();
        if (listUsersError) throw listUsersError;

        // Step 2: Delete all users from Supabase Auth
        for (const user of users) {
            const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
            if (deleteError) {
                console.warn(`Could not delete user ${user.id}:`, deleteError.message);
            } else {
                console.log(`Deleted user ${user.id} from Auth.`);
            }
        }
        console.log("All users have been deleted from Supabase Auth.");

        // Step 3: Truncate all public tables to reset all data
        const tables = [
            'bookings', 'posts', 'packages', 'package_types', 'destinations',
            'categories', 'users', 'contact_messages', 'media', 
            'pages', 'site_pages', 'home_page_settings', 'global_settings', 'site_status'
        ];
        
        for (const table of tables.reverse()) { // Reverse order for DELETE to respect dependencies
            const { error: deleteError } = await supabase.from(table).delete().neq('id', 'this-will-never-be-true'); // Delete all rows
            if (deleteError) {
                // We'll log the error but attempt to continue, as some tables might not exist yet if setup failed midway.
                console.warn(`Could not clear table: ${table}. Error: ${deleteError.message}`);
            }
        }
        
        console.log("Attempted to clear all application tables.");

        // Step 4: Re-insert the status row to allow setup again
        const { error: setupStatusError } = await supabase.from('site_status').insert({ id: 1, is_setup_complete: false });
        if (setupStatusError) {
            console.error("Failed to reset site_status table:", setupStatusError);
            // This is a critical failure, as the app won't know to re-run setup.
            throw new Error(`Failed to reset application status: ${setupStatusError.message}`);
        }
        console.log("Application status has been reset. Ready for new setup.");
        
        return { success: true, message: "Application has been reset to its initial state." };

    } catch (error: any) {
        console.error("Failed to reset application:", error);
        return { success: false, message: `An error occurred during application reset: ${error.message}` };
    }
}

export async function updatePageStatus(id: string, type: 'Dynamic' | 'Static' | 'Home', status: 'published' | 'draft') {
    const supabase = getSupabaseClient_server();
    let tableName: string;
    let dataToUpdate: any = { status };

    if (type === 'Dynamic') {
        tableName = 'pages';
    } else if (type === 'Static') {
        tableName = 'site_pages';
    } else if (type === 'Home') {
        tableName = 'home_page_settings';
        dataToUpdate.id = 'home';
    } else {
        return { success: false, message: 'Invalid page type.' };
    }
    
    try {
        const { error } = await supabase
            .from(tableName)
            .update(dataToUpdate)
            .eq('id', id);

        if (error) throw error;
        
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
