
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { getSupabaseClient_client } from "@/lib/supabase";
import { SitePage, FaqItem } from "@/lib/data";
import { Separator } from "@/components/ui/separator";

type SitePagesData = {
    'about-us': SitePage,
    'faq': SitePage,
    'terms-of-service': SitePage,
    'privacy-policy': SitePage
}

export default function AdminStaticPages() {
    const { toast } = useToast();
    const [pages, setPages] = useState<SitePagesData | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = getSupabaseClient_client();

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase.from("site_pages").select('*');
                if (error) throw error;
                
                const pagesData = data.reduce((acc, page) => {
                    acc[page.id as keyof SitePagesData] = page;
                    return acc;
                }, {} as SitePagesData);

                setPages(pagesData);
            } catch (error) {
                console.error("Error fetching static page settings:", error);
                toast({ title: "Error", description: "Could not load page settings.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [toast, supabase]);
    
    const handlePageChange = (pageId: keyof SitePagesData, field: keyof SitePage, value: any) => {
        setPages(prev => prev ? ({
            ...prev,
            [pageId]: { ...prev[pageId], [field]: value }
        }) : null);
    }

    const handleFaqChange = (index: number, field: 'question' | 'answer', value: string) => {
        if (!pages) return;
        const newItems = [...(pages.faq.items || [])];
        newItems[index] = { ...newItems[index], [field]: value };
        handlePageChange('faq', 'items', newItems);
    }
    
    const addFaqItem = () => {
        if (!pages) return;
        const newItems = [...(pages.faq.items || []), { id: `faq-${Date.now()}`, question: "", answer: "" }];
        handlePageChange('faq', 'items', newItems);
    }

    const removeFaqItem = (index: number) => {
        if (!pages) return;
        const newItems = (pages.faq.items || []).filter((_, i) => i !== index);
        handlePageChange('faq', 'items', newItems);
    }

    const handleSaveChanges = async () => {
        if (!pages) return;
        try {
            const pagesToUpdate = Object.values(pages);
            const { error } = await supabase.from('site_pages').upsert(pagesToUpdate);
            if (error) throw error;

            toast({
                title: "Settings Saved!",
                description: "Your static page content has been updated.",
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
                    <CardTitle>Static Page Settings</CardTitle>
                    <CardDescription>Manage content for fixed pages like About Us, FAQ, etc.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </CardContent>
            </Card>
        )
    }

  return (
    <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Static Page Settings</CardTitle>
            <CardDescription>Manage content for fixed pages like About Us, FAQ, etc. Click "Save All Changes" at the bottom when you're done.</CardDescription>
          </CardHeader>
        </Card>

        {/* About Us Section */}
        <Card id="about-us">
            <CardHeader>
                <CardTitle>About Us Page</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="aboutTitle">Page Title</Label>
                    <Input id="aboutTitle" value={pages?.['about-us']?.title || ''} onChange={(e) => handlePageChange('about-us', 'title', e.target.value)} />
                </div>
                 <div>
                    <Label htmlFor="aboutContent">Page Content (Markdown supported)</Label>
                    <Textarea id="aboutContent" value={pages?.['about-us']?.content || ''} onChange={(e) => handlePageChange('about-us', 'content', e.target.value)} rows={10} />
                </div>
            </CardContent>
        </Card>
        
        {/* FAQ Section */}
        <Card id="faq">
            <CardHeader>
                <CardTitle>FAQ Page</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div>
                    <Label htmlFor="faqTitle">Page Title</Label>
                    <Input id="faqTitle" value={pages?.faq?.title || ''} onChange={(e) => handlePageChange('faq', 'title', e.target.value)} />
                </div>
                <Separator />
                <Label>Questions & Answers</Label>
                {pages?.faq?.items?.map((item, index) => (
                    <div key={item.id} className="space-y-2 p-4 border rounded-md relative">
                         <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeFaqItem(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <div>
                            <Label htmlFor={`faq-q-${index}`}>Question</Label>
                            <Input id={`faq-q-${index}`} value={item.question} onChange={(e) => handleFaqChange(index, 'question', e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor={`faq-a-${index}`}>Answer (Markdown supported)</Label>
                            <Textarea id={`faq-a-${index}`} value={item.answer} onChange={(e) => handleFaqChange(index, 'answer', e.target.value)} rows={3} />
                        </div>
                    </div>
                ))}
                 <Button variant="outline" onClick={addFaqItem}><PlusCircle className="mr-2"/> Add FAQ Item</Button>
            </CardContent>
        </Card>
        
        {/* Terms of Service Section */}
         <Card id="terms-of-service">
            <CardHeader>
                <CardTitle>Terms of Service Page</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="termsTitle">Page Title</Label>
                    <Input id="termsTitle" value={pages?.['terms-of-service']?.title || ''} onChange={(e) => handlePageChange('terms-of-service', 'title', e.target.value)} />
                </div>
                 <div>
                    <Label htmlFor="termsContent">Page Content (Markdown supported)</Label>
                    <Textarea id="termsContent" value={pages?.['terms-of-service']?.content || ''} onChange={(e) => handlePageChange('terms-of-service', 'content', e.target.value)} rows={10} />
                </div>
            </CardContent>
        </Card>
        
        {/* Privacy Policy Section */}
        <Card id="privacy-policy">
            <CardHeader>
                <CardTitle>Privacy Policy Page</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="privacyTitle">Page Title</Label>
                    <Input id="privacyTitle" value={pages?.['privacy-policy']?.title || ''} onChange={(e) => handlePageChange('privacy-policy', 'title', e.target.value)} />
                </div>
                 <div>
                    <Label htmlFor="privacyContent">Page Content (Markdown supported)</Label>
                    <Textarea id="privacyContent" value={pages?.['privacy-policy']?.content || ''} onChange={(e) => handlePageChange('privacy-policy', 'content', e.target.value)} rows={10} />
                </div>
            </CardContent>
        </Card>

        <div className="sticky bottom-6 flex justify-end">
            <Button size="lg" onClick={handleSaveChanges}>Save All Changes</Button>
        </div>
    </div>
  );
}
