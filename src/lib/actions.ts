
'use server';
import 'dotenv/config';

import { travelChatbot } from "@/ai/flows/travel-chatbot";
import { getCulturalAdvice } from "@/ai/flows/cultural-advice-chatbot";
import type { User } from "@/hooks/use-auth";
import { getSupabaseClient_server } from './supabase';
import { packages, posts, categories as categoriesData, destinations, packageTypes, bookings, contactMessages, defaultSettings, pagesData, sitePages } from './data';


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
        if (error.message.includes('unique constraint') || error.message.includes('already been registered')) {
            return { success: false, message: "This email is already registered. Please login or use a different email." };
        }
        return { success: false, message: `An unexpected error occurred during signup: ${error.message}` };
    }
}


export async function setupSuperAdminAndSeed(adminData: Omit<User, 'id'>) {
    const supabase = getSupabaseClient_server();
    
    try {
        // PRE-FLIGHT CHECK: Verify if the database schema exists by checking a core table.
        const { error: preflightError } = await supabase.from('site_status').select('id').limit(1);
        if (preflightError && preflightError.code === '42P01') { // '42P01' is PostgreSQL's code for "undefined_table"
            return { success: false, message: "Database tables not found. Please run the initial database migration script before starting the setup." };
        }

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
        
        const superAdminForDb = { id: userRecord.id, role: 'superadmin', name: restOfAdminData.name, email: restOfAdminData.email, username: 'superadmin' };

        const demoUsers = [
            { id: 'user-2-admin', email: 'admin@example.com', name: 'Admin User', role: 'admin', username: 'admin' },
            { id: 'user-3-staff', email: 'staff@example.com', name: 'Staff Member', role: 'staff', username: 'staff' },
            { id: 'user-4-customer', email: 'customer1@example.com', name: 'Alice Johnson', role: 'customer', username: 'alice' },
            { id: 'user-5-customer', email: 'customer2@example.com', name: 'Bob Williams', role: 'customer', username: 'bob' },
        ];

        const usersToSeed = [superAdminForDb, ...demoUsers];

        const { error: userInsertError } = await supabase
            .from('users')
            .upsert(usersToSeed, { onConflict: 'id' });
        
        if (userInsertError) throw userInsertError;

        // 4. Seed all other tables using upsert
        const { error: settingsError } = await supabase.from('global_settings').upsert({ id: 1, ...defaultSettings });
        if(settingsError) throw settingsError;
        
        const { error: homeSettingsError } = await supabase.from('home_page_settings').upsert({
            id: 'home',
            hero_image_url: "https://images.pexels.com/photos/33041/antelope-canyon-lower-canyon-arizona.jpg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
            hero_title: "Your Ultimate Adventure Awaits",
            hero_subtitle: "Discover breathtaking destinations and create unforgettable memories with our curated travel packages.",
            hero_button_label: "Explore All Packages",
            hero_button_link: "/packages",
            status: 'published'
        }, { onConflict: 'id' });
        if(homeSettingsError) throw homeSettingsError;

        const destToSeed = destinations.map(d => ({...d, id: d.slug}));
        const { error: destError } = await supabase.from('destinations').upsert(destToSeed, { onConflict: 'id' });
        if(destError) throw destError;

        const typesToSeed = packageTypes.map(t => ({...t, id: t.slug}));
        const { error: typeError } = await supabase.from('package_types').upsert(typesToSeed, { onConflict: 'id' });
        if(typeError) throw typeError;

        const packagesToSeed = packages.map(p => ({ ...p, id: p.slug }));
        const { error: pkgError } = await supabase.from('packages').upsert(packagesToSeed, { onConflict: 'id' });
        if(pkgError) throw pkgError;

        const catToSeed = categoriesData.map(c => ({ ...c, id: c.slug }));
        const { error: catError } = await supabase.from('categories').upsert(catToSeed, { onConflict: 'id' });
        if(catError) throw catError;
        
        const postsToSeed = posts.map(p => ({...p, id: p.slug}));
        const { error: postError } = await supabase.from('posts').upsert(postsToSeed, { onConflict: 'id' });
        if(postError) throw postError;

        const { error: bookingError } = await supabase.from('bookings').upsert(bookings, { onConflict: 'id' });
        if(bookingError) throw bookingError;
        
        const { error: msgError } = await supabase.from('contact_messages').upsert(contactMessages, { onConflict: 'id' });
        if(msgError) throw msgError;

        const pagesToSeed = pagesData.map(p => ({...p, id: p.slug}));
        const { error: pagesError } = await supabase.from('pages').upsert(pagesToSeed, { onConflict: 'id' });
        if (pagesError) throw pagesError;
        
        const { error: sitePagesError } = await supabase.from('site_pages').upsert(sitePages, { onConflict: 'id' });
        if (sitePagesError) throw sitePagesError;

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
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
            // If it fails, maybe auth is already empty. Log it but continue.
            console.warn(`Could not list users, proceeding with reset: ${listError.message}`);
        }

        // Step 2: Delete each user from Supabase Auth if any were found
        if (users && users.length > 0) {
            for (const user of users) {
                const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
                if (deleteError) {
                    console.warn(`Could not delete auth user ${user.id}: ${deleteError.message}`);
                }
            }
            console.log(`Successfully deleted ${users.length} users from Auth.`);
        } else {
            console.log("No users found in Auth to delete.");
        }
        
        // Step 3: Delete data from all public tables using DELETE FROM, which is safer than TRUNCATE
        const tables = [
            'bookings', 'contact_messages', 'media', 'posts', 'categories', 
            'packages', 'destinations', 'package_types', 'pages', 'site_pages', 
            'global_settings', 'home_page_settings', 'users' 
        ];

        for (const table of tables) {
            const { error } = await supabase.from(table).delete().gt('id', 0);
             if (error && error.code !== '42P01') { // 42P01: undefined_table
                console.warn(`Could not clear table ${table}: ${error.message}`);
             }
        }
        console.log("Successfully cleared data from all application tables.");

        // Step 4: Reset the setup status
        const { error } = await supabase
          .from('site_status')
          .update({ is_setup_complete: false })
          .eq('id', 1);

        if (error) {
            // If the row doesn't exist, insert it. This is a safeguard for a completely empty DB.
            if (error.code === 'PGRST204' || error.code === '42P01') { 
                 const { error: insertError } = await supabase
                    .from('site_status')
                    .insert({ id: 1, is_setup_complete: false });
                 if (insertError && insertError.code !== '42P01') throw insertError;
            } else {
                throw error;
            }
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
