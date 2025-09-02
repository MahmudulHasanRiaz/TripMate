
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Package, Destination, PackageType } from "@/lib/data";
import { useState, useEffect } from "react";
import MediaPicker from "./MediaPicker";
import { getSupabaseClient_client } from "@/lib/supabase";
import { PlusCircle, Trash2 } from "lucide-react";
import { Separator } from "../ui/separator";
import { Label } from "../ui/label";

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters."),
  type: z.string().min(1, "Package type is required."),
  destination: z.string().min(1, "Destination is required."),
  duration: z.coerce.number().min(1, "Duration must be at least 1 day."),
  price: z.coerce.number().min(1, "Price is required."),
  rating: z.coerce.number().min(0).max(5).default(4.5),
  gallery_images: z.array(z.object({
    url: z.string().url("A valid gallery image URL is required."),
    hint: z.string().optional(),
  })).min(1, "At least one image is required."),
  video_url: z.string().url("Must be a valid video URL.").optional().or(z.literal('')),
  description: z.string().min(20, "Description must be at least 20 characters."),
});

type AddPackageFormProps = {
  onSave: (newPackage: Omit<Package, 'id' | 'deleted_at'>) => void;
  setDialogOpen: (open: boolean) => void;
}

export default function AddPackageForm({ onSave, setDialogOpen }: AddPackageFormProps) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([]);
  const supabase = getSupabaseClient_client();

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const { data: destData, error: destError } = await supabase.from("destinations").select('*');
        if (destError) throw destError;
        setDestinations(destData as Destination[]);
        
        const { data: typesData, error: typesError } = await supabase.from("package_types").select('*');
        if (typesError) throw typesError;
        setPackageTypes(typesData as PackageType[]);
      } catch (e) {
        console.error("Failed to fetch form data:", e);
      }
    }
    fetchDropdownData();
  }, [supabase]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: "",
      destination: "",
      duration: 7,
      price: 100000,
      rating: 4.5,
      gallery_images: [{ url: 'https://placehold.co/1200x800.png', hint: '' }],
      video_url: "",
      description: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "gallery_images",
  });


  function onSubmit(values: z.infer<typeof formSchema>) {
    const { gallery_images, ...rest } = values;
    const slug = values.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    const newPackage: Omit<Package, 'id' | 'deleted_at'> = {
        ...rest,
        slug,
        image_url: gallery_images[0].url,
        image_hint: gallery_images[0].hint,
        gallery_images: gallery_images.slice(1), // Use the rest as gallery
        itinerary: [{ day: "1", title: "Arrival & Welcome", details: "Arrive and check into your accommodation." }],
        inclusions: ["Accommodation", "Daily Breakfast"],
        exclusions: ["Flights", "Visa Fees"],
    }
    
    onSave(newPackage);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Package Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Parisian Dream Tour" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                    <Textarea
                    placeholder="Describe the package in detail..."
                    className="resize-y"
                    {...field}
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Package Type</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a package type" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {packageTypes.map(type => (
                                <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
             )}
            />
            <FormField
            control={form.control}
            name="destination"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Destination</FormLabel>
                 <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a destination" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                       {destinations.map(dest => (
                         <SelectItem key={dest.id} value={dest.name}>{dest.name}</SelectItem>
                       ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Duration (in days)</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Price (BDT)</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Rating (0-5)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        <Separator />
          
        <div className="space-y-4">
            <Label>Image Gallery</Label>
            <p className="text-sm text-muted-foreground">The first image will be used as the main featured image.</p>
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
             {form.formState.errors.gallery_images && <p className="text-sm text-destructive">{form.formState.errors.gallery_images.message}</p>}
          </div>

        <Separator />

        <FormField
            control={form.control}
            name="video_url"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Video URL (Optional)</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., https://www.youtube.com/watch?v=..." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />

        <div className="flex justify-end pt-4">
            <Button type="submit">Save Package</Button>
        </div>
      </form>
    </Form>
  );
}
