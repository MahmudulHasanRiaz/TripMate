import { Award, CreditCard, Headphones, ShieldCheck } from "lucide-react";

export function TrustStrip() {
  return (
    <section aria-label="TripMate Agency Accreditation and Trust Guarantee" className="border-y border-border bg-muted/30 py-6">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-8">
          {/* Item 1 */}
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">ATAB & CAAB Certified</div>
              <div className="text-[11px] text-muted-foreground">Official Travel Agency Reg.</div>
            </div>
          </div>

          {/* Item 2 */}
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Award className="size-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">Ministry Approved</div>
              <div className="text-[11px] text-muted-foreground">Licensed Hajj & Umrah Operator</div>
            </div>
          </div>

          {/* Item 3 */}
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="size-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">Verified Payments</div>
              <div className="text-[11px] text-muted-foreground">bKash, Nagad, Bank, Pay Later</div>
            </div>
          </div>

          {/* Item 4 */}
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Headphones className="size-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">24/7 Human Support</div>
              <div className="text-[11px] text-muted-foreground">Direct WhatsApp & Emergency Desk</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
