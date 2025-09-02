
"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Trash2, Pencil, RotateCw, Trash, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Booking } from "@/lib/data";
import { format } from "date-fns";
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
import { getSupabaseClient_client } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { emptyTrash } from "@/lib/actions";

const statusColors: Record<Booking['status'], "default" | "secondary" | "destructive"> = {
  Pending: "secondary",
  Confirmed: "default",
  Cancelled: "destructive",
};

export default function AdminBookingsPage() {
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [trashedBookings, setTrashedBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();
  const supabase = getSupabaseClient_client();
  const router = useRouter();

  const loadBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('bookings').select('*').order('booking_date', { ascending: false });
      if (error) throw error;
      const allData = data as Booking[];
      
      setAllBookings(allData.filter(b => !b.deleted_at));
      setTrashedBookings(allData.filter(b => !!b.deleted_at));

    } catch (e) {
      console.error("Error fetching bookings:", e);
      toast({ title: "Error", description: "Failed to load bookings.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  const handleAction = async (action: 'trash' | 'restore' | 'delete', bookingId: string) => {
    try {
        if (action === 'trash') {
            const { error } = await supabase.from('bookings').update({ deleted_at: new Date().toISOString() }).eq('id', bookingId);
            if (error) throw error;
            toast({ title: 'Booking moved to trash' });
        } else if (action === 'restore') {
            const { error } = await supabase.from('bookings').update({ deleted_at: null }).eq('id', bookingId);
            if (error) throw error;
            toast({ title: 'Booking restored' });
        } else if (action === 'delete') {
            const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
            if (error) throw error;
            toast({ title: 'Booking permanently deleted', variant: 'destructive' });
        }
        loadBookings();
    } catch(e: any) {
        toast({ title: 'Error', description: `Failed to ${action} booking. ${e.message}`, variant: 'destructive' });
    }
  };
  
  const handleEmptyTrash = async () => {
    if (trashedBookings.length === 0) return;
    const result = await emptyTrash('bookings');
    if (result.success) {
      toast({ title: 'Trash Emptied', description: `${trashedBookings.length} bookings permanently deleted.` });
      loadBookings();
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  }

  const updateBookingStatus = async (bookingId: string, status: Booking['status']) => {
    try {
      const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId);
      if(error) throw error;
      toast({
        title: "Booking Status Updated",
        description: `Booking has been marked as ${status}.`
      });
      loadBookings();
    } catch(e) {
       toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  }
  
  const handleEdit = (bookingId: string) => {
    router.push(`/admin/bookings/edit/${bookingId}`);
  };

  const currentList = activeTab === 'all' ? allBookings : trashedBookings;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookings</CardTitle>
        <CardDescription>View and manage all customer bookings.</CardDescription>
      </CardHeader>
      <CardContent>
         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="all">All Bookings ({allBookings.length})</TabsTrigger>
                <TabsTrigger value="trash"><Trash className="mr-2"/>Trash ({trashedBookings.length})</TabsTrigger>
            </TabsList>

             {activeTab === 'trash' && trashedBookings.length > 0 && (
                 <div className="flex items-center justify-between mt-4">
                     <p className="text-sm text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4"/> Items in trash are permanently deleted after 30 days.</p>
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">Empty Trash</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently delete all {trashedBookings.length} bookings in the trash. This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleEmptyTrash} className="bg-destructive hover:bg-destructive/90">Confirm</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                 </div>
            )}
            
            <TabsContent value="all" className="mt-4">
              <BookingsTable loading={loading} bookings={currentList} isTrash={false} onAction={handleAction} onEdit={handleEdit} onStatusChange={updateBookingStatus} />
            </TabsContent>
            <TabsContent value="trash" className="mt-4">
               <BookingsTable loading={loading} bookings={currentList} isTrash={true} onAction={handleAction} onEdit={handleEdit} onStatusChange={updateBookingStatus} />
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

const BookingsTable = ({ loading, bookings, isTrash, onAction, onEdit, onStatusChange }: { loading: boolean, bookings: Booking[], isTrash: boolean, onAction: (action: any, id: string) => void, onEdit: (id: string) => void, onStatusChange: (id: string, status: Booking['status']) => void }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({length: 3}).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-2">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-8 w-8 ml-auto" />
            </div>
        ))}
      </div>
    )
  }

  if (bookings.length === 0) {
    return <div className="text-center py-16 text-muted-foreground">{isTrash ? "The trash is empty." : "No bookings found."}</div>;
  }
  
  return (
      <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Departure</TableHead>
              <TableHead>Booked On</TableHead>
              {!isTrash && <TableHead>Status</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>
                  <div className="font-medium">{booking.customer_name}</div>
                  <div className="text-sm text-muted-foreground">{booking.customer_email}</div>
                </TableCell>
                <TableCell>{booking.package_name}</TableCell>
                <TableCell>{format(new Date(booking.departure_date), "PPP")}</TableCell>
                <TableCell>{format(new Date(booking.booking_date), "PPP")}</TableCell>
                {!isTrash && 
                  <TableCell>
                    <Badge variant={statusColors[booking.status]}>{booking.status}</Badge>
                  </TableCell>
                }
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
                        <>
                          <DropdownMenuItem onClick={() => onEdit(booking.id!)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                              <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                  <DropdownMenuRadioGroup value={booking.status} onValueChange={(status) => onStatusChange(booking.id!, status as Booking['status'])}>
                                      <DropdownMenuRadioItem value="Pending">Pending</DropdownMenuRadioItem>
                                      <DropdownMenuRadioItem value="Confirmed">Confirmed</DropdownMenuRadioItem>
                                      <DropdownMenuRadioItem value="Cancelled">Cancelled</DropdownMenuRadioItem>
                                  </DropdownMenuRadioGroup>
                              </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        </>
                      )}

                      {isTrash ? (
                        <>
                            <DropdownMenuItem onClick={() => onAction('restore', booking.id!)}>
                                <RotateCw className="mr-2 h-4 w-4" /> Restore
                            </DropdownMenuItem>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-destructive">
                                      <Trash2 className="mr-2 h-4 w-4"/> Delete Permanently
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle></AlertDialogHeader>
                                    <AlertDialogDescription>This will permanently delete this booking. This action cannot be undone.</AlertDialogDescription>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onAction('delete', booking.id!)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </>
                      ) : (
                         <DropdownMenuItem className="text-destructive" onClick={() => onAction('trash', booking.id!)}>
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
  );
};
