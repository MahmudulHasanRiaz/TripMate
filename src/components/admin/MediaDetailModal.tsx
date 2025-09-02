
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { MediaFile } from '@/lib/data';
import { Copy, Crop, FileText, Video, ImageIcon, File as FileIcon } from "lucide-react";
import { format } from 'date-fns';
import ImageCropper from "./ImageCropper";

type MediaDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  file: MediaFile | null;
  onSave: (updatedFile: MediaFile) => void;
};

const getIconForType = (type: MediaFile['type']) => {
    switch (type) {
        case "image": return <ImageIcon className="h-24 w-24 text-muted-foreground" />;
        case "video": return <Video className="h-24 w-24 text-muted-foreground" />;
        case "pdf": return <FileText className="h-24 w-24 text-muted-foreground" />;
        default: return <FileIcon className="h-24 w-24 text-muted-foreground" />;
    }
}


export default function MediaDetailModal({ isOpen, onClose, file, onSave }: MediaDetailModalProps) {
  const [editedFile, setEditedFile] = useState<MediaFile | null>(file);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setEditedFile(file);
  }, [file]);

  if (!isOpen || !editedFile) {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedFile(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSaveChanges = () => {
    if (editedFile) {
      onSave({...editedFile, modified_at: new Date().toISOString() });
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(editedFile.url);
    toast({ title: "URL Copied!", description: "The file URL has been copied to your clipboard." });
  };
  
  const handleCroppedImage = (newUrl: string) => {
    if(editedFile){
      setEditedFile({ ...editedFile, url: newUrl });
      toast({ title: "Image Cropped", description: "Save changes to apply the new image."});
    }
    setIsCropperOpen(false);
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>File Details</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto flex-grow pr-4">
          {/* Left Column - Preview */}
          <div className="md:col-span-2 bg-muted rounded-lg flex items-center justify-center p-4 min-h-[400px]">
            {editedFile.type === 'image' ? (
              <div className="relative w-full h-full">
                <Image
                  src={editedFile.url}
                  alt={editedFile.alt_text || editedFile.name}
                  fill
                  className="object-contain"
                  key={editedFile.url} // Add key to force re-render on url change
                />
              </div>
            ) : (
                <div className="flex flex-col items-center gap-4">
                    {getIconForType(editedFile.type)}
                    <span className="text-lg font-medium text-muted-foreground">{editedFile.name}</span>
                </div>
            )}
          </div>

          {/* Right Column - Details and Form */}
          <div className="md:col-span-1 space-y-4">
            <div>
              <Label htmlFor="name">File Name</Label>
              <Input
                id="name"
                name="name"
                value={editedFile.name}
                onChange={handleInputChange}
              />
            </div>

            {editedFile.type === 'image' && (
              <>
                <div>
                  <Label htmlFor="alt_text">Alt Text</Label>
                  <Textarea
                    id="alt_text"
                    name="alt_text"
                    value={editedFile.alt_text || ""}
                    onChange={handleInputChange}
                    placeholder="Descriptive text for accessibility"
                  />
                </div>
                 <div>
                    <Label htmlFor="data_ai_hint">AI Hint</Label>
                    <Input
                        id="data_ai_hint"
                        name="data_ai_hint"
                        value={editedFile.data_ai_hint || ""}
                        onChange={handleInputChange}
                        placeholder="e.g. tokyo street night"
                    />
                </div>
              </>
            )}

            <div>
                <Label>File URL</Label>
                <div className="flex items-center gap-2">
                    <Input value={editedFile.url} readOnly className="bg-muted"/>
                    <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                        <Copy className="h-4 w-4"/>
                    </Button>
                </div>
            </div>

            {editedFile.type === 'image' && (
                 <Button variant="outline" className="w-full" onClick={() => setIsCropperOpen(true)}>
                    <Crop className="mr-2 h-4 w-4"/>
                    Crop Image
                </Button>
            )}

            <div className="text-xs text-muted-foreground space-y-2 pt-4 border-t">
               <p><strong>File Type:</strong> {editedFile.type}</p>
               <p><strong>File Size:</strong> {editedFile.size}</p>
               {editedFile.uploaded_at && <p><strong>Uploaded:</strong> {format(new Date(editedFile.uploaded_at), "PPpp")}</p>}
               {editedFile.modified_at && <p><strong>Last Modified:</strong> {format(new Date(editedFile.modified_at), "PPpp")}</p>}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-auto pt-4 border-t">
            <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleSaveChanges}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {isCropperOpen && file?.url && (
      <ImageCropper 
        src={file.url} // Pass the original URL to the cropper
        onClose={() => setIsCropperOpen(false)}
        onCrop={handleCroppedImage}
      />
    )}
    </>
  );
}
