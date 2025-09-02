
"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useParams, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Post, Category } from "@/lib/data";
import MediaPicker from "@/components/admin/MediaPicker";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSupabaseClient_client } from "@/lib/supabase";
import { PlusCircle, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";


const postSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long."),
  content: z.string().min(100, "Content must be at least 100 characters long."),
  featured_image_url: z.string().url("A valid featured image URL is required."),
  featured_image_hint: z.string().optional(),
  slug: z.string().min(1, "Slug is required."),
  video_url: z.string().url("Must be a valid video URL.").optional().or(z.literal('')),
  category_id: z.string().optional(),
  gallery_images: z.array(z.object({
    url: z.string().url("A valid gallery image URL is required."),
    hint: z.string().optional(),
  })).optional(),
});

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { toast } = useToast();
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const supabase = getSupabaseClient_client();

  const form = useForm<z.infer<typeof postSchema>>({
    resolver: zodResolver(postSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "gallery_images",
  });
  
  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) console.error("Error loading categories", error);
      else setCategories(data as Category[]);
    };
    loadCategories();
  }, [supabase]);

  useEffect(() => {
    const loadPost = async () => {
      if (!slug) return;
      const { data, error } = await supabase.from('posts').select('*').eq('slug', slug).single();
      
      if (error) {
        setPost(null);
      } else {
        const postData = data as Post;
        setPost(postData);
        form.reset({
          ...postData,
          gallery_images: postData.gallery_images || []
        });
      }
    };
    loadPost();
  }, [slug, supabase, form]);

  const onSubmit = async (data: z.infer<typeof postSchema>) => {
    if (!post || !post.id) return;

    try {
      const { error } = await supabase.from('posts').update(data).eq('id', post.id);
      if (error) throw error;
      toast({
        title: "Post Updated!",
        description: "Your blog post has been successfully updated.",
      });
      router.push("/admin/blog/posts");
    } catch (e) {
      toast({ title: "Error", description: "Failed to update post.", variant: "destructive" });
    }
  };
  
  if (post === undefined) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-24 w-full" />
            </CardContent>
        </Card>
    )
  }

  if (post === null) {
    notFound();
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Blog Post</CardTitle>
        <CardDescription>Make changes to your post below.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Post Title</Label>
            <Input id="title" {...form.register("title")} />
            {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
          </div>

           <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" {...form.register("slug")} />
             <p className="text-sm text-muted-foreground">The unique URL-friendly identifier for the post.</p>
            {form.formState.errors.slug && <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category_id">Category</Label>
             <Controller
                name="category_id"
                control={form.control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="uncategorized">Uncategorized</SelectItem>
                             {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
             />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content (Markdown Supported)</Label>
            <Textarea id="content" {...form.register("content")} rows={15} />
             <p className="text-sm text-muted-foreground">
              You can use Markdown for formatting, like **bold**, *italic*, and [links](https://example.com).
            </p>
            {form.formState.errors.content && <p className="text-sm text-destructive">{form.formState.errors.content.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Featured Image</Label>
            <Controller
              name="featured_image_url"
              control={form.control}
              render={({ field }) => (
                <MediaPicker imageUrl={field.value} onImageUrlChange={field.onChange} />
              )}
            />
            {form.formState.errors.featured_image_url && <p className="text-sm text-destructive">{form.formState.errors.featured_image_url.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="featured_image_hint">Featured Image Hint (for AI)</Label>
            <Input id="featured_image_hint" {...form.register("featured_image_hint")} />
          </div>

           <Separator />
          
          <div className="space-y-4">
            <Label>Image Gallery</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-4 p-4 border rounded-md">
                <div className="flex-grow space-y-4">
                   <Controller
                    control={form.control}
                    name={`gallery_images.${index}.url`}
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Label>Image {index + 1}</Label>
                        <MediaPicker imageUrl={field.value} onImageUrlChange={field.onChange} />
                      </div>
                    )}
                  />
                   <Controller
                    control={form.control}
                    name={`gallery_images.${index}.hint`}
                    render={({ field }) => (
                       <div className="space-y-2">
                        <Label>Image Hint {index + 1} (for AI)</Label>
                        <Input {...field} value={field.value ?? ''} onChange={field.onChange} placeholder="e.g. cherry blossom" />
                       </div>
                    )}
                  />
                </div>
                 <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ url: 'https://placehold.co/1200x800.png', hint: '' })}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Gallery Image
            </Button>
          </div>

          <Separator />


          <div className="space-y-2">
            <Label htmlFor="video_url">Video URL (Optional)</Label>
            <Input id="video_url" {...form.register("video_url")} placeholder="https://www.youtube.com/watch?v=..." />
            {form.formState.errors.video_url && <p className="text-sm text-destructive">{form.formState.errors.video_url.message}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/admin/blog/posts')}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
