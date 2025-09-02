
"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import MediaPicker from "@/components/admin/MediaPicker";
import { Textarea } from "@/components/ui/textarea";
import { getSupabaseClient_client } from "@/lib/supabase";
import { HomePageSettings } from "@/lib/data";


export default function AdminHomePageSettings() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<HomePageSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = getSupabaseClient_client();

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase.from('home_page_settings').select('*').eq('id', 'home').maybeSingle();
                
                if (error) throw error; 

                if (data) {
                    setSettings(data as HomePageSettings);
                } else {
                    // Initialize with default values if not found in the database
                    setSettings({
                        id: 'home', // Important to set the ID
                        hero_image_url: "https://placehold.co/1920x1080.png",
                        hero_title: "Your Adventure Awaits",
                        hero_subtitle: "Discover breathtaking destinations and create unforgettable memories with Flight Blu.",
                        hero_button_label: "Explore Packages",
                        hero_button_link: "/packages",
                        status: 'published',
                    });
                }
            } catch (error: any) {
                console.error("Error fetching homepage settings:", error);
                toast({ title: "Error", description: `Could not load homepage settings: ${error.message}`, variant: "destructive"});
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [toast, supabase]);
    
    const handleSettingsChange = (field: keyof HomePageSettings, value: any) => {
        setSettings(prev => prev ? ({...prev, [field]: value}) : null);
    }
    
    const handleSaveChanges = async () => {
        if (!settings) return;
        try {
            // Use upsert to either create the row if it doesn't exist or update it if it does.
            const { error } = await supabase.from('home_page_settings').upsert({ ...settings }, { onConflict: 'id' });
            if (error) throw error;
            toast({
                title: "Settings Saved!",
                description: "Your homepage settings have been updated.",
            });
        } catch (error: any) {
            console.error("Error saving settings:", error);
            toast({ title: "Error", description: `Failed to save settings: ${error.message}`, variant: "destructive" });
        }
    };
    
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Home Page Settings</CardTitle>
                    <CardDescription>Manage the content of your site's home page.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </CardContent>
            </Card>
        )
    }
    
    if (!settings) {
         return (
            <Card>
                <CardHeader>
                    <CardTitle>Error</CardTitle>
                    <CardDescription>Could not load home page settings. Please try again later.</CardDescription>
                </CardHeader>
            </Card>
        )
    }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Home Page Settings</CardTitle>
        <CardDescription>Manage the content of your site's home page from here.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
            <h3 className="text-lg font-medium">Hero Section</h3>
            <div className="space-y-2">
                <Label>Hero Image</Label>
                <MediaPicker 
                    imageUrl={settings.hero_image_url} 
                    onImageUrlChange={(url) => handleSettingsChange('hero_image_url', url)}
                />
                <p className="text-sm text-muted-foreground">Recommended size: 1920x1080px. This will be the main background image.</p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="hero_title">Hero Title</Label>
                <Input 
                    id="hero_title" 
                    value={settings.hero_title}
                    onChange={(e) => handleSettingsChange('hero_title', e.target.value)}
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="hero_subtitle">Hero Subtitle</Label>
                <Textarea 
                    id="hero_subtitle" 
                    value={settings.hero_subtitle}
                    onChange={(e) => handleSettingsChange('hero_subtitle', e.target.value)}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="hero_button_label">Button Label</Label>
                    <Input 
                        id="hero_button_label" 
                        value={settings.hero_button_label}
                        onChange={(e) => handleSettingsChange('hero_button_label', e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="hero_button_link">Button Link</Label>
                    <Input 
                        id="hero_button_link" 
                        value={settings.hero_button_link}
                        onChange={(e) => handleSettingsChange('hero_button_link', e.target.value)}
                        placeholder="/packages"
                    />
                </div>
            </div>
        </div>
        
        <div className="mt-8 pt-6 border-t flex justify-end">
            <Button onClick={handleSaveChanges}>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  );
}
