
"use client"

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { BookCopy, Heart, UserCircle, Edit } from "lucide-react";
import { useAuth, User } from "@/hooks/use-auth";
import UserProfileModal from "@/components/admin/UserProfileModal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseClient_client } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { user, setUser, loading } = useAuth();
  const { toast } = useToast();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const supabase = getSupabaseClient_client();

  const handleSaveProfile = async (updatedUser: User) => {
    try {
        const { uid, password, ...dataToSave } = updatedUser;
        const { error } = await supabase.from('users').update(dataToSave).eq('id', uid);
        if (error) throw error;
        
        setUser(updatedUser);

        setIsProfileModalOpen(false);
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated."
        });
    } catch (error: any) {
        console.error("Error saving profile:", error);
        toast({ title: "Error", description: `Failed to save your profile: ${error.message}`, variant: "destructive" });
    }
  };

  return (
    <>
      <div className="container mx-auto px-4 py-12">
          <header className="mb-8">
              <h1 className="text-4xl font-headline font-bold">My Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {loading ? "..." : user?.name || 'happy traveler'}!</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="md:col-span-1 flex flex-col">
                  <CardHeader>
                      <UserCircle className="h-10 w-10 mb-4 text-primary" />
                      <CardTitle>My Profile</CardTitle>
                      <CardDescription>View and edit your personal information.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                      {loading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      ) : user ? (
                        <div className="text-sm space-y-2 text-muted-foreground">
                          <p><strong>Name:</strong> {user.name}</p>
                          <p><strong>Email:</strong> {user.email}</p>
                        </div>
                      ) : (
                         <div className="text-center py-8 text-muted-foreground">
                            <p>Could not load profile data.</p>
                        </div>
                      )}
                  </CardContent>
                  <CardFooter>
                     <Button variant="outline" className="w-full" onClick={() => setIsProfileModalOpen(true)} disabled={loading || !user}>
                       <Edit className="mr-2 h-4 w-4" />
                       Edit Profile
                     </Button>
                  </CardFooter>
              </Card>
              <Card className="md:col-span-2">
                   <CardHeader>
                      <BookCopy className="h-10 w-10 mb-4 text-primary" />
                      <CardTitle>My Bookings</CardTitle>
                      <CardDescription>View your past and upcoming trips.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                          <p>You have no upcoming bookings.</p>
                          <a href="/packages" className="text-primary hover:underline">Explore packages</a>
                      </div>
                  </CardContent>
              </Card>
              <Card className="md:col-span-3">
                   <CardHeader>
                      <Heart className="h-10 w-10 mb-4 text-primary" />
                      <CardTitle>My Wishlist</CardTitle>
                      <CardDescription>Packages you've saved for later.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                          <p>Your wishlist is empty.</p>
                      </div>
                  </CardContent>
              </Card>
          </div>
      </div>
      {user && (
        <UserProfileModal
            user={user}
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            onSave={handleSaveProfile}
            isEditingSelf={true}
        />
      )}
    </>
  );
}
