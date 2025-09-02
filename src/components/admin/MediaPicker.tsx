
"use client"

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Link, Library, Loader2, Video, File as FileIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { MediaFile } from '@/lib/data';
import { Label } from "@/components/ui/label";
import { getSupabaseClient_client } from '@/lib/supabase';
import { Skeleton } from '../ui/skeleton';

// Simplified version of MediaGrid for the picker
const LibraryGrid = ({ onSelectFile, refreshTrigger }: { onSelectFile: (file: MediaFile) => void, refreshTrigger: number }) => {
    const [files, setFiles] = useState<MediaFile[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = getSupabaseClient_client();

    useEffect(() => {
        const fetchImages = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("media")
                .select('*')
                .eq("type", "image")
                .is("deleted_at", null)
                .order("uploaded_at", { ascending: false });

            if (error) {
                console.error("Failed to fetch library images:", error);
            } else {
                setFiles(data as MediaFile[]);
            }
            setLoading(false);
        };
        fetchImages();
    }, [refreshTrigger, supabase]);

    if (loading) {
        return (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 max-h-[50vh] overflow-y-auto">
                {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square" />
                ))}
            </div>
        )
    }

    if (files.length === 0) {
        return <div className="text-center text-muted-foreground py-8">No images found in library.</div>
    }

    return (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 max-h-[50vh] overflow-y-auto">
            {files.map(file => (
                <div key={file.id} className="cursor-pointer group" onClick={() => onSelectFile(file)}>
                    <div className="aspect-square relative rounded-md overflow-hidden ring-2 ring-transparent group-hover:ring-primary">
                        <Image 
                            src={file.url}
                            alt={file.alt_text || file.name}
                            fill
                            className="object-cover"
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

type MediaPickerProps = {
    imageUrl: string;
    onImageUrlChange: (url: string) => void;
};


export default function MediaPicker({ imageUrl, onImageUrlChange }: MediaPickerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const [libraryRefreshTrigger, setLibraryRefreshTrigger] = useState(0);
  const supabase = getSupabaseClient_client();


  const handleUrlConfirm = () => {
    if (urlInput && urlInput.startsWith('http')) {
      onImageUrlChange(urlInput);
      setModalOpen(false);
      toast({ title: "Image URL set" });
    } else {
      toast({ title: "Invalid URL", description: "Please enter a valid URL.", variant: "destructive" });
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid File", description: "Please select an image file.", variant: "destructive" });
        return;
    }
    
    setIsUploading(true);

    try {
        const presignResponse = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                filename: file.name, 
                contentType: file.type,
            }),
        });

        if (!presignResponse.ok) {
            const errorBody = await presignResponse.json();
            throw new Error(`Failed to get pre-signed URL: ${errorBody.error || presignResponse.statusText}`);
        }

        const { uploadUrl, finalUrl } = await presignResponse.json();

        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
        });

        if (!uploadResponse.ok) {
            const errorBody = await uploadResponse.text();
            throw new Error(`File upload to R2 failed. R2 responded with: ${errorBody || uploadResponse.statusText}`);
        }

        const { error } = await supabase.from("media").insert({
            name: file.name,
            type: "image",
            url: finalUrl,
            size: formatFileSize(file.size),
            alt_text: "",
            data_ai_hint: "",
            deleted_at: null,
        });

        if (error) throw error;

        onImageUrlChange(finalUrl);
        setModalOpen(false);
        toast({ title: "Image Uploaded", description: "The image was successfully uploaded and saved." });
        setLibraryRefreshTrigger(prev => prev + 1); // Trigger library refresh

    } catch (error: any) {
        console.error("Upload error:", error);
        toast({ title: "Upload Failed", description: `Could not upload the file: ${error.message}`, variant: "destructive" });
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }
  };

  const handleSelectFromLibrary = (file: MediaFile) => {
    onImageUrlChange(file.url);
    setModalOpen(false);
    toast({ title: "Image Selected", description: `Selected ${file.name} from library.` });
  }

  return (
    <div>
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            className="hidden" 
            accept="image/*"
            disabled={isUploading}
        />
        <div className="flex items-center gap-4">
            <div className="w-24 h-24 bg-muted rounded-md flex-shrink-0 relative overflow-hidden">
                {imageUrl && <Image src={imageUrl} alt="Preview" fill className="object-cover" />}
            </div>
            <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(true)}>
                    <Library className="mr-2 h-4 w-4" />
                    Select or Upload
                </Button>
            </div>
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Select Media</DialogTitle>
                    <DialogDescription>Choose an image from your library, upload a new one, or enter a URL.</DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="library" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="library"><Library className="mr-2"/>From Library</TabsTrigger>
                        <TabsTrigger value="upload"><Upload className="mr-2"/>Upload New</TabsTrigger>
                        <TabsTrigger value="url"><Link className="mr-2"/>From URL</TabsTrigger>
                    </TabsList>
                    <TabsContent value="library">
                        <LibraryGrid onSelectFile={handleSelectFromLibrary} refreshTrigger={libraryRefreshTrigger} />
                    </TabsContent>
                    <TabsContent value="upload">
                        <div className="py-12 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-md">
                             {isUploading ? (
                                <>
                                    <Loader2 className="h-12 w-12 text-primary animate-spin mb-4"/>
                                    <h3 className="text-lg font-medium">Uploading...</h3>
                                    <p className="text-sm text-muted-foreground">Please wait.</p>
                                </>
                             ) : (
                                <>
                                    <Upload className="h-12 w-12 text-muted-foreground mb-4"/>
                                    <h3 className="text-lg font-medium">Click to upload a file</h3>
                                    <p className="text-sm text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                                    <Button type="button" size="sm" className="mt-4" onClick={handleUploadClick}>Browse Files</Button>
                                </>
                             )}
                        </div>
                    </TabsContent>
                    <TabsContent value="url">
                         <div className="py-12 flex flex-col items-center justify-center gap-4">
                            <div className="w-full max-w-md">
                                <Label htmlFor="imageUrlInput" className="sr-only">Image URL</Label>
                                <Input 
                                    id="imageUrlInput"
                                    type="url"
                                    placeholder="https://example.com/image.jpg"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                />
                            </div>
                            <Button type="button" onClick={handleUrlConfirm}>Set Image from URL</Button>
                        </div>
                    </TabsContent>
                </Tabs>
                <DialogClose asChild>
                    <Button type="button" variant="secondary" className="mt-4">Close</Button>
                </DialogClose>
            </DialogContent>
        </Dialog>
    </div>
  );
}
