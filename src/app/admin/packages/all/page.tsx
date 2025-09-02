
"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package } from "@/lib/data";
import { PlusCircle, MoreHorizontal, Trash2, Pencil, Trash, RotateCw, AlertTriangle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import AddPackageForm from "@/components/admin/AddPackageForm";
import { getSupabaseClient_client } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function AdminAllPackagesPage() {
  const [allPackages, setAllPackages] = useState<Package[]>([]);
  const [trashedPackages, setTrashedPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();
  const supabase = getSupabaseClient_client();
  const router = useRouter();

  const loadPackages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("packages").select('*').order("title");
      if (error) throw error;
      const packagesList = data as Package[];
      
      setAllPackages(packagesList.filter(p => !p.deleted_at));
      setTrashedPackages(packagesList.filter(p => !!p.deleted_at));
    } catch (error) {
      console.error("Error fetching packages:", error);
      toast({ title: "Error", description: "Could not fetch packages.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const addPackage = async (newPackageData: Omit<Package, 'id'>) => {
    try {
      const { error } = await supabase.from("packages").insert({ ...newPackageData, id: newPackageData.slug });
      if (error) throw error;
      toast({
        title: "Package Added!",
        description: `The package "${newPackageData.title}" has been successfully created.`,
      });
      setIsAddDialogOpen(false);
      loadPackages(); // Refresh the list
    } catch (error: any) {
      console.error("Error adding package:", error);
      toast({ title: "Error", description: `Failed to add the new package: ${error.message}`, variant: "destructive" });
    }
  };
  
  const handleAction = async (action: "trash" | "restore" | "delete", pkg: Package) => {
    try {
      if (action === "trash") {
          const { error } = await supabase.from("packages").update({ deleted_at: new Date().toISOString() }).eq('id', pkg.id);
          if (error) throw error;
          toast({ title: "Package moved to trash." });
      } else if (action === "restore") {
          const { error } = await supabase.from("packages").update({ deleted_at: null }).eq('id', pkg.id);
          if (error) throw error;
          toast({ title: "Package restored." });
      } else if (action === "delete") {
          const { error } = await supabase.from("packages").delete().eq('id', pkg.id);
          if (error) throw error;
          toast({ title: "Package permanently deleted.", variant: "destructive" });
      }
      loadPackages();
    } catch (e: any) {
        toast({ title: "Error", description: `Action failed: ${e.message}`, variant: "destructive" });
    }
  };
  
  const handleEdit = (pkg: Package) => {
     router.push(`/admin/packages/edit/${pkg.id}`);
  }

  const currentList = activeTab === 'all' ? allPackages : trashedPackages;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>All Packages</CardTitle>
            <CardDescription>Manage your tour, Hajj, and Umrah packages.</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
             <Button size="sm" className="gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                Add Package
             </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Package</DialogTitle>
              <DialogDescription>
                Fill in the details of the new package. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <AddPackageForm onSave={addPackage} setDialogOpen={setIsAddDialogOpen} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="all">All Packages ({allPackages.length})</TabsTrigger>
                <TabsTrigger value="trash">Trash ({trashedPackages.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
                <PackageTable packages={currentList} loading={loading} onAction={handleAction} onEdit={handleEdit} isTrash={false} />
            </TabsContent>
            <TabsContent value="trash" className="mt-4">
                <PackageTable packages={currentList} loading={loading} onAction={handleAction} onEdit={handleEdit} isTrash={true} />
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

const PackageTable = ({ packages, loading, onAction, onEdit, isTrash }: { packages: Package[], loading: boolean, onAction: any, onEdit: any, isTrash: boolean }) => {
    if (loading) {
        return (
            <div className="space-y-2 mt-4">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center p-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-6 w-20 ml-auto" />
                        <Skeleton className="h-8 w-8 ml-4" />
                    </div>
                ))}
            </div>
        )
    }

    if (packages.length === 0) {
        return (
            <div className="text-center h-24 flex items-center justify-center">
                <p>{isTrash ? "Trash is empty." : "No packages found."}</p>
            </div>
        )
    }

    return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell className="font-medium">{pkg.title}</TableCell>
                  <TableCell>
                    <Badge variant={pkg.type === "Tour" ? "secondary" : "default"}>
                      {pkg.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{pkg.destination}</TableCell>
                  <TableCell>৳{pkg.price.toLocaleString()}</TableCell>
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
                        {!isTrash && (
                            <DropdownMenuItem onClick={() => onEdit(pkg)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                        )}
                        {isTrash ? (
                            <>
                                <DropdownMenuItem onClick={() => onAction("restore", pkg)}>
                                    <RotateCw className="mr-2 h-4 w-4" /> Restore
                                </DropdownMenuItem>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <button className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                                        </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle></AlertDialogHeader>
                                        <AlertDialogDescription>This will permanently delete the package "{pkg.title}". This cannot be undone.</AlertDialogDescription>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onAction("delete", pkg)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </>
                        ) : (
                             <DropdownMenuItem className="text-destructive" onClick={() => onAction("trash", pkg)}>
                                <Trash className="mr-2 h-4 w-4" /> Move to Trash
                            </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
    )
}
