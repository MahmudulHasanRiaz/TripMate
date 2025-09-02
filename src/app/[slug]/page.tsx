
import { notFound } from "next/navigation";
import { Page } from "@/lib/data";
import { getSupabaseClient_server } from "@/lib/supabase";
import Head from 'next/head';

// A simple Markdown to HTML converter
const Markdown = ({ content }: { content: string }) => {
    // Basic markdown conversion, can be replaced with a more robust library like 'marked' or 'react-markdown'
    const htmlContent = content
        .replace(/\n\n/g, '</p><p class="mb-4 leading-relaxed">')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">$1</a>');

    return <div dangerouslySetInnerHTML={{ __html: `<p class="mb-4 leading-relaxed">${htmlContent}</p>` }} />;
};

async function getPage(slug: string): Promise<Page | null> {
    const supabase = getSupabaseClient_server();
    const { data: page, error } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

    if (error) {
        console.error("Error fetching page:", error);
        return null;
    }
    return page as Page | null;
}


export default async function CustomPage({ params }: { params: { slug: string } }) {
  const page = await getPage(params.slug);
  
  if (!page) {
    notFound();
  }
  
  const pageTitle = page.seo_title || page.title;
  const pageDescription = page.seo_description || page.content.substring(0, 160);

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        {/* Add more SEO tags as needed, like Open Graph tags */}
      </Head>
      <article className="container mx-auto px-4 py-12 max-w-4xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-headline font-bold mb-4">{page.title}</h1>
        </header>
        
        <div className="prose prose-lg max-w-none mx-auto text-foreground/80">
          <Markdown content={page.content} />
        </div>
      </article>
    </>
  );
}
