
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Post } from "@/lib/data";
import type { User } from "@/hooks/use-auth";
import { Badge } from "./ui/badge";
import { Calendar, User as UserIcon, ArrowRight } from "lucide-react";
import { format } from "date-fns";

type BlogCardProps = {
  post: Post;
  author?: User;
};

export default function BlogCard({ post, author }: BlogCardProps) {
    
  const getAuthorName = () => {
    if (!author) return "Unknown Author";
    const authorName = author.name || "Unknown Author";
     if (authorName.length > 15) {
        return `${authorName.substring(0, 15)}...`;
    }
    return authorName;
  };
  
  const imageUrl = post.featured_image_url || "https://placehold.co/1200x600.png";

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-0 relative">
        <Link href={`/blog/${post.slug}`} className="block">
          <Image
            src={imageUrl}
            alt={post.title}
            width={600}
            height={400}
            className="aspect-[3/2] w-full object-cover"
            data-ai-hint={post.featured_image_hint}
          />
        </Link>
      </CardHeader>
      <CardContent className="flex-grow p-6">
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            <span className="truncate">{getAuthorName()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(post.published_at), 'PPP')}</span>
          </div>
        </div>
        <CardTitle className="font-headline text-2xl mb-2">
          <Link href={`/blog/${post.slug}`} className="hover:text-primary transition-colors">
            {post.title}
          </Link>
        </CardTitle>
        <p className="text-muted-foreground line-clamp-3">
          {post.content}
        </p>
      </CardContent>
      <CardFooter className="p-6 bg-secondary/50">
        <Button asChild variant="outline" className="w-full">
          <Link href={`/blog/${post.slug}`}>Read More <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
