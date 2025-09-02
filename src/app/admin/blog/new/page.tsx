
"use client";

import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Post, Category } from "@/lib/data";
import MediaPicker from "@/components/admin/MediaPicker";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSupabaseClient_client } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { PlusCircle, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";


const postSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long."),
  content: z.string().min(100, "Content must be at least 100 characters long."),
  featured_image_url: z.string().url("A valid featured image URL is required."),
  featured_image_hint: z.string().optional(),
  gallery_images: z.array(z.object({
    url: z.string().url("A valid gallery image URL is required."),
    hint: z.string().optional(),
  })).optional(),
  video_url: z.string().url("Must be a valid video URL.").optional().or(z.literal('')),
  category_id: z.string().optional(),
});

export default function NewPostPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const { user } = useAuth();
  const supabase = getSupabaseClient_client();

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase.from('categories').select('*');
        if (error) throw error;
        setCategories(data as Category[]);
      } catch (e) {
        console.error(e);
      }
    };
    loadCategories();
  }, [supabase]);

  const form = useForm<z.infer<typeof postSchema>>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      content: "",
      featured_image_url: "https://placehold.co/1200x600.png",
      featured_image_hint: "",
      gallery_images: [],
      video_url: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "gallery_images",
  });

  const onSubmit = async (data: z.infer<typeof postSchema>) => {
    if (!user) {
        toast({ title: "Error", description: "You must be logged in to create a post.", variant: "destructive"});
        return;
    }

    try {
      const slug = data.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');

      const newPost: Omit<Post, 'id'> = {
        ...data,
        slug,
        author_id: user.uid,
        published_at: new Date().toISOString(),
      };
      
      const { error } = await supabase.from('posts').insert({ ...newPost, id: slug });
      if (error) throw error;

      toast({
        title: "Post Created!",
        description: "Your new blog post has been saved.",
      });

      router.push("/admin/blog/posts");
    } catch(e) {
      toast({ title: "Error", description: "Failed to create post.", variant: "destructive"});
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Blog Post</CardTitle>
        <CardDescription>Fill out the form below to create a new post.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Post Title</Label>
            <Input id="title" {...form.register("title")} placeholder="Your amazing blog post title" />
            {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
          </div>
          
           <div className="space-y-2">
            <Label htmlFor="category_id">Category</Label>
             <Controller
                name="category_id"
                control={form.control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            <Textarea id="content" {...form.register("content")} placeholder="Write your blog post here..." rows={15} />
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
            <Input id="featured_image_hint" {...form.register("featured_image_hint")} placeholder="e.g. tokyo street night" />
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
                        <MediaPicker imageUrl={field.value || ''} onImageUrlChange={field.onChange} />
                      </div>
                    )}
                  />
                   <Controller
                    control={form.control}
                    name={`gallery_images.${index}.hint`}
                    render={({ field }) => (
                       <div className="space-y-2">
                        <Label>Image Hint {index + 1} (for AI)</Label>
                        <Input {...field} placeholder="e.g. cherry blossom" />
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
            <Button type="submit">Save Post</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
