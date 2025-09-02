
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
import { Package, Destination, PackageType, GalleryImage } from "@/lib/data";
import MediaPicker from "@/components/admin/MediaPicker";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSupabaseClient_client } from "@/lib/supabase";
import { PlusCircle, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const packageSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long."),
  slug: z.string().min(1, "Slug is required."),
  description: z.string().min(20, "Description must be at least 20 characters long."),
  gallery_images: z.array(z.object({
    url: z.string().url("A valid gallery image URL is required."),
    hint: z.string().optional(),
  })).min(1, "At least one gallery image is required."),
  video_url: z.string().url("Must be a valid video URL.").optional().or(z.literal('')),
  type: z.string().min(1, "Package type is required."),
  destination: z.string().min(1, "Destination is required."),
  duration: z.coerce.number().min(1, "Duration must be at least 1 day."),
  price: z.coerce.number().min(1, "Price is required."),
  rating: z.coerce.number().min(0).max(5),
  itinerary: z.array(z.object({
    day: z.string().min(1, "Day number is required."),
    title: z.string().min(3, "Itinerary title is required."),
    details: z.string().min(10, "Itinerary details are required."),
  })).optional(),
  inclusions: z.array(z.object({ value: z.string().min(1, "Inclusion text cannot be empty.") })).optional(),
  exclusions: z.array(z.object({ value: z.string().min(1, "Exclusion text cannot be empty.") })).optional(),
});

