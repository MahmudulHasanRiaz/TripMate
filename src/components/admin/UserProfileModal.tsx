
"use client"

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, UserRole, useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import MediaPicker from "./MediaPicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const profileSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters.").regex(/^[a-z0-9_.-]+$/, "Username can only contain lowercase letters, numbers, and symbols: . _ -"),
    name: z.string().min(1, "Name is required."),
    email: z.string().email(),
    phone: z.string().optional(),
    photo_url: z.string().url().optional(),
    role: z.enum(["customer", "staff", "admin", "superadmin"]),
    newPassword: z.string().optional().or(z.literal('')),
});

type UserProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (updatedUser: User) => void;
  isEditingSelf?: boolean;
};

export default function UserProfileModal({ isOpen, onClose, user, onSave, isEditingSelf = false }: UserProfileModalProps) {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
        username: user?.username || "",
        name: user?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        photo_url: user?.photo_url || "",
        role: user?.role || "customer",
        newPassword: "",
    }
  });

  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username || "",
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        photo_url: user.photo_url || "",
        role: user.role || "customer",
        newPassword: "",
      });
    }
  }, [user, form]);


  if (!isOpen || !user) {
    return null;
  }
  
  const handlePasswordReset = () => {
    toast({
        title: "Password Reset Email Sent (Simulated)",
        description: `An email has been sent to ${user.email} with instructions to reset the password.`,
    });
  }

  const onSubmit = (data: z.infer<typeof profileSchema>) => {
    const updatedUser: User = {
        ...user,
        ...data,
    };

    if (data.newPassword && data.newPassword.length > 0) {
        // In a real app with a proper backend, you'd handle password updates securely.
        // Here we just attach it to be handled by the onSave prop.
        updatedUser.password = data.newPassword;
    }
    
    onSave(updatedUser);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit User Profile</DialogTitle>
          <DialogDescription>
            Manage user details and permissions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow overflow-y-auto pr-4 pl-1 space-y-4">
            <div className="flex items-center gap-4">
                 <Avatar className="h-24 w-24">
                    <AvatarImage src={form.watch('photo_url') || undefined} />
                    <AvatarFallback className="text-3xl">
                        {getInitials(form.watch('name'))}
                    </AvatarFallback>
                </Avatar>
                <div className="w-full">
                    <Label>Profile Picture</Label>
                    <Controller
                        name="photo_url"
                        control={form.control}
                        render={({ field }) => (
                            <MediaPicker imageUrl={field.value || ""} onImageUrlChange={field.onChange} />
                        )}
                    />
                </div>
            </div>
            <Separator />
            <div>
                <Label htmlFor="username">Username</Label>
                <Input id="username" {...form.register("username")} />
                {form.formState.errors.username && <p className="text-destructive text-sm mt-1">{form.formState.errors.username.message}</p>}
            </div>
            <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name && <p className="text-destructive text-sm mt-1">{form.formState.errors.name.message}</p>}
            </div>
             <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" {...form.register("email")} readOnly disabled />
            </div>
             <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" {...form.register("phone")} />
            </div>
            <div>
                 <Label htmlFor="role">Role</Label>
                 <Controller
                    name="role"
                    control={form.control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value} disabled={isEditingSelf || user.role === 'superadmin'}>
                            <SelectTrigger id="role">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="customer">Customer</SelectItem>
                                <SelectItem value="staff">Staff</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="superadmin" disabled>Super Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                 />
                 {isEditingSelf && <p className="text-xs text-muted-foreground mt-1">You cannot change your own role.</p>}
                 {user.role === 'superadmin' && <p className="text-xs text-muted-foreground mt-1">Super Admin role cannot be changed.</p>}
            </div>

            <Separator />
            
            <div className="space-y-2">
                <h4 className="font-medium">Password Management</h4>
                <Button type="button" variant="outline" onClick={handlePasswordReset}>Send Password Reset Email</Button>
            </div>
            
            <div>
                <Label htmlFor="newPassword">Set New Password</Label>
                <Input id="newPassword" type="password" {...form.register("newPassword")} placeholder="Leave blank to keep current password" />
                 {form.formState.errors.newPassword && <p className="text-destructive text-sm mt-1">{form.formState.errors.newPassword.message}</p>}
            </div>
            
            <DialogFooter className="mt-auto pt-4 border-t sticky bottom-0 bg-background pb-0">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save Changes</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
