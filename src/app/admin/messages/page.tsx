
"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ContactMessage } from "@/lib/data";
import { format, formatDistanceToNow } from "date-fns";
import { Mail, MailOpen, Trash2, MoreHorizontal, Trash, RotateCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getSupabaseClient_client } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { emptyTrash } from "@/lib/actions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

function MessageRow({ message, handleRowClick, markAsRead, onAction }: { message: ContactMessage, handleRowClick: (msg: ContactMessage) => void, markAsRead: (id: string, isRead: boolean) => void, onAction: (action: 'trash' | 'restore' | 'delete', id: string) => void }) {
    const [receivedAt, setReceivedAt] = useState("");
    const isTrashed = !!message.deleted_at;

    useEffect(() => {
        setReceivedAt(formatDistanceToNow(new Date(message.submitted_at), { addSuffix: true }));
    }, [message.submitted_at]);

    return (
        <TableRow 
            key={message.id} 
            onClick={() => handleRowClick(message)} 
            className={cn("cursor-pointer", !message.is_read && !isTrashed && "font-bold")}
        >
            <TableCell className="text-center">
                {message.is_read || isTrashed ? <MailOpen className="h-5 w-5 text-muted-foreground" /> : <Mail className="h-5 w-5 text-primary" />}
            </TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <span>{message.name}</span>
                    <span className={cn("text-xs", message.is_read || isTrashed ? "text-muted-foreground" : "")}>{message.email}</span>
                </div>
            </TableCell>
            <TableCell>{message.subject}</TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <span>{receivedAt || "..."}</span>
                    <span className={cn("text-xs", message.is_read || isTrashed ? "text-muted-foreground" : "")}>{format(new Date(message.submitted_at), "PPpp")}</span>
                </div>
            </TableCell>
            <TableCell className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                         {!isTrashed && (
                            <DropdownMenuItem onClick={(e) => {e.stopPropagation(); markAsRead(message.id!, !message.is_read);}}>
                                {message.is_read ? <Mail className="mr-2 h-4 w-4"/> : <MailOpen className="mr-2 h-4 w-4"/>}
                                Mark as {message.is_read ? "Unread" : "Read"}
                            </DropdownMenuItem>
                         )}
                         {isTrashed ? (
                            <>
                                <DropdownMenuItem onClick={() => onAction("restore", message.id!)}>
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
                                        <AlertDialogDescription>This will permanently delete this message. This action cannot be undone.</AlertDialogDescription>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => onAction('delete', message.id!)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </>
                         ) : (
                             <DropdownMenuItem onClick={(e) => {e.stopPropagation(); onAction('trash', message.id!)}} className="text-destructive">
                                <Trash className="mr-2 h-4 w-4"/> Move to Trash
                            </DropdownMenuItem>
                         )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
}

export default function AdminMessagesPage() {
  const [allMessages, setAllMessages] = useState<ContactMessage[]>([]);
  const [trashedMessages, setTrashedMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();
  const supabase = getSupabaseClient_client();

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('contact_messages').select('*').order('submitted_at', { ascending: false });
      if(error) throw error;

      const allData = data as ContactMessage[];

      setAllMessages(allData.filter(m => !m.deleted_at));
      setTrashedMessages(allData.filter(m => !!m.deleted_at));

    } catch(e: any) {
      console.error("Failed to load messages:", e);
      toast({ title: "Error", description: "Could not fetch messages.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleRowClick = (message: ContactMessage) => {
    setSelectedMessage(message);
    if (!message.is_read && !message.deleted_at) {
      markAsRead(message.id!, true);
    }
  };

  const markAsRead = async (messageId: string, isRead: boolean) => {
    try {
        const { error } = await supabase.from('contact_messages').update({ is_read: isRead }).eq('id', messageId);
        if (error) throw error;
        loadMessages(); 
    } catch(e: any) {
        console.error("Failed to update message status:", e.message);
    }
  };
  
  const handleAction = async (action: 'trash' | 'restore' | 'delete', id: string) => {
     try {
        if (action === 'trash') {
            const { error } = await supabase.from('contact_messages').update({ deleted_at: new Date().toISOString() }).eq('id', id);
            if (error) throw error;
            toast({ title: 'Message moved to trash' });
        } else if (action === 'restore') {
            const { error } = await supabase.from('contact_messages').update({ deleted_at: null }).eq('id', id);
            if (error) throw error;
            toast({ title: 'Message restored' });
        } else if (action === 'delete') {
            const { error } = await supabase.from('contact_messages').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Message permanently deleted', variant: 'destructive' });
        }
        loadMessages();
    } catch(e: any) {
        toast({ title: 'Error', description: `Failed to ${action} message: ${e.message}`, variant: 'destructive' });
    }
  }

  const handleEmptyTrash = async () => {
    if (trashedMessages.length === 0) return;
    const result = await emptyTrash('contactMessages');
    if (result.success) {
      toast({ title: 'Trash Emptied', description: `${trashedMessages.length} messages permanently deleted.` });
      loadMessages();
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  }

  const currentList = activeTab === 'all' ? allMessages : trashedMessages;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
          <CardDescription>View and manage messages from your contact form.</CardDescription>
        </CardHeader>
        <CardContent>
           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="all">Inbox ({allMessages.length})</TabsTrigger>
                    <TabsTrigger value="trash"><Trash className="mr-2"/>Trash ({trashedMessages.length})</TabsTrigger>
                </TabsList>
                 {activeTab === 'trash' && trashedMessages.length > 0 && (
                     <div className="flex items-center justify-between mt-4">
                         <p className="text-sm text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4"/> Items in trash are permanently deleted after 30 days.</p>
                          <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">Empty Trash</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>This will permanently delete all {trashedMessages.length} messages in the trash. This action cannot be undone.</AlertDialogDescription>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Status</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                         Array.from({length: 3}).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                                <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                                <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                            </TableRow>
                         ))
                      ) : currentList.length > 0 ? currentList.map((message) => (
                        <MessageRow 
                            key={message.id}
                            message={message}
                            handleRowClick={handleRowClick}
                            markAsRead={markAsRead}
                            onAction={handleAction}
                        />
                      )) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            {activeTab === 'all' ? 'Your inbox is empty.' : 'The trash is empty.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
                <TabsContent value="trash" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Status</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                         Array.from({length: 1}).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                                <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                                <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                            </TableRow>
                         ))
                      ) : currentList.length > 0 ? currentList.map((message) => (
                        <MessageRow 
                            key={message.id}
                            message={message}
                            handleRowClick={handleRowClick}
                            markAsRead={markAsRead}
                            onAction={handleAction}
                        />
                      )) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center h-24">
                             The trash is empty.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
      
       <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>{selectedMessage?.subject}</DialogTitle>
                <DialogDescription>
                    From: {selectedMessage?.name} ({selectedMessage?.email})
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 whitespace-pre-wrap text-sm text-muted-foreground max-h-[60vh] overflow-y-auto">
                {selectedMessage?.message}
            </div>
        </DialogContent>
       </Dialog>
    </>
  );
}
