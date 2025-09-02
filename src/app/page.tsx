

import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle, Star, Users } from "lucide-react";
import PackageCard from "@/components/PackageCard";
import BlogCard from "@/components/BlogCard"; 
import { Package, Post, HomePageSettings, GlobalSettings } from "@/lib/data";
import { User as UserData } from '@/hooks/use-auth';
import { getSupabaseClient_server } from '@/lib/supabase';


async function getHomePageData() {
    const supabase = getSupabaseClient_server();

    // Define a safe default for home settings in case the DB call fails or returns nothing
    const defaultHomeSettings: HomePageSettings = {
        id: 'home',
        hero_image_url: "https://images.pexels.com/photos/33041/antelope-canyon-lower-canyon-arizona.jpg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
        hero_title: "Your Adventure Awaits",
        hero_subtitle: "Discover breathtaking destinations and create unforgettable memories.",
        hero_button_label: "Explore Packages",
        hero_button_link: "/packages",
        status: 'published'
    };
    
    // Fetch all data in parallel
    const settingsPromise = supabase.from('global_settings').select('*').single();
    const homeSettingsPromise = supabase.from('home_page_settings').select('*').eq('id', 'home').maybeSingle();
    const packagesPromise = supabase.from('packages').select('*').is('deleted_at', null).limit(3);
    const postsPromise = supabase.from('posts').select(`*, author:users(*)`).is('deleted_at', null).order('published_at', { ascending: false }).limit(3);

    const [
        { data: settings, error: settingsError },
        { data: homeSettingsData, error: homeSettingsError },
        { data: packages, error: packagesError },
        { data: posts, error: postsError }
    ] = await Promise.all([settingsPromise, homeSettingsPromise, packagesPromise, postsPromise]);

    // Log errors without crashing the page
    if(settingsError) console.error("Home page error fetching global settings:", settingsError.message);
    if(homeSettingsError) console.error("[ Server ] Home page error fetching home settings:", homeSettingsError.message);
    if(packagesError) console.error("Home page error fetching packages:", packagesError.message);
    if(postsError) console.error("Home page error fetching posts:", postsError.message);

    return {
        settings: (settings || {}) as GlobalSettings,
        homeSettings: (homeSettingsData || defaultHomeSettings) as HomePageSettings,
        packages: (packages || []) as Package[],
        posts: (posts || []) as (Post & { author: UserData | null })[]
    }
}

export default async function Home() {
    const { settings, homeSettings, packages, posts } = await getHomePageData();

    return (
        <div className="flex flex-col min-h-screen">
        <main className="flex-1">
            <section className="relative w-full h-[60vh] md:h-[80vh] flex items-center justify-center text-center text-white bg-black">
            {homeSettings && homeSettings.hero_image_url ? (
                <>
                <Image
                    src={homeSettings.hero_image_url}
                    alt="Exotic travel destination"
                    fill
                    className="absolute z-0 object-cover brightness-50"
                    data-ai-hint="exotic travel destination"
                    priority
                />
                <div className="relative z-10 p-4">
                    <h1 className="text-4xl md:text-6xl font-headline font-bold drop-shadow-lg">
                    {homeSettings.hero_title}
                    </h1>
                    <p className="mt-4 text-lg md:text-xl max-w-2xl mx-auto drop-shadow-md">
                    {homeSettings.hero_subtitle}
                    </p>
                    <Button asChild size="lg" className="mt-8 bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link href={homeSettings.hero_button_link || '/packages'}>
                        {homeSettings.hero_button_label} <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                    </Button>
                </div>
                </>
            ) : (
                <div className="text-center text-muted-foreground">Could not load hero section. Please complete site setup.</div>
            )}
            </section>

            <section id="featured-packages" className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl md:text-4xl font-headline font-bold text-center mb-12">
                Featured Tours & Packages
                </h2>
                {packages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {packages.map((pkg) => (
                        <PackageCard key={pkg.id} pkg={pkg} />
                    ))}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground">No featured packages available at the moment.</p>
                )}
                <div className="text-center mt-12">
                <Button asChild variant="outline">
                    <Link href="/packages">View All Packages</Link>
                </Button>
                </div>
            </div>
            </section>

            <section className="py-16 md:py-24 bg-secondary">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl md:text-4xl font-headline font-bold text-center mb-12">
                Why Choose TripMate?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div className="flex flex-col items-center">
                    <div className="bg-primary text-primary-foreground rounded-full p-4 mb-4">
                    <Star className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-headline font-semibold">Expertly-Crafted Tours</h3>
                    <p className="mt-2 text-muted-foreground">
                    Each itinerary is meticulously planned by our travel experts for a seamless experience.
                    </p>
                </div>
                <div className="flex flex-col items-center">
                    <div className="bg-primary text-primary-foreground rounded-full p-4 mb-4">
                    <Users className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-headline font-semibold">Trusted Local Guides</h3>
                    <p className="mt-2 text-muted-foreground">
                    Connect with the culture through our network of knowledgeable and friendly local guides.
                    </p>
                </div>
                <div className="flex flex-col items-center">
                    <div className="bg-primary text-primary-foreground rounded-full p-4 mb-4">
                    <CheckCircle className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-headline font-semibold">Secure & Simple Booking</h3>
                    <p className="mt-2 text-muted-foreground">
                    Book your dream vacation in minutes with our secure and easy-to-use payment system.
                    </p>
                </div>
                </div>
            </div>
            </section>

            <section id="featured-blog" className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl md:text-4xl font-headline font-bold text-center mb-12">
                From Our Blog
                </h2>
                {posts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {posts.map((post) => (
                        <BlogCard key={post.id} post={post} author={post.author || undefined} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground">No blog posts available at the moment.</p>
                )}
                <div className="text-center mt-12">
                <Button asChild variant="outline">
                    <Link href="/blog">View All Posts</Link>
                </Button>
                </div>
            </div>
            </section>
            
            <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl md:text-4xl font-headline font-bold">Ready to Start Your Journey?</h2>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                    Let us help you plan the trip of a lifetime. Our travel experts are here to assist you every step of the way.
                </p>
            </div>
            </section>

        </main>
        </div>
    );
}
