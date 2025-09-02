
"use client"

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, UserRole } from "@/hooks/use-auth";
import { useEffect } from "react";
import MediaPicker from "./MediaPicker";
import { Separator } from "../ui/separator";

const addUserSchema = z.object({
    name: z.string().min(1, "Name is required."),
    email: z.string().email("A valid email is required."),
    password: z.string().min(6, "Password must be at least 6 characters."),
    role: z.enum(["customer", "staff", "admin"]), // superadmin cannot be added manually
    username: z.string().min(3, "Username must be at least 3 characters.").regex(/^[a-z0-9_.-]+$/, "Username can only contain lowercase letters, numbers, and symbols: . _ -").optional().or(z.literal('')),
    phone: z.string().optional(),
    photo_url: z.string().url().optional().or(z.literal('')),
});


type AddUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newUser: Omit<User, 'id'>) => void;
  defaultRole: UserRole;
};

export default function AddUserModal({ isOpen, onClose, onSave, defaultRole }: AddUserModalProps) {
  
  const form = useForm<z.infer<typeof addUserSchema>>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: defaultRole,
      username: "",
      phone: "",
      photo_url: "",
    },
  });

  // Reset form when modal opens with a new default role
  useEffect(() => {
    form.reset({ role: defaultRole, name: "", email: "", password: "", username: "", phone: "", photo_url: "" });
  }, [isOpen, defaultRole, form]);

  if (!isOpen) {
    return null;
  }

  const onSubmit = (data: z.infer<typeof addUserSchema>) => {
    const newUser: Omit<User, 'id'> = {
        ...data,
    };
    onSave(newUser);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { form.reset(); onClose(); }}}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account and assign a role. Email, password, name and role are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-grow overflow-y-auto pr-4 pl-1">
            <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name && <p className="text-destructive text-sm mt-1">{form.formState.errors.name.message}</p>}
            </div>
             <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register("email")} />
                 {form.formState.errors.email && <p className="text-destructive text-sm mt-1">{form.formState.errors.email.message}</p>}
            </div>
             <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...form.register("password")} />
                 {form.formState.errors.password && <p className="text-destructive text-sm mt-1">{form.formState.errors.password.message}</p>}
            </div>
             <div>
                 <Label htmlFor="role">Role</Label>
                 <Controller
                    name="role"
                    control={form.control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger id="role">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="customer">Customer</SelectItem>
                                <SelectItem value="staff">Staff</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                 />
                 {form.formState.errors.role && <p className="text-destructive text-sm mt-1">{form.formState.errors.role.message}</p>}
            </div>

            <Separator />

            <h3 className="text-md font-medium">Optional Information</h3>
            
            <div>
                <Label htmlFor="username">Username</Label>
                <Input id="username" {...form.register("username")} />
                {form.formState.errors.username && <p className="text-destructive text-sm mt-1">{form.formState.errors.username.message}</p>}
            </div>
            
             <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" {...form.register("phone")} />
            </div>

            <div>
                <Label>Profile Picture</Label>
                <Controller
                    name="photo_url"
                    control={form.control}
                    render={({ field }) => (
                        <MediaPicker imageUrl={field.value || ""} onImageUrlChange={field.onChange} />
                    )}
                />
            </div>

            <DialogFooter className="pt-4 mt-auto sticky bottom-0 bg-background pb-0">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save User</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
