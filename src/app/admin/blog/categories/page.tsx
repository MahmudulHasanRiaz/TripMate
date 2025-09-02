
"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Category } from "@/lib/data";
import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseClient_client } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminBlogCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [currentCategory, setCurrentCategory] = useState<Partial<Category>>({});
  const { toast } = useToast();
  const supabase = getSupabaseClient_client();

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
  }

  const loadCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      setCategories(data as Category[]);
    } catch (e) {
      toast({ title: "Error", description: "Could not fetch categories.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);
  
  const handleAddNew = () => {
    setEditingCategory(null);
    setCurrentCategory({ name: "", slug: "" });
    setIsDialogOpen(true);
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setCurrentCategory(category);
    setIsDialogOpen(true);
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      toast({
          title: "Category Deleted",
          description: "The category has been successfully deleted.",
          variant: "destructive"
      });
      loadCategories();
    } catch(e) {
       toast({ title: "Error", description: "Could not delete category.", variant: "destructive" });
    }
  }

  const handleSave = async () => {
    if (!currentCategory.name?.trim()) {
      toast({
        title: "Error",
        description: "Category name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    
    const slug = currentCategory.slug || generateSlug(currentCategory.name);
    const dataToSave = { ...currentCategory, slug, id: editingCategory ? editingCategory.id : slug };

    try {
        if (editingCategory) {
          const { error } = await supabase.from('categories').update(dataToSave).eq('id', editingCategory.id);
          if (error) throw error;
          toast({
            title: "Category Updated",
            description: "The category has been successfully updated.",
          });
        } else {
          const { error } = await supabase.from('categories').insert(dataToSave);
          if (error) throw error;
          toast({
            title: "Category Added",
            description: `"${currentCategory.name}" has been added.`,
          });
        }

        loadCategories();
        setIsDialogOpen(false);
        setCurrentCategory({});
        setEditingCategory(null);
    } catch(e) {
        toast({ title: "Error", description: "Could not save category.", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Blog Categories</CardTitle>
            <CardDescription>Manage your blog post categories.</CardDescription>
        </div>
        <Button size="sm" className="gap-1" onClick={handleAddNew}>
            <PlusCircle className="h-3.5 w-3.5" />
            Add Category
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index}>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                ))
            ) : (
                categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleEdit(cat)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(cat.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
            )}
             {!loading && categories.length === 0 && (
                <TableRow>
                    <TableCell colSpan={2} className="text-center h-24">
                        No categories found. Add one to get started.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
              <DialogDescription>
                {editingCategory ? "Update the name of the category." : "Enter the name for the new category."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input 
                        id="name" 
                        value={currentCategory.name || ""}
                        onChange={(e) => setCurrentCategory(prev => ({...prev, name: e.target.value, slug: generateSlug(e.target.value)}))}
                        placeholder="e.g., Travel Tips"
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
