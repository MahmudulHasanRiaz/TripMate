
"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Destination } from "@/lib/data";
import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import MediaPicker from "@/components/admin/MediaPicker";
import { getSupabaseClient_client } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDestinationsPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [currentDestination, setCurrentDestination] = useState<Partial<Destination>>({});
  const { toast } = useToast();
  const supabase = getSupabaseClient_client();
  
  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
  }

  const loadDestinations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('destinations').select('*');
      if (error) throw error;
      setDestinations(data as Destination[]);
    } catch (e: any) {
      toast({ title: "Error", description: `Could not fetch destinations: ${e.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDestinations();
  }, []);
  
  const handleAddNew = () => {
    setEditingDestination(null);
    setCurrentDestination({
      name: "",
      slug: "",
      image_url: "https://placehold.co/600x400.png"
    });
    setIsDialogOpen(true);
  }

  const handleEdit = (destination: Destination) => {
    setEditingDestination(destination);
    setCurrentDestination(destination);
    setIsDialogOpen(true);
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('destinations').delete().eq('id', id);
      if (error) throw error;
      toast({
          title: "Destination Deleted",
          description: "The destination has been successfully deleted.",
          variant: "destructive"
      });
      loadDestinations();
    } catch(e: any) {
      toast({ title: "Error", description: `Could not delete destination: ${e.message}`, variant: "destructive" });
    }
  }

  const handleSave = async () => {
    if (!currentDestination.name?.trim()) {
      toast({
        title: "Error",
        description: "Destination name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    const slug = currentDestination.slug || generateSlug(currentDestination.name);
    const dataToSave = { ...currentDestination, slug, id: editingDestination ? editingDestination.id : slug };

    try {
      if (editingDestination) {
        const { error } = await supabase.from('destinations').update(dataToSave).eq('id', editingDestination.id);
        if (error) throw error;
        toast({
          title: "Destination Updated",
          description: "The destination has been successfully updated.",
        });
      } else {
        const { error } = await supabase.from('destinations').insert(dataToSave);
        if (error) throw error;
        toast({
          title: "Destination Added",
          description: `"${currentDestination.name}" has been added.`,
        });
      }
      loadDestinations();
      setIsDialogOpen(false);
      setCurrentDestination({});
      setEditingDestination(null);
    } catch(e: any) {
       toast({ title: "Error", description: `Could not save destination: ${e.message}`, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Destinations</CardTitle>
            <CardDescription>Manage your package destinations.</CardDescription>
        </div>
        <Button size="sm" className="gap-1" onClick={handleAddNew}>
            <PlusCircle className="h-3.5 w-3.5" />
            Add Destination
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Destination Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index}>
                    <TableCell><Skeleton className="h-12 w-16 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                ))
            ) : (
                destinations.map((dest) => (
                  <TableRow key={dest.id}>
                    <TableCell>
                      <Image 
                        src={dest.image_url} 
                        alt={dest.name} 
                        width={64} 
                        height={48} 
                        className="rounded-md object-cover aspect-[4/3]"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{dest.name}</TableCell>
                     <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEdit(dest)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(dest.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
            )}
             {!loading && destinations.length === 0 && (
                <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                        No destinations found. Add one to get started.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingDestination ? "Edit Destination" : "Add New Destination"}</DialogTitle>
              <DialogDescription>
                {editingDestination ? "Update the details of the destination." : "Enter the details for the new destination."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input 
                        id="name" 
                        value={currentDestination.name || ""}
                        onChange={(e) => setCurrentDestination(prev => ({...prev, name: e.target.value, slug: generateSlug(e.target.value)}))}
                        placeholder="e.g., London, UK"
                    />
                </div>
                <div className="space-y-2">
                  <Label>Image</Label>
                  <MediaPicker 
                    imageUrl={currentDestination.image_url || ""}
                    onImageUrlChange={(url) => setCurrentDestination(prev => ({...prev, image_url: url}))}
                  />
                </div>
            </div>
            <div className="flex justify-end gap-2">
                 <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                 <Button onClick={handleSave}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
    </Card>
  );
}
