
import { notFound } from "next/navigation";
import { SitePage } from "@/lib/data";
import { getSupabaseClient_server } from "@/lib/supabase";
import Head from "next/head";

// A simple Markdown to HTML converter
const Markdown = ({ content }: { content: string }) => {
    const htmlContent = content
        .split('\n\n')
        .map(p => `<p class="mb-6 leading-relaxed text-lg">${p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary underline hover:no-underline">$1</a>')}</p>`)
        .join('');
    return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
};


async function getAboutUsContent(): Promise<SitePage | null> {
    const supabase = getSupabaseClient_server();
    const { data, error } = await supabase
        .from('site_pages')
        .select('*')
        .eq('id', 'about-us')
        .maybeSingle();
    
    if (error) {
        console.error("Error fetching 'About Us' content:", error);
        return null;
    }
    return data;
}

export default async function AboutUsPage() {
    const pageContent = await getAboutUsContent();
    
    if (!pageContent || pageContent.status !== 'published') {
        notFound();
    }

    const pageDescription = pageContent.content.substring(0, 160);

    return (
        <>
        <Head>
            <title>{pageContent.title}</title>
            <meta name="description" content={pageDescription} />
        </Head>
        <div className="bg-background">
            <div className="container mx-auto px-4 py-16 max-w-4xl">
                <header className="text-center mb-12">
                    <h1 className="text-4xl md:text-6xl font-headline font-bold text-primary">
                        {pageContent.title}
                    </h1>
                </header>
                <article className="prose prose-lg max-w-none mx-auto text-foreground/80">
                   <Markdown content={pageContent.content} />
                </article>
            </div>
        </div>
        </>
    );
}