export default function EditPackagePage() {
  const router = useRouter();
  const params = useParams();
  const packageId = params.id as string;
  const { toast } = useToast();
  const [pkg, setPkg] = useState<Package | null | undefined>(undefined);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([]);
  const supabase = getSupabaseClient_client();

  const form = useForm<z.infer<typeof packageSchema>>({
    resolver: zodResolver(packageSchema),
  });

  const { fields: itineraryFields, append: appendItinerary, remove: removeItinerary } = useFieldArray({
    control: form.control,
    name: "itinerary",
  });
  
  const { fields: galleryFields, append: appendGallery, remove: removeGallery } = useFieldArray({
    control: form.control,
    name: "gallery_images"
  });

  const { fields: inclusionFields, append: appendInclusion, remove: removeInclusion } = useFieldArray({
    control: form.control,
    name: "inclusions",
  });

  const { fields: exclusionFields, append: appendExclusion, remove: removeExclusion } = useFieldArray({
    control: form.control,
    name: "exclusions",
  });
  
  useEffect(() => {
    const loadDropdownData = async () => {
        try {
            const { data: destData, error: destError } = await supabase.from("destinations").select('*');
            if (destError) throw destError;
            setDestinations(destData as Destination[]);
            
            const { data: typesData, error: typesError } = await supabase.from("package_types").select('*');
            if (typesError) throw typesError;
            setPackageTypes(typesData as PackageType[]);
        } catch (e: any) {
            console.error("Failed to fetch form data:", e);
            toast({ title: "Error", description: `Could not load destinations or types: ${e.message}` });
        }
    }
    loadDropdownData();
  }, [supabase, toast]);

  useEffect(() => {
    const loadPackage = async () => {
      if (!packageId) return;
      const { data, error } = await supabase.from('packages').select('*').eq('id', packageId).single();
      
      if (error) {
        setPkg(null);
      } else {
        const packageData = data as Package;
        setPkg(packageData);
        
        const allImages: GalleryImage[] = [
            { url: packageData.image_url, hint: packageData.image_hint },
            ...(packageData.gallery_images || [])
        ];

        form.reset({
          ...packageData,
          gallery_images: allImages,
          itinerary: packageData.itinerary || [],
          inclusions: packageData.inclusions?.map(v => ({ value: v })) || [],
          exclusions: packageData.exclusions?.map(e => ({ value: e })) || [],
        });
      }
    };
    loadPackage();
  }, [packageId, supabase, form]);

  const onSubmit = async (data: z.infer<typeof packageSchema>) => {
    if (!pkg) return;

    try {
      const { gallery_images, inclusions, exclusions, ...rest } = data;
      
      const finalData = {
          ...rest,
          image_url: gallery_images[0].url, 
          image_hint: gallery_images[0].hint,
          gallery_images: gallery_images.slice(1), 
          inclusions: inclusions?.map(i => i.value),
          exclusions: exclusions?.map(e => e.value),
      };

      const { error } = await supabase.from('packages').update(finalData).eq('id', pkg.id);
      if (error) throw error;
      
      toast({
        title: "Package Updated!",
        description: "The package has been successfully updated.",
      });
      router.push("/admin/packages/all");
    } catch (e: any) {
      console.error(e)
      toast({ title: "Error", description: `Failed to update package: ${e.message}`, variant: "destructive" });
    }
  };
  
  if (pkg === undefined) {
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

  if (pkg === null) {
    notFound();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Package</CardTitle>
        <CardDescription>Make changes to the package below.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          <div className="space-y-2">
            <Label htmlFor="title">Package Title</Label>
            <Input id="title" {...form.register("title")} />
            {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" {...form.register("slug")} />
             <p className="text-sm text-muted-foreground">The unique URL-friendly identifier for the package.</p>
            {form.formState.errors.slug && <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>}
          </div>
          
           <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...form.register("description")} rows={5} />
            {form.formState.errors.description && <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Package Type</Label>
              <Controller
                name="type"
                control={form.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger>
                    <SelectContent>
                      {packageTypes.map(pt => <SelectItem key={pt.id} value={pt.name}>{pt.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Destination</Label>
               <Controller
                name="destination"
                control={form.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select a destination" /></SelectTrigger>
                    <SelectContent>
                      {destinations.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (days)</Label>
              <Input id="duration" type="number" {...form.register("duration")} />
              {form.formState.errors.duration && <p className="text-sm text-destructive">{form.formState.errors.duration.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price (BDT)</Label>
              <Input id="price" type="number" {...form.register("price")} />
              {form.formState.errors.price && <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>}
            </div>
             <div className="space-y-2">
              <Label htmlFor="rating">Rating (0-5)</Label>
              <Input id="rating" type="number" step="0.1" {...form.register("rating")} />
              {form.formState.errors.rating && <p className="text-sm text-destructive">{form.formState.errors.rating.message}</p>}
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <Label>Image Gallery</Label>
            <p className="text-sm text-muted-foreground">The first image will be used as the main featured image.</p>
            {galleryFields.map((field, index) => (
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
                 <Button type="button" variant="destructive" size="icon" onClick={() => removeGallery(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => appendGallery({ url: 'https://placehold.co/1200x800.png', hint: '' })}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Gallery Image
            </Button>
            {form.formState.errors.gallery_images && <p className="text-sm text-destructive">{form.formState.errors.gallery_images.message}</p>}
          </div>

          <Separator />

           <div className="space-y-2">
            <Label htmlFor="video_url">Video URL (Optional)</Label>
            <Input id="video_url" {...form.register("video_url")} placeholder="https://www.youtube.com/watch?v=..." />
            {form.formState.errors.video_url && <p className="text-sm text-destructive">{form.formState.errors.video_url.message}</p>}
          </div>

           <Separator />

          <div className="space-y-4">
            <Label>Itinerary</Label>
            {itineraryFields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-4 p-4 border rounded-md">
                <div className="flex-grow space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <div className="space-y-2 md:col-span-1">
                        <Label>Day</Label>
                        <Input {...form.register(`itinerary.${index}.day`)} placeholder="e.g., 1" />
                     </div>
                     <div className="space-y-2 md:col-span-3">
                        <Label>Title</Label>
                        <Input {...form.register(`itinerary.${index}.title`)} placeholder="e.g., Arrival in Paris" />
                     </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Details</Label>
                    <Textarea {...form.register(`itinerary.${index}.details`)} placeholder="Describe the day's activities..." />
                  </div>
                </div>
                 <Button type="button" variant="ghost" size="icon" onClick={() => removeItinerary(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendItinerary({ day: (itineraryFields.length + 1).toString(), title: '', details: '' })}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Itinerary Day
            </Button>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Label>Inclusions</Label>
              {inclusionFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                   <Input {...form.register(`inclusions.${index}.value`)} placeholder="e.g., Airport transfers" />
                   <Button type="button" variant="ghost" size="icon" onClick={() => removeInclusion(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                   </Button>
                </div>
              ))}
               <Button type="button" variant="outline" size="sm" onClick={() => appendInclusion({ value: '' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Inclusion
               </Button>
            </div>
             <div className="space-y-4">
              <Label>Exclusions</Label>
              {exclusionFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                   <Input {...form.register(`exclusions.${index}.value`)} placeholder="e.g., International flights" />
                   <Button type="button" variant="ghost" size="icon" onClick={() => removeExclusion(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                   </Button>
                </div>
              ))}
               <Button type="button" variant="outline" size="sm" onClick={() => appendExclusion({ value: '' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Exclusion
               </Button>
            </div>
          </div>


          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => router.push('/admin/packages/all')}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
