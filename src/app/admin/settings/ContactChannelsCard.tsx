"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, MessageCircle } from "lucide-react";

import {
  contactChannelsSchema,
  type ContactChannelsInput,
} from "@/modules/settings/site-settings-validation";
import { saveContactChannelsAction } from "@/modules/settings/site-settings-actions";
import {
  messengerChannelLink,
  callChannelLink,
  instagramChannelLink,
  whatsappChannelLink,
} from "@/components/site/contact-channels";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ContactChannelsCardProps = {
  initial: {
    whatsappNumber: string;
    whatsappPrefill: string | null;
    messengerUsername: string;
    callNumber: string;
    instagramHandle: string;
  };
};

/**
 * Floating chat-widget channel config (Admin → Settings → Brand & Theme).
 * Empty = that icon hides on the site; the live link preview under each
 * field shows EXACTLY what visitors will open (built by the same builders
 * the public widget uses — no drift possible).
 */
export default function ContactChannelsCard({ initial }: ContactChannelsCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ContactChannelsInput>({
    resolver: zodResolver(contactChannelsSchema),
    defaultValues: {
      whatsappNumber: initial.whatsappNumber || "",
      whatsappPrefill: initial.whatsappPrefill ?? "",
      messengerUsername: initial.messengerUsername || "",
      callNumber: initial.callNumber || "",
      instagramHandle: initial.instagramHandle || "",
    },
  });

  // Subscribed fields (useWatch, not form.watch()) — form.watch() is a
  // compiler-hostile API keyed per call; useWatch is the supported
  // re-render subscription and keeps the live link previews in sync.
  const watched = useWatch({ control: form.control });
  const values = { ...form.getValues(), ...watched };
  const waPreview = whatsappChannelLink(values.whatsappNumber || "", values.whatsappPrefill);
  const mgPreview = messengerChannelLink(values.messengerUsername || "");
  const callPreview = callChannelLink(values.callNumber || "");
  const igPreview = instagramChannelLink(values.instagramHandle || "");

  const onSubmit = form.handleSubmit((vals) => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await saveContactChannelsAction(vals);
        if (res.ok) {
          toast({
            title: "Contact channels saved",
            description: "Floating chat widget updated across the public site.",
          });
          router.refresh();
        } else {
          setError(res.error || "Failed to save contact channels.");
        }
      } catch {
        setError("An unexpected server error occurred while saving.");
      }
    });
  });

  return (
    <Card className="shadow-xs border-border bg-card">
      <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/60">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MessageCircle className="size-4 text-muted-foreground" aria-hidden="true" />
              <span>Floating Chat Widget Channels</span>
            </CardTitle>
            <CardDescription className="text-xs">
              WhatsApp, Messenger, Call, Instagram — leave any field empty to hide that icon.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-mono shrink-0">
            chat widget
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {error ? (
          <div role="alert" aria-live="polite" className="mb-6 flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)} className="font-semibold underline ml-2 hover:opacity-80">
              Dismiss
            </button>
          </div>
        ) : null}
        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="whatsappNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">WhatsApp Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+880 1700 000000" className="h-10 text-xs font-mono" value={field.value ?? ""} onChange={field.onChange} />
                    </FormControl>
                    <FormDescription className="text-[11px]">
                      {waPreview ? (
                        <>Opens: <span className="font-mono break-all">{waPreview}</span></>
                      ) : (
                        "Empty → WhatsApp icon hidden."
                      )}
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="messengerUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Messenger Username</FormLabel>
                    <FormControl>
                      <Input placeholder="tripmate.travel" className="h-10 text-xs font-mono" value={field.value ?? ""} onChange={field.onChange} />
                    </FormControl>
                    <FormDescription className="text-[11px]">
                      {mgPreview ? (
                        <>Opens: <span className="font-mono break-all">{mgPreview}</span></>
                      ) : (
                        "Username only, not a URL. Empty → icon hidden."
                      )}
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="whatsappPrefill"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">WhatsApp Prefill Message (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Salam! I need help with…" className="text-xs resize-none" value={field.value ?? ""} onChange={field.onChange} />
                  </FormControl>
                  <FormDescription className="text-[11px]">
                    Pre-filled chat text visitors send on first tap.
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="callNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Call Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+880 1700 000000" className="h-10 text-xs font-mono" value={field.value ?? ""} onChange={field.onChange} />
                    </FormControl>
                    <FormDescription className="text-[11px]">
                      {callPreview ? (
                        <>Opens: <span className="font-mono break-all">{callPreview}</span></>
                      ) : (
                        "Empty → Call icon hidden."
                      )}
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="instagramHandle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Instagram</FormLabel>
                    <FormControl>
                      <Input placeholder="@handle or https://instagram.com/…" className="h-10 text-xs font-mono" value={field.value ?? ""} onChange={field.onChange} />
                    </FormControl>
                    <FormDescription className="text-[11px]">
                      {igPreview ? (
                        <>Opens: <span className="font-mono break-all">{igPreview}</span></>
                      ) : (
                        "Handle or full URL. Empty → icon hidden."
                      )}
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" size="sm" disabled={saving} className="h-10 px-6 text-xs font-semibold">
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <span>Save Channels</span>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
