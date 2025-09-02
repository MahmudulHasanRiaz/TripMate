
"use client"
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, MoreHorizontal, Trash2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import UserProfileModal from "@/components/admin/UserProfileModal";
import AddUserModal from "@/components/admin/AddUserModal";
import { getInitials } from "@/lib/utils";
import { getSupabaseClient_client } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteUser } from "@/lib/actions";

export default function AdminCustomersListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { toast } = useToast();
  const { signup } = useAuth();
  const supabase = getSupabaseClient_client();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('users').select('*').eq('role', 'customer');
      if (error) throw error;
      setUsers(data as User[]);
    } catch (error: any) {
      console.error("Error fetching customer users:", error);
      toast({
        title: "Error loading customers",
        description: `Could not fetch user data: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadUsers();
  }, []);

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
     if (!userToDelete) return;
    
    const result = await deleteUser(userId);

    if (result.success) {
        setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
        toast({
            title: "User Deleted",
            description: `User ${userToDelete.name} has been removed from Authentication and Firestore.`,
            variant: "destructive"
        });
    } else {
        toast({ title: "Error Deleting User", description: result.message, variant: "destructive" });
    }
  }

  const handleAddUser = async (newUser: Omit<User, 'id'>) => {
    try {
      await signup(newUser);
      toast({
        title: "Customer Added",
        description: `User ${newUser.name} has been created.`
      });
      setIsAddModalOpen(false);
      loadUsers(); // Refresh list
    } catch (error: any) {
      console.error("Failed to add customer:", error);
      toast({
          title: "Error adding customer",
          description: error.message || "Could not create the new user.",
          variant: "destructive"
      });
    }
  };

  const handleViewProfile = (user: User) => {
    setSelectedUser(user);
    setIsProfileModalOpen(true);
  }

  const handleSaveUser = async (updatedUser: User) => {
    try {
        const { id, password, ...dataToSave } = updatedUser;
        const { error } = await supabase.from('users').update(dataToSave).eq('id', id);
        if (error) throw error;
        loadUsers();
        setIsProfileModalOpen(false);
        toast({
          title: "User Updated",
          description: `${updatedUser.name}'s profile has been saved.`
        });
    } catch (error: any) {
        console.error("Error saving user:", error);
        toast({ title: "Error", description: `Failed to save user details: ${error.message}`, variant: "destructive" });
    }
  }

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Customers</CardTitle>
            <CardDescription>View and manage customer accounts.</CardDescription>
        </div>
         <Button size="sm" className="gap-1" onClick={() => setIsAddModalOpen(true)}>
            <PlusCircle className="h-3.5 w-3.5" />
            Add Customer
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                        <TableRow key={index}>
                            <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : (
                  users.map((user) => (
                      <TableRow key={user.id}>
                          <TableCell>
                              <div className="flex items-center gap-3">
                                  <Avatar>
                                      <AvatarImage src={user.photo_url || undefined} alt={user.name} />
                                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">{user.name}</span>
                              </div>
                          </TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
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
                                  <DropdownMenuItem onClick={() => handleViewProfile(user)}>
                                      <UserIcon className="mr-2 h-4 w-4" />
                                      View Profile
                                    </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(user.id)}>
                                      <Trash2 className="mr-2 h-4 w-4"/>
                                      Delete User
                                  </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                      </TableRow>
                  ))
                )}
            </TableBody>
        </Table>
      </CardContent>
    </Card>
    {selectedUser && (
        <UserProfileModal 
            user={selectedUser}
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            onSave={handleSaveUser}
        />
      )}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddUser}
        defaultRole="customer"
      />
    </>
  );
}
