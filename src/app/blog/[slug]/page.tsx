
import { notFound } from "next/navigation";
import Image from "next/image";
import { Post } from "@/lib/data";
import { User as UserData } from '@/hooks/use-auth';
import { Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { getEmbedUrl } from "@/lib/utils";
import { getSupabaseClient_server } from '@/lib/supabase';
import Head from 'next/head';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

// A simple Markdown to HTML converter
const Markdown = ({ content }: { content: string }) => {
    const htmlContent = content
        .split('\n\n') // Split by paragraphs
        .map(p => `<p class="mb-4 leading-relaxed">${p}</p>`)
        .join('')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">$1</a>'); // Links

    return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
};


async function getPost(slug: string): Promise<{ post: Post | null, author: UserData | null }> {
    const supabase = getSupabaseClient_server();
    const { data: post, error } = await supabase
        .from('posts')
        .select(`
            *,
            users(*)
        `)
        .eq('slug', slug)
        .single();
    
    if (error || !post) {
        return { post: null, author: null };
    }

    const { users: author, ...restOfPost } = post;

    return { post: restOfPost as Post, author: author as UserData | null };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const { post, author } = await getPost(params.slug);

  if (!post) {
    notFound();
  }
  
  const embedUrl = post?.video_url ? getEmbedUrl(post.video_url) : null;
  
  const galleryImages = post ? [
    { url: post.featured_image_url, hint: post.featured_image_hint || '' },
    ...(post.gallery_images || [])
  ] : [];

  const getAuthorName = () => {
    if (!author) return "Unknown Author";
    const authorName = author.name || "Unknown Author";
    if (authorName.length > 20) {
        return `${authorName.substring(0, 20)}...`;
    }
    return authorName;
  };
  
  const pageTitle = post.title;
  const pageDescription = post.content.substring(0, 160);

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
      </Head>
      <article className="container mx-auto px-4 py-12 max-w-4xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-headline font-bold mb-4">{post.title}</h1>
          <div className="flex justify-center items-center gap-6 text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <span className="truncate">{getAuthorName()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <time dateTime={post.published_at}>
                {format(new Date(post.published_at), 'PPP')}
              </time>
            </div>
          </div>
        </header>
        
         <div className="mb-8">
           <Carousel className="w-full">
              <CarouselContent>
                {galleryImages.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="relative aspect-video rounded-lg overflow-hidden shadow-lg">
                      <Image
                        src={image.url}
                        alt={`${post.title} gallery image ${index + 1}`}
                        fill
                        className="object-cover"
                        data-ai-hint={image.hint}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="absolute left-4 z-10" />
              <CarouselNext className="absolute right-4 z-10" />
            </Carousel>
        </div>


        <div className="prose prose-lg max-w-none mx-auto text-foreground/80">
          <Markdown content={post.content} />

           {embedUrl && (
            <div className="mt-12 not-prose">
              <div className="aspect-video w-full rounded-lg overflow-hidden shadow-lg">
                <iframe
                    className="w-full h-full"
                    src={embedUrl}
                    title="Post Video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
              </div>
            </div>
          )}
        </div>
      </article>
    </>
  );
}
