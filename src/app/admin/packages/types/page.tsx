
"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PackageType } from "@/lib/data";
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

export default function AdminPackageTypesPage() {
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<PackageType | null>(null);
  const [currentType, setCurrentType] = useState<Partial<PackageType>>({});
  const { toast } = useToast();
  const supabase = getSupabaseClient_client();

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
  }

  const loadPackageTypes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('package_types').select('*');
      if (error) throw error;
      setPackageTypes(data as PackageType[]);
    } catch (e: any) {
      toast({ title: "Error", description: `Could not fetch package types: ${e.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackageTypes();
  }, []);
  
  const handleAddNew = () => {
    setEditingType(null);
    setCurrentType({
      name: "",
      slug: "",
      image_url: "https://placehold.co/600x400.png"
    });
    setIsDialogOpen(true);
  }

  const handleEdit = (type: PackageType) => {
    setEditingType(type);
    setCurrentType(type);
    setIsDialogOpen(true);
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('package_types').delete().eq('id', id);
      if (error) throw error;
      toast({
          title: "Package Type Deleted",
          description: "The package type has been successfully deleted.",
          variant: "destructive"
      });
      loadPackageTypes();
    } catch (e: any) {
       toast({ title: "Error", description: `Could not delete package type: ${e.message}`, variant: "destructive" });
    }
  }

  const handleSave = async () => {
    if (!currentType.name?.trim()) {
      toast({
        title: "Error",
        description: "Package type name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    
    const slug = currentType.slug || generateSlug(currentType.name);
    const dataToSave = { ...currentType, slug, id: editingType ? editingType.id : slug };

    try {
      if (editingType) {
        const { error } = await supabase.from('package_types').update(dataToSave).eq('id', editingType.id);
        if (error) throw error;
        toast({
          title: "Package Type Updated",
          description: "The package type has been successfully updated.",
        });
      } else {
        const { error } = await supabase.from('package_types').insert(dataToSave);
        if (error) throw error;
        toast({
          title: "Package Type Added",
          description: `"${currentType.name}" has been added.`,
        });
      }
      loadPackageTypes();
      setIsDialogOpen(false);
      setCurrentType({});
      setEditingType(null);
    } catch (e: any) {
      toast({ title: "Error", description: `Could not save package type: ${e.message}`, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Package Types</CardTitle>
            <CardDescription>Manage package types (e.g., Tour, Hajj, Umrah).</CardDescription>
        </div>
        <Button size="sm" className="gap-1" onClick={handleAddNew}>
            <PlusCircle className="h-3.5 w-3.5" />
            Add Package Type
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Type Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index}>
                    <TableCell><Skeleton className="h-12 w-16 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                ))
            ) : (
                packageTypes.map((type) => (
                  <TableRow key={type.id}>
                     <TableCell>
                      <Image 
                        src={type.image_url} 
                        alt={type.name} 
                        width={64} 
                        height={48} 
                        className="rounded-md object-cover aspect-[4/3]"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{type.name}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleEdit(type)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(type.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
            )}
            {!loading && packageTypes.length === 0 && (
                <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                        No package types found. Add one to get started.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingType ? "Edit Package Type" : "Add New Package Type"}</DialogTitle>
              <DialogDescription>
                {editingType ? "Update the details of the package type." : "Enter the details for the new package type."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input 
                        id="name" 
                        value={currentType.name || ""}
                        onChange={(e) => setCurrentType(prev => ({...prev, name: e.target.value, slug: generateSlug(e.target.value)}))}
                        className="col-span-3"
                        placeholder="e.g., Special Tour"
                    />
                </div>
                 <div className="space-y-2">
                  <Label>Image</Label>
                  <MediaPicker 
                    imageUrl={currentType.image_url || ""}
                    onImageUrlChange={(url) => setCurrentType(prev => ({...prev, image_url: url}))}
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
