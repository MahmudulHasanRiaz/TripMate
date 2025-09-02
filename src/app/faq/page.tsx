
import { SitePage } from "@/lib/data";
import { getSupabaseClient_server } from "@/lib/supabase";
import Head from "next/head";
import { notFound } from "next/navigation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

async function getFaqContent(): Promise<SitePage | null> {
    const supabase = getSupabaseClient_server();
    const { data, error } = await supabase
        .from('site_pages')
        .select('*')
        .eq('id', 'faq')
        .maybeSingle();

    if(error) {
        console.error("Error fetching FAQ content:", error);
        return null;
    }
    return data;
}

export default async function FAQPage() {
    const pageContent = await getFaqContent();
    
    if (!pageContent || pageContent.status !== 'published' || !pageContent.items || pageContent.items.length === 0) {
        return <div className="text-center py-20">No frequently asked questions found.</div>;
    }

    const pageDescription = pageContent.items.map(item => item.question).join(' ').substring(0, 160);

    return (
        <>
        <Head>
            <title>{pageContent.title}</title>
            <meta name="description" content={pageDescription} />
        </Head>
        <div className="bg-background">
            <div className="container mx-auto px-4 py-16 max-w-3xl">
                <header className="text-center mb-12">
                    <h1 className="text-4xl md:text-6xl font-headline font-bold text-primary">
                        {pageContent.title}
                    </h1>
                </header>
                <Accordion type="single" collapsible className="w-full">
                    {pageContent.items.map((item, index) => (
                        <AccordionItem value={`item-${index}`} key={item.id}>
                            <AccordionTrigger className="text-xl text-left font-headline hover:no-underline">
                                {item.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-lg text-muted-foreground leading-relaxed">
                                {item.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </div>
        </>
    );
}
