
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Booking } from "@/lib/data";
import { getSupabaseClient_client } from "@/lib/supabase";

const formSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  phone: z.string().min(10, "Phone number must be at least 10 digits."),
  travelers: z.coerce.number().min(1, "There must be at least 1 traveler."),
  departureDate: z.date({
    required_error: "A departure date is required.",
  }),
});

type BookingFormProps = {
    packageId: string;
    packageName: string;
    setDialogOpen: (open: boolean) => void;
}

export default function BookingForm({ packageId, packageName, setDialogOpen }: BookingFormProps) {
  const { toast } = useToast();
  const supabase = getSupabaseClient_client();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      travelers: 1,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    
    try {
        const newBooking: Omit<Booking, 'id'> = {
            package_id: packageId,
            package_name: packageName,
            customer_name: values.fullName,
            customer_email: values.email,
            customer_phone: values.phone,
            travelers: values.travelers,
            departure_date: values.departureDate.toISOString(),
            booking_date: new Date().toISOString(),
            status: "Pending"
        };
        
        const { error } = await supabase.from('bookings').insert(newBooking);
        if (error) throw error;

        toast({
          title: "Booking Submitted!",
          description: "Thank you for your booking. We will contact you shortly to confirm the details.",
        });
        setDialogOpen(false);
        form.reset();
    } catch(e: any) {
        console.error("Booking Error:", e);
        toast({
          title: "Booking Failed",
          description: `There was an error submitting your booking: ${e.message}`,
          variant: "destructive"
        });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="+1234567890" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="travelers"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Travelers</FormLabel>
                <FormControl>
                    <Input type="number" min="1" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
              control={form.control}
              name="departureDate"
              render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                  <FormLabel>Departure Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <Button type="submit" className="w-full">
          Submit Booking
        </Button>
      </form>
    </Form>
  );
}
