
"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextCursorInput, Pilcrow, Loader2, PlusCircle, Trash2, SearchX, AlertTriangle, Database, Link as LinkIcon, ExternalLink, ShieldAlert } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { getSupabaseClient_client } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import type { GlobalSettings, SocialLinkPlatform, SocialLink, FooterLink } from "@/lib/data";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { resetApplication } from "@/lib/actions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";


function ResetApplicationZone() {
    const { toast } = useToast();
    const { logout } = useAuth();
    const [isResetting, setIsResetting] = useState(false);

    const handleReset = async () => {
        setIsResetting(true);
        try {
            const result = await resetApplication();
            if (result.success) {
                toast({
                    title: "Application Reset Successful",
                    description: "The application has been reset to its initial state. You will now be logged out.",
                });
                await logout();
                window.location.href = '/'; 
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({
                title: "Error Resetting Application",
                description: error.message || "An unexpected error occurred.",
                variant: "destructive",
            });
             setIsResetting(false);
        }
    };

    return (
         <Card className="border-destructive">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <ShieldAlert className="h-8 w-8 text-destructive" />
                    <div>
                        <CardTitle>Danger Zone</CardTitle>
                        <CardDescription>Critical and irreversible actions for the application.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row items-center justify-between rounded-lg border border-destructive/50 p-4">
                    <div>
                        <h4 className="font-semibold">Reset Application</h4>
                        <p className="text-sm text-muted-foreground max-w-xl">
                            This will permanently delete all data, including users, packages, posts, and settings, and reset the application to its initial setup state. This does not remove Firestore indexes.
                        </p>
                    </div>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" className="mt-4 shrink-0 md:mt-0 md:ml-4" disabled={isResetting}>
                                {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                {isResetting ? "Resetting..." : "Reset Application"}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete all data and require you to go through the setup process again.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleReset} className="bg-destructive hover:bg-destructive/90">
                                    I understand, reset the application
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>
    );
}

const socialPlatforms: { value: SocialLinkPlatform, label: string }[] = [
    { value: 'twitter', label: 'Twitter' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'youtube', label: 'YouTube' },
];

function IndexManagementZone() {
    // This component is no longer needed as we are not using Firestore indexes
    return null;
}

export default function AdminSettingsPage() {
    const { toast } = useToast();
    const { settings: contextSettings, setSettings: setContextSettings, loading: contextLoading } = useAppContext();
    const [settings, setSettings] = useState<GlobalSettings | null>(contextSettings);
    const supabase = getSupabaseClient_client();

    useEffect(() => {
        setSettings(contextSettings);
    }, [contextSettings]);

    const handleSettingsChange = (field: keyof GlobalSettings, value: any) => {
        setSettings(prev => prev ? ({...prev, [field]: value}) : null);
    };
    
    const handleLinkColumnChange = (field: 'quick_links' | 'support_links', subField: 'title' | 'links', value: any) => {
        setSettings(prev => {
            if (!prev) return null;
            return {
                ...prev,
                [field]: {
                    ...prev[field],
                    [subField]: value,
                }
            }
        });
    };
    
    const handleFooterLinkChange = (columnKey: 'quick_links' | 'support_links', linkIndex: number, field: 'label' | 'url', value: string) => {
        setSettings(prev => {
            if (!prev) return null;
            const newLinks = [...prev[columnKey].links];
            newLinks[linkIndex] = { ...newLinks[linkIndex], [field]: value };
            return {
                ...prev,
                [columnKey]: { ...prev[columnKey], links: newLinks }
            };
        });
    };

    const addFooterLink = (columnKey: 'quick_links' | 'support_links') => {
        setSettings(prev => {
            if (!prev) return null;
            const newLinks = [...prev[columnKey].links, { id: `fl-${Date.now()}`, label: 'New Link', url: '/' }];
            return {
                ...prev,
                [columnKey]: { ...prev[columnKey], links: newLinks }
            };
        });
    };

    const removeFooterLink = (columnKey: 'quick_links' | 'support_links', linkIndex: number) => {
        setSettings(prev => {
            if (!prev) return null;
            const newLinks = prev[columnKey].links.filter((_, i) => i !== linkIndex);
             return {
                ...prev,
                [columnKey]: { ...prev[columnKey], links: newLinks }
            };
        });
    };

    const handleSocialLinkChange = (index: number, field: 'platform' | 'url', value: string) => {
        if (!settings) return;
        const newLinks = [...settings.social_links];
        newLinks[index] = { ...newLinks[index], [field]: value as any };
        handleSettingsChange('social_links', newLinks);
    }

    const addSocialLink = () => {
        if (!settings) return;
        const newLinks = [...settings.social_links, { id: `soc-${Date.now()}`, platform: 'twitter', url: '' }];
        handleSettingsChange('social_links', newLinks);
    };

    const removeSocialLink = (index: number) => {
        if (!settings) return;
        const newLinks = settings.social_links.filter((_, i) => i !== index);
        handleSettingsChange('social_links', newLinks);
    };

    const handleSaveChanges = async () => {
        if (!settings) return;
        try {
            const { error } = await supabase.from('global_settings').upsert({ id: 1, ...settings });
            if (error) throw error;
            setContextSettings(settings); 
            toast({
                title: "Settings Saved!",
                description: "Your changes have been saved to the database.",
            });
        } catch (error: any) {
            console.error("Error saving settings:", error);
            toast({ title: "Error", description: `Failed to save settings: ${error.message}`, variant: "destructive" });
        }
    };
    
    if (contextLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Global Site Settings</CardTitle>
                    <CardDescription>Manage your global site settings from here.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }
    
    if (!settings) {
         return (
            <Card>
                <CardHeader>
                    <CardTitle>Error</CardTitle>
                    <CardDescription>Could not load site settings. Please try seeding the database or check console for errors.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
    <div className="space-y-6">
        <Card>
        <CardHeader>
            <CardTitle>Global Site Settings</CardTitle>
            <CardDescription>Manage your global site settings from here.</CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="general"><TextCursorInput className="mr-2"/>General</TabsTrigger>
                    <TabsTrigger value="footer"><Pilcrow className="mr-2"/>Footer</TabsTrigger>
                    <TabsTrigger value="advanced"><ShieldAlert className="mr-2"/>Advanced</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="pt-6">
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Site Identity</h3>
                            <div>
                                <Label htmlFor="site_title">Site Title</Label>
                                <Input 
                                    id="site_title" 
                                    value={settings.site_title} 
                                    onChange={(e) => handleSettingsChange('site_title', e.target.value)}
                                    placeholder="Your awesome travel agency"
                                />
                                <p className="text-sm text-muted-foreground mt-2">
                                    This will appear in the browser tab and search engine results.
                                </p>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Branding</h3>
                            <div>
                                <Label htmlFor="logo_url">Site Logo URL</Label>
                                <Input 
                                    id="logo_url" 
                                    value={settings.logo_url} 
                                    onChange={(e) => handleSettingsChange('logo_url', e.target.value)}
                                    placeholder="https://example.com/logo.png"
                                />
                                <p className="text-sm text-muted-foreground mt-2">
                                    Enter the full URL for your site's logo.
                                </p>
                            </div>
                            <div>
                                <Label htmlFor="favicon_url">Favicon URL</Label>
                                <Input 
                                    id="favicon_url" 
                                    value={settings.favicon_url} 
                                    onChange={(e) => handleSettingsChange('favicon_url', e.target.value)}
                                    placeholder="https://example.com/favicon.svg"
                                />
                                <p className="text-sm text-muted-foreground mt-2">
                                    Enter the full URL for your site's favicon (the little icon in the browser tab).
                                </p>
                            </div>
                        </div>

                        <Separator />
                        
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Search Engine Visibility</h3>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="search_engine_visibility"
                                    checked={settings.search_engine_visibility}
                                    onCheckedChange={(checked) => handleSettingsChange('search_engine_visibility', checked)}
                                />
                                <Label htmlFor="search_engine_visibility">Discourage search engines from indexing this site</Label>
                            </div>
                            {settings.search_engine_visibility === false && (
                                <Alert variant="destructive">
                                    <SearchX className="h-4 w-4" />
                                    <AlertTitle>Visibility Hidden</AlertTitle>
                                    <AlertDescription>
                                    Search engines will be discouraged from showing this site in search results. This does not completely guarantee the site won't be indexed.
                                    </AlertDescription>
                                </Alert>
                            )}
                            <p className="text-sm text-muted-foreground">
                            It is up to search engines to honor this request.
                            </p>
                        </div>

                    </div>
                </TabsContent>

                <TabsContent value="footer" className="pt-6">
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Column 1: Description & Socials</h3>
                            <div>
                                <Label htmlFor="footer_description">Text under logo</Label>
                                <Textarea 
                                    id="footer_description" 
                                    value={settings.footer_description} 
                                    onChange={(e) => handleSettingsChange('footer_description', e.target.value)}
                                    placeholder="Your adventure starts here..."
                                />
                            </div>
                            <div className="space-y-3 pt-4">
                                <Label>Social Media Links</Label>
                                {settings.social_links.map((link, index) => (
                                    <div key={link.id} className="flex items-end gap-2">
                                        <div className="flex-grow grid grid-cols-3 gap-2">
                                            <select
                                                value={link.platform}
                                                onChange={(e) => handleSocialLinkChange(index, 'platform', e.target.value)}
                                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {socialPlatforms.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                            </select>
                                            <Input
                                                type="url"
                                                placeholder="https://..."
                                                value={link.url}
                                                onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)}
                                                className="col-span-2"
                                            />
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => removeSocialLink(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <Button variant="outline" size="sm" onClick={addSocialLink}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Social Link
                            </Button>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Column 2: Quick Links</h3>
                            <div>
                                <Label>Column Title</Label>
                                <Input 
                                    value={settings.quick_links.title} 
                                    onChange={(e) => handleLinkColumnChange('quick_links', 'title', e.target.value)}
                                />
                            </div>
                            <Label>Links</Label>
                            <div className="space-y-2">
                                {settings.quick_links.links.map((link, index) => (
                                    <div key={link.id} className="flex items-center gap-2">
                                        <Input placeholder="Label" value={link.label} onChange={(e) => handleFooterLinkChange('quick_links', index, 'label', e.target.value)} />
                                        <Input placeholder="URL" value={link.url} onChange={(e) => handleFooterLinkChange('quick_links', index, 'url', e.target.value)} />
                                        <Button variant="ghost" size="icon" onClick={() => removeFooterLink('quick_links', index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => addFooterLink('quick_links')}><PlusCircle className="mr-2 h-4 w-4"/> Add Link</Button>
                        </div>
                        
                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Column 3: Support Links</h3>
                            <div>
                                <Label>Column Title</Label>
                                <Input 
                                    value={settings.support_links.title} 
                                    onChange={(e) => handleLinkColumnChange('support_links', 'title', e.target.value)}
                                />
                            </div>
                            <Label>Links</Label>
                            <div className="space-y-2">
                                {settings.support_links.links.map((link, index) => (
                                    <div key={link.id} className="flex items-center gap-2">
                                        <Input placeholder="Label" value={link.label} onChange={(e) => handleFooterLinkChange('support_links', index, 'label', e.target.value)} />
                                        <Input placeholder="URL" value={link.url} onChange={(e) => handleFooterLinkChange('support_links', index, 'url', e.target.value)} />
                                        <Button variant="ghost" size="icon" onClick={() => removeFooterLink('support_links', index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => addFooterLink('support_links')}><PlusCircle className="mr-2 h-4 w-4"/> Add Link</Button>
                        </div>

                        <Separator/>

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Column 4: Location Map</h3>
                            <div>
                                <Label htmlFor="google_map_embed_code">Google Maps Embed Code</Label>
                                <Textarea 
                                    id="google_map_embed_code" 
                                    value={settings.google_map_embed_code} 
                                    onChange={(e) => handleSettingsChange('google_map_embed_code', e.target.value)}
                                    placeholder='Go to Google Maps, find your location, click "Share", then "Embed a map", and copy the HTML here.'
                                    rows={4}
                                />
                                <p className="text-sm text-muted-foreground mt-2">
                                    {'Paste the full `<iframe...>` code from Google Maps here.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </TabsContent>
                
                <TabsContent value="advanced" className="pt-6 space-y-6">
                    <ResetApplicationZone />
                </TabsContent>

            </Tabs>
            
            <div className="mt-8 pt-6 border-t flex justify-end">
                <Button onClick={handleSaveChanges}>Save Changes</Button>
            </div>
        </CardContent>
        </Card>
    </div>
    );
}

    