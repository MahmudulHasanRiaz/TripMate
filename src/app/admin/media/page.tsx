
"use client"
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UploadCloud, MoreVertical, Copy, Trash2, FileText, Video, ImageIcon, File as FileIcon, RotateCw, AlertTriangle, Trash, Loader2 } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import MediaDetailModal from '@/components/admin/MediaDetailModal';
import type { MediaFile } from '@/lib/data';
import { getSupabaseClient_client } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';

const getIconForType = (type: MediaFile['type']) => {
    switch (type) {
        case "image": return <ImageIcon className="h-10 w-10 text-muted-foreground" />;
        case "video": return <Video className="h-10 w-10 text-muted-foreground" />;
        case "pdf": return <FileText className="h-10 w-10 text-muted-foreground" />;
        default: return <FileIcon className="h-10 w-10 text-muted-foreground" />;
    }
}

const MediaFileCard = ({ file, onSelect, isSelected, onAction, onCardClick }: { file: MediaFile, onSelect: (id: string, checked: boolean) => void, isSelected: boolean, onAction: (action: "copy" | "trash" | "restore" | "delete", id: string) => void, onCardClick: (file: MediaFile) => void }) => {
    const isTrashed = !!file.deleted_at;
    const [daysLeft, setDaysLeft] = useState<number | null>(null);

    useEffect(() => {
        if (isTrashed && file.deleted_at) {
            const deletedDate = new Date(file.deleted_at);
            const daysInTrash = Math.ceil((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
            setDaysLeft(30 - daysInTrash);
        }
    }, [file.deleted_at, isTrashed]);

    const imageProps = file.data_ai_hint ? { "data-ai-hint": file.data_ai_hint } : {};

    const handleCheckboxClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click when checkbox is clicked
    };

    return (
        <Card className="relative group overflow-hidden cursor-pointer" onClick={() => onCardClick(file)}>
            <div className="absolute top-2 left-2 z-10" onClick={handleCheckboxClick}>
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelect(file.id, !!checked)}
                    aria-label={`Select file ${file.name}`}
                />
            </div>
             <div className="absolute top-1 right-1 z-10" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onAction("copy", file.id)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                    </DropdownMenuItem>
                    {isTrashed ? (
                        <>
                            <DropdownMenuItem onClick={() => onAction("restore", file.id)}>
                                <RotateCw className="mr-2 h-4 w-4" />
                                Restore
                            </DropdownMenuItem>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Permanently
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete the file from your R2 bucket. This action cannot be undone.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onAction("delete", file.id)} className="bg-destructive hover:bg-destructive/90">
                                        Delete
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                             </AlertDialog>
                        </>
                    ) : (
                         <DropdownMenuItem className="text-destructive" onClick={() => onAction("trash", file.id)}>
                            <Trash className="mr-2 h-4 w-4" />
                            Move to Trash
                        </DropdownMenuItem>
                    )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          <div className="aspect-square bg-muted flex items-center justify-center">
             {file.type === 'image' ? (
                 <Image src={file.url} alt={file.alt_text || file.name} width={200} height={200} className="object-cover h-full w-full" {...imageProps} />
             ) : (
                getIconForType(file.type)
             )}
          </div>
          <div className="p-2 text-xs border-t">
            <p className="font-semibold truncate">{file.name}</p>
            <p className="text-muted-foreground">{file.size}</p>
            {isTrashed && daysLeft !== null && (
                <p className={cn(
                    "text-xs mt-1",
                    daysLeft <= 7 ? "text-destructive" : "text-muted-foreground"
                )}>
                   <AlertTriangle className="inline-block h-3 w-3 mr-1" />
                   {daysLeft > 0 ? `Deletes in ${daysLeft} day(s)` : 'Deletes soon'}
                </p>
            )}
          </div>
        </Card>
    )
}

const MediaGrid = ({ files, selectedFiles, onSelect, onAction, onCardClick, emptyState, loading }: { files: MediaFile[], selectedFiles: string[], onSelect: (id: string, checked: boolean) => void, onAction: (action: "copy" | "trash" | "restore" | "delete", id: string) => void, onCardClick: (file: MediaFile) => void, emptyState: React.ReactNode, loading: boolean }) => {
    if (loading) {
        return (
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square" />
                ))}
            </div>
        )
    }
    
    if (files.length === 0) {
        return <>{emptyState}</>;
    }
    return (
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {files.map((file) => (
                <MediaFileCard 
                    key={file.id}
                    file={file}
                    isSelected={selectedFiles.includes(file.id)}
                    onSelect={onSelect}
                    onAction={onAction}
                    onCardClick={onCardClick}
                />
            ))}
        </div>
    )
}

