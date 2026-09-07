import { Headphones, Mail, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export type HumanConciergeProps = {
  phone?: string;
  email?: string;
  address?: string;
};

export function HumanConcierge({
  phone = "+880 1700-000000",
  email = "concierge@tripmate.agency",
  address = "Level 4, Plot 18, Road 11, Block F, Banani, Dhaka-1213",
}: HumanConciergeProps) {
  const cleanPhone = phone.replace(/[^0-9+]/g, "");

  return (
    <section aria-label="TripMate Human Concierge" className="bg-secondary/60 py-16 lg:py-24 border-y border-border">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Headphones className="size-3.5" />
              <span>Dedicated Human Advisory Team</span>
            </div>

            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Prefer speaking directly with a licensed travel specialist?
            </h2>

            <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
              Travel should be effortless. Our senior consultants are on standby to design bespoke family itineraries, arrange specialized VIP Umrah escorts, coordinate medical clearances, or process complex visa documents.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <MessageCircle className="size-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">Direct WhatsApp</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Average response: &lt; 5 mins</div>
                  <a
                    href={`https://wa.me/${cleanPhone.replace("+", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
                  >
                    Chat on WhatsApp →
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Phone className="size-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">Priority Phone Line</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{phone}</div>
                  <a
                    href={`tel:${cleanPhone}`}
                    className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
                  >
                    Call Now →
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-md space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Visit Our Banani Office
                </span>
                <h3 className="text-lg font-bold text-foreground">
                  TripMate Headquarters
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Have a cup of tea with our destination specialists while we organize your passports, flights, and visas in person.
                </p>
              </div>

              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="flex items-start gap-3">
                  <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
                  <span>{address}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="size-4 text-primary shrink-0" />
                  <span>{email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="size-4 text-primary shrink-0" />
                  <span>Open Saturday – Thursday, 10:00 AM – 7:00 PM</span>
                </div>
              </div>

              <div className="pt-2">
                <Button asChild className="w-full rounded-xl">
                  <a
                    href={`https://wa.me/${cleanPhone.replace("+", "")}?text=${encodeURIComponent("Hello TripMate, I would like to schedule an in-person consultation.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="mr-2 size-4" />
                    Book In-Person Appointment
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