export default function AdminMediaPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [trashedFiles, setTrashedFiles] = useState<MediaFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedFileForDetail, setSelectedFileForDetail] = useState<MediaFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = getSupabaseClient_client();

  const fetchMedia = async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase.from('media').select('*').order('uploaded_at', { ascending: false });
        if (error) throw error;
        
        const allFiles = data as MediaFile[];
        const active = allFiles.filter(file => !file.deleted_at);
        const trashed = allFiles.filter(file => !!file.deleted_at);
        
        setMediaFiles(active);
        setTrashedFiles(trashed);

    } catch (error) {
        console.error("Error fetching media files:", error);
        toast({ title: "Error", description: "Could not load media library. Check console for details.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const currentFileList = activeTab === 'all' ? mediaFiles : trashedFiles;
  const currentLoadingState = loading;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(currentFileList.map(file => file.id));
    } else {
      setSelectedFiles([]);
    }
  };

  const handleSelectOne = (fileId: string, checked: boolean) => {
    if (checked) {
      setSelectedFiles(prev => [...prev, fileId]);
    } else {
      setSelectedFiles(prev => prev.filter(id => id !== fileId));
    }
  };

  const handleAction = async (action: "copy" | "trash" | "restore" | "delete", id: string) => {
     switch (action) {
        case "copy":
            const fileToCopy = [...mediaFiles, ...trashedFiles].find(f => f.id === id);
            if (fileToCopy) {
                navigator.clipboard.writeText(fileToCopy.url);
                toast({ title: "Link Copied!", description: "The file URL has been copied to your clipboard." });
            }
            break;
        case "trash":
            try {
                const { error } = await supabase.from('media').update({ deleted_at: new Date().toISOString() }).eq('id', id);
                if(error) throw error;
                toast({ title: "File Moved to Trash" });
                fetchMedia();
            } catch (e: any) {
                toast({ title: "Error", description: `Could not move file to trash: ${e.message}`, variant: "destructive" });
            }
            break;
        case "restore":
             try {
                const { error } = await supabase.from('media').update({ deleted_at: null }).eq('id', id);
                if(error) throw error;
                toast({ title: "File Restored" });
                fetchMedia();
            } catch (e: any) {
                toast({ title: "Error", description: `Could not restore file: ${e.message}`, variant: "destructive" });
            }
            break;
        case "delete":
            toast({ title: "Permanent Delete Not Implemented", description: "This requires server-side logic to delete from R2."});
            break;
     }
     setSelectedFiles(prev => prev.filter(sf => sf !== id));
  };
  
  const handleBulkAction = async (action: "trash" | "restore" | "delete") => {
    if (selectedFiles.length === 0) return;
    
    try {
        if (action === "trash") {
            const { error } = await supabase.from('media').update({ deleted_at: new Date().toISOString() }).in('id', selectedFiles);
            if (error) throw error;
            toast({ title: `${selectedFiles.length} file(s) moved to Trash.` });
        } else if (action === "restore") {
            const { error } = await supabase.from('media').update({ deleted_at: null }).in('id', selectedFiles);
            if (error) throw error;
            toast({ title: `${selectedFiles.length} file(s) restored.` });
        } else if (action === "delete") {
            toast({ title: "Permanent Delete Not Implemented", description: "This requires server-side logic to delete from R2."});
            return;
        }
        
        fetchMedia(); // Refresh data from Firestore
        setSelectedFiles([]);
    } catch(e: any) {
        toast({ title: "Error", description: `Could not perform bulk action: ${e.message}`, variant: "destructive" });
    }
  };

  const handleEmptyTrash = () => {
    toast({ title: "Empty Trash Not Implemented", description: "This requires server-side logic to delete from R2."});
    setSelectedFiles([]);
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
  
    setIsUploading(true);
    let uploadSuccessCount = 0;
  
    for (const file of Array.from(files)) {
      try {
        const presignResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              filename: file.name, 
              contentType: file.type
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

        const fileType = file.type.split('/')[0] || 'file';
        const { error: insertError } = await supabase.from("media").insert({
            name: file.name,
            type: fileType as MediaType,
            url: finalUrl,
            size: formatFileSize(file.size),
            alt_text: "",
            data_ai_hint: "",
            deleted_at: null,
        });

        if (insertError) throw insertError;
        uploadSuccessCount++;
  
      } catch (error) {
        console.error("Upload error for file " + file.name + ":", error);
        toast({ title: `Upload Failed`, description: `Could not upload ${file.name}. Check console for details.`, variant: "destructive" });
      }
    }
  
    if (uploadSuccessCount > 0) {
        toast({
            title: "Uploads Complete",
            description: `${uploadSuccessCount} of ${files.length} file(s) uploaded successfully.`
        });
        fetchMedia();
    }
    
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCardClick = (file: MediaFile) => {
    setSelectedFileForDetail(file);
    setDetailModalOpen(true);
  };

  const handleSaveFileDetails = async (updatedFile: MediaFile) => {
     try {
        const { id, ...dataToSave } = updatedFile;
        const { error } = await supabase.from('media').update(dataToSave).eq('id', id);
        if (error) throw error;

        setDetailModalOpen(false);
        fetchMedia();
        toast({ title: "File details saved!" });

     } catch (e: any) {
        console.error("Failed to save file details", e);
        toast({ title: "Error", description: `Could not save file details: ${e.message}`, variant: "destructive" });
     }
  };

  const isAllSelected = selectedFiles.length > 0 && selectedFiles.length === currentFileList.length;

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
            <div>
            <CardTitle>File/Media Library</CardTitle>
            <CardDescription>Manage your uploaded files on Cloudflare R2.</CardDescription>
            </div>
            <div className="flex gap-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                className="hidden" 
                multiple 
                disabled={isUploading}
            />
            <Button onClick={handleUploadClick} disabled={isUploading}>
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                {isUploading ? 'Uploading...' : 'Upload Files'}
            </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
         <Tabs value={activeTab} onValueChange={(value) => {setActiveTab(value); setSelectedFiles([])}} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="all"><ImageIcon className="mr-2"/>All Media ({mediaFiles.length})</TabsTrigger>
                <TabsTrigger value="trash"><Trash className="mr-2"/>Trash ({trashedFiles.length})</TabsTrigger>
            </TabsList>
            <div className="mt-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Checkbox 
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        id="select-all"
                        disabled={currentFileList.length === 0 || loading}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium">
                        Select All
                    </label>
                </div>
                 {selectedFiles.length > 0 && (
                     <div className="flex gap-2">
                        {activeTab === 'all' ? (
                             <Button variant="outline" size="sm" onClick={() => handleBulkAction('trash')}>
                                <Trash className="mr-2 h-4 w-4" />
                                Move to Trash ({selectedFiles.length})
                            </Button>
                        ) : (
                             <>
                                <Button variant="outline" size="sm" onClick={() => handleBulkAction('restore')}>
                                    <RotateCw className="mr-2 h-4 w-4" />
                                    Restore ({selectedFiles.length})
                                </Button>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete Permanently ({selectedFiles.length})
                                        </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete {selectedFiles.length} file(s). This action cannot be undone.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleBulkAction('delete')} className="bg-destructive hover:bg-destructive/90">
                                            Delete
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                             </>
                        )}
                    </div>
                )}
                {activeTab === 'trash' && trashedFiles.length > 0 && selectedFiles.length === 0 && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Empty Trash
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to empty the trash?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete all {trashedFiles.length} files in the trash. This action cannot be undone.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleEmptyTrash} className="bg-destructive hover:bg-destructive/90">
                                Empty Trash
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
            <TabsContent value="all">
                <MediaGrid 
                    files={mediaFiles} 
                    selectedFiles={selectedFiles}
                    onSelect={handleSelectOne}
                    onAction={handleAction}
                    onCardClick={handleCardClick}
                    loading={currentLoadingState}
                    emptyState={
                        <div className="text-center py-16 text-muted-foreground">
                            <UploadCloud className="mx-auto h-16 w-16 mb-4" />
                            <h3 className="text-xl font-headline font-semibold">Media Library is Empty</h3>
                            <p>Upload your first file to get started.</p>
                        </div>
                    }
                />
            </TabsContent>
            <TabsContent value="trash">
                 <div className="text-center py-4 px-4 rounded-lg bg-secondary text-secondary-foreground mb-6">
                    <p className="text-sm">
                        <AlertTriangle className="inline-block h-4 w-4 mr-2" />
                        Items in the trash will be automatically deleted after 30 days.
                    </p>
                </div>
                 <MediaGrid 
                    files={trashedFiles} 
                    selectedFiles={selectedFiles}
                    onSelect={handleSelectOne}
                    onAction={handleAction}
                    onCardClick={handleCardClick}
                    loading={currentLoadingState}
                    emptyState={
                        <div className="text-center py-16 text-muted-foreground">
                            <Trash className="mx-auto h-16 w-16 mb-4" />
                            <h3 className="text-xl font-headline font-semibold">The Trash is Empty</h3>
                            <p>Deleted files will appear here.</p>
                        </div>
                    }
                />
            </TabsContent>
         </Tabs>
      </CardContent>
    </Card>
    {selectedFileForDetail && (
        <MediaDetailModal
            isOpen={detailModalOpen}
            onClose={() => setDetailModalOpen(false)}
            file={selectedFileForDetail}
            onSave={handleSaveFileDetails}
        />
    )}
    </>
  );
}
