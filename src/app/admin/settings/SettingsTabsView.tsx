"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CreditCard,
  Database,
  ExternalLink,
  Home,
  Loader2,
  Mail,
  MessageSquareQuote,
  Palette,
  RotateCcw,
  Search,
  ShieldAlert,
  Sliders,
} from "lucide-react";
import type { HomeSettings, SiteSettings } from "@/modules/settings/site-settings";
import type { ThemeSettings } from "@/modules/settings/theme";
import type { PaymentSettings } from "@/modules/payments/validation";
import ThemeCustomizer from "@/components/admin/ThemeCustomizer";
import ContactChannelsCard from "./ContactChannelsCard";
import HomeVisibilityCard from "./HomeVisibilityCard";
import FooterSettingsCard from "./FooterSettingsCard";
import SeoIndexingCard from "./SeoIndexingCard";
import PaymentSettingsCard from "./PaymentSettingsCard";
import TrustStatsEditor, { type StatRow } from "./TrustStatsEditor";
import {
  homeSettingsInputSchema,
  siteSettingsInputSchema,
  type HomeSettingsInput,
  type SiteSettingsInput,
} from "@/modules/settings/site-settings-validation";
import {
  saveHomeSettingsAction,
  saveSiteSettingsAction,
} from "@/modules/settings/site-settings-actions";
import { useToast } from "@/hooks/use-toast";
import MediaPickerField from "@/components/admin/MediaPickerField";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type SettingsTabsViewProps = {
  initialSite: SiteSettings;
  initialHome: HomeSettings;
  initialTheme: ThemeSettings;
  initialPaymentSettings: PaymentSettings;
  storageDriver: string;
  canManagePayments: boolean;
};


export default function SettingsTabsView({
  initialSite,
  initialHome,
  initialTheme,
  initialPaymentSettings,
  storageDriver,
  canManagePayments,
}: SettingsTabsViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("brand");

  // --- Site Settings Form ---
  const [siteSaving, startSiteTransition] = useTransition();
  const [siteError, setSiteError] = useState<string | null>(null);

  const siteForm = useForm<SiteSettingsInput>({
    resolver: zodResolver(siteSettingsInputSchema),
    defaultValues: {
      // getSiteSettings() merges DB rows over DEFAULT_SITE_SETTINGS server-side,
      // so these props are never blank in practice — empty string is the honest
      // prefill, never a fabricated second source of contact data.
      title: initialSite.title || "",
      phone: initialSite.phone || "",
      email: initialSite.email || "",
      address: initialSite.address ?? "",
      logoUrl: initialSite.logoUrl ?? "",
      faviconUrl: initialSite.faviconUrl ?? "",
      searchEngineVisibility: initialSite.searchEngineVisibility ?? true,
      footerDescription: initialSite.footerDescription ?? "",
    },
  });

  const onSiteSubmit = siteForm.handleSubmit((values) => {
    setSiteError(null);
    startSiteTransition(async () => {
      try {
        const res = await saveSiteSettingsAction(values);
        if (res.ok) {
          toast({
            title: "Site settings saved",
            description: "Brand identity, contact info, and search visibility updated.",
          });
          router.refresh();
        } else {
          setSiteError(res.error || "Failed to save site settings.");
        }
      } catch {
        setSiteError("An unexpected server error occurred while saving site settings.");
      }
    });
  });

  // --- Home Settings Form ---
  const [homeSaving, startHomeTransition] = useTransition();
  const [homeError, setHomeError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatRow[]>(() => {
    return Array.isArray(initialHome.stats) && initialHome.stats.length > 0
      ? initialHome.stats.map((s) => ({ value: s.value || "", label: s.label || "" }))
      : [];
  });

  const homeForm = useForm<HomeSettingsInput>({
    resolver: zodResolver(homeSettingsInputSchema),
    defaultValues: {
      heroHeadline: initialHome.heroHeadline ?? "",
      heroSub: initialHome.heroSub ?? "",
      heroImage: initialHome.heroImage ?? "",
      heroImageAlt: initialHome.heroImageAlt ?? "",
      heroButtonLabel: initialHome.heroButtonLabel ?? "",
      heroButtonLink: initialHome.heroButtonLink ?? "",
      featuredKicker: initialHome.featuredKicker ?? "",
      featuredTitle: initialHome.featuredTitle ?? "",
      featuredLead: initialHome.featuredLead ?? "",
      ctaHeadline: initialHome.ctaHeadline ?? "",
      ctaSub: initialHome.ctaSub ?? "",
    },
  });

  const onHomeSubmit = homeForm.handleSubmit((values) => {
    setHomeError(null);
    const cleanStats = stats
      .filter((s) => s.value.trim() && s.label.trim())
      .map((s) => ({ value: s.value.trim(), label: s.label.trim() }));

    startHomeTransition(async () => {
      try {
        const res = await saveHomeSettingsAction({
          ...values,
          stats: cleanStats.length > 0 ? cleanStats : undefined,
          testimonials: initialHome.testimonials ?? undefined,
        });
        if (res.ok) {
          toast({
            title: "Home settings saved",
            description: "Hero marketing copy, call-to-action button, and imagery updated.",
          });
          router.refresh();
        } else {
          setHomeError(res.error || "Failed to save home settings.");
        }
      } catch {
        setHomeError("An unexpected server error occurred while saving home settings.");
      }
    });
  });

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-lg p-1">
          <TabsTrigger value="brand" className="text-xs font-semibold gap-2 min-h-9">
            <Palette className="size-3.5" aria-hidden="true" />
            <span>Brand &amp; Theme</span>
          </TabsTrigger>
          <TabsTrigger value="content" className="text-xs font-semibold gap-2 min-h-9">
            <Home className="size-3.5" aria-hidden="true" />
            <span>Site Content</span>
          </TabsTrigger>
          <TabsTrigger value="seo" className="text-xs font-semibold gap-2 min-h-9">
            <Search className="size-3.5" aria-hidden="true" />
            <span>SEO &amp; Indexing</span>
          </TabsTrigger>
          {canManagePayments ? (
            <TabsTrigger value="payments" className="text-xs font-semibold gap-2 min-h-9">
              <CreditCard className="size-3.5" aria-hidden="true" />
              <span>Payments &amp; Gateways</span>
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="email" className="text-xs font-semibold gap-2 min-h-9">
            <Mail className="size-3.5" aria-hidden="true" />
            <span>Email</span>
          </TabsTrigger>
          <TabsTrigger value="storage" className="text-xs font-semibold gap-2 min-h-9">
            <Database className="size-3.5" aria-hidden="true" />
            <span>Storage</span>
          </TabsTrigger>
          <TabsTrigger value="danger" className="text-xs font-semibold gap-2 min-h-9">
            <ShieldAlert className="size-3.5" aria-hidden="true" />
            <span>Danger Zone</span>
          </TabsTrigger>
        </TabsList>

        {/* ==================================================================== */}
        {/* BRAND & THEME                                                       */}
        {/* ==================================================================== */}
        <TabsContent value="brand" className="mt-4 space-y-6">
          <Card className="shadow-xs border-border bg-card">
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span>General Site & Contact Settings</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure agency brand name, support contact channels, asset paths, and SEO indexing.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  settings.site
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              {siteError ? (
                <div
                  role="alert"
                  aria-live="polite"
                  className="mb-6 flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                    <span>{siteError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSiteError(null)}
                    className="font-semibold underline ml-2 hover:opacity-80"
                  >
                    Dismiss
                  </button>
                </div>
              ) : null}

              <Form {...siteForm}>
                <form onSubmit={onSiteSubmit} noValidate className="space-y-6">
                  {/* Brand & Identity Fields */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Brand & Navigation
                    </h3>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={siteForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel className="text-xs font-medium">Site Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="TripMate"
                                className="h-10 text-xs"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="text-[11px]">
                              Agency brand name displayed in headers, footers, browser title tags, and meta tags.
                            </FormDescription>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={siteForm.control}
                        name="logoUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">Logo URL / Path</FormLabel>
                            <FormControl>
                              <MediaPickerField
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                accept="image"
                                placeholder="/logo.svg or https://..."
                                className="h-10 text-xs font-mono"
                              />
                            </FormControl>
                            <FormDescription className="text-[11px]">
                              Internal path starting with / (e.g. /logo.svg) or full https:// URL —
                              or pick from the media library.
                            </FormDescription>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={siteForm.control}
                        name="faviconUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">Favicon URL / Path</FormLabel>
                            <FormControl>
                              <MediaPickerField
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                accept="image"
                                placeholder="/favicon.svg or https://..."
                                className="h-10 text-xs font-mono"
                              />
                            </FormControl>
                            <FormDescription className="text-[11px]">
                              Browser tab icon. Internal path starting with / or full https:// URL —
                              or pick from the media library.
                            </FormDescription>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Contact Channels */}
                  <div className="space-y-4 pt-2 border-t border-border/60">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Support & Contact Details
                    </h3>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={siteForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">Phone Number</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="+880 1700 000000"
                                className="h-10 text-xs font-mono"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="text-[11px]">
                              Displayed in header/footer and landing page CTA buttons.
                            </FormDescription>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={siteForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">Contact Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="info@tripmate.test"
                                className="h-10 text-xs font-mono"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="text-[11px]">
                              Public inquiry inbox and customer contact address.
                            </FormDescription>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={siteForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel className="text-xs font-medium">Office Address</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Plot 12, Road 5, Dhanmondi, Dhaka 1205, Bangladesh"
                                className="h-10 text-xs"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="text-[11px]">
                              Physical agency office address shown in the footer and contact page.
                            </FormDescription>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={siteForm.control}
                        name="footerDescription"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel className="text-xs font-medium">
                              Footer Description (Optional)
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                rows={2}
                                placeholder="Premier travel partner providing authentic Hajj, Umrah, and holiday tour experiences."
                                className="text-xs resize-none"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormDescription className="text-[11px]">
                              Optional summary text rendered in the public footer. Leave blank to clear.
                            </FormDescription>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Search Engine Visibility Section */}
                  <div className="space-y-4 pt-2 border-t border-border/60">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Search className="size-3.5" aria-hidden="true" />
                      <span>Search Engine Indexing</span>
                    </h3>

                    <FormField
                      control={siteForm.control}
                      name="searchEngineVisibility"
                      render={({ field }) => (
                        <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-secondary/15 p-4 gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <FormLabel className="text-sm font-semibold cursor-pointer">
                                Search Engine Visibility
                              </FormLabel>
                              <Badge
                                variant={field.value ? "success" : "destructive"}
                                className="text-[10px] font-mono px-1.5 py-0"
                              >
                                {field.value ? "Indexable" : "Hidden (noindex)"}
                              </Badge>
                            </div>
                            <FormDescription className="text-xs text-muted-foreground max-w-xl">
                              When off, the site tells search engines not to index and the sitemap empties
                            </FormDescription>
                          </div>
                          <FormControl>
                            {/* Hit-slop wrapper keeps the switch visual at 24px
                                while the touch target meets the 44px spec floor. */}
                            <span className="inline-flex -m-2.5 p-2.5">
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                aria-label="Toggle search engine visibility"
                                className="min-h-[24px]"
                              />
                            </span>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Submit actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/60">
                    <p className="text-[11px] text-muted-foreground font-mono">
                      Leaving optional text empty clears the field back to system defaults.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={siteSaving}
                        onClick={() => siteForm.reset()}
                        className="min-h-[44px] text-xs"
                      >
                        <RotateCcw className="size-3.5 mr-1.5" aria-hidden="true" />
                        Reset
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={siteSaving}
                        className="min-h-[44px] text-xs font-semibold px-4"
                      >
                        {siteSaving ? (
                          <>
                            <Loader2 className="size-3.5 mr-2 animate-spin" aria-hidden="true" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="size-3.5 mr-2" aria-hidden="true" />
                            Save Site Settings
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <ContactChannelsCard
            initial={{
              whatsappNumber: initialSite.whatsappNumber || "",
              whatsappPrefill: initialSite.whatsappPrefill ?? null,
              messengerUsername: initialSite.messengerUsername || "",
              callNumber: initialSite.callNumber || "",
              instagramHandle: initialSite.instagramHandle || "",
            }}
          />

          <Card className="shadow-xs border-border bg-card">
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/60">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Palette className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span>Theme &amp; Presets</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Gallery, custom preset builder with live preview, and AA contrast hints.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <ThemeCustomizer initialTheme={initialTheme} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================================================================== */}
        {/* SITE CONTENT                                                        */}
        {/* ==================================================================== */}
        <TabsContent value="content" className="mt-4 space-y-6">
          <Card className="shadow-xs border-border bg-card">
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Sliders className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span>Home Page Hero Banner & Copy</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Customize the headline, subtitle, hero image, and primary call-to-action button for the public home page.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  settings.home
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              {homeError ? (
                <div
                  role="alert"
                  aria-live="polite"
                  className="mb-6 flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                    <span>{homeError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHomeError(null)}
                    className="font-semibold underline ml-2 hover:opacity-80"
                  >
                    Dismiss
                  </button>
                </div>
              ) : null}

              <Form {...homeForm}>
                <form onSubmit={onHomeSubmit} noValidate className="space-y-6">
                  {/* Hero Copy */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Hero Copy & Typography
                    </h3>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={homeForm.control}
                        name="heroHeadline"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel className="text-xs font-medium">Headline</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Journey Beyond Horizons"
                                className="h-10 text-xs"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormDescription className="text-[11px]">
                              Primary H1 headline on the home page. Leave blank to use default marketing copy.
                            </FormDescription>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={homeForm.control}
                        name="heroSub"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel className="text-xs font-medium">Sub-headline</FormLabel>
                            <FormControl>
                              <Textarea
                                rows={3}
                                placeholder="Curated spiritual pilgrimages, luxury tours, and customized travel packages tailored for your peace of mind."
                                className="text-xs resize-none"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormDescription className="text-[11px]">
                              Lead paragraph below the headline. Also read by home page metadata description.
                            </FormDescription>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Hero Imagery */}
                  <div className="space-y-4 pt-2 border-t border-border/60">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Hero Imagery
                    </h3>

                    {/* Media note: hero imagery stays a URL text input (the
                        site-identity logo/favicon above use the MediaPicker). */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={homeForm.control}
                        name="heroImage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">Hero Image URL / Path</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://images.example/hero.jpg or /images/hero.jpg"
                                className="h-10 text-xs font-mono"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormDescription className="text-[11px]">
                              Full https:// URL or internal path. Leave blank to clear and use theme default.
                            </FormDescription>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={homeForm.control}
                        name="heroImageAlt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">Hero Image Alt Text</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Pilgrims at the Grand Mosque during golden hour"
                                className="h-10 text-xs"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormDescription className="text-[11px]">
                              Accessibility and screen-reader description for the hero image.
                            </FormDescription>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Primary Call-to-Action */}
                  <div className="space-y-4 pt-2 border-t border-border/60">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Call to Action (CTA) Button
                    </h3>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={homeForm.control}
                        name="heroButtonLabel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">Button Label</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Explore Packages"
                                className="h-10 text-xs"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormDescription className="text-[11px]">
                              Text displayed inside the primary hero CTA button.
                            </FormDescription>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={homeForm.control}
                        name="heroButtonLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">Button Destination Link</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="/packages or https://..."
                                className="h-10 text-xs font-mono"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormDescription className="text-[11px]">
                              Internal path (e.g. /packages) or external URL.
                            </FormDescription>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Featured Packages Section (homepage) */}
                  <div className="space-y-4 pt-2 border-t border-border/60">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Featured Packages Section
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={homeForm.control}
                        name="featuredKicker"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">Kicker</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Featured packages"
                                className="h-10 text-xs"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormDescription className="text-[11px]">
                              Small label above the featured section title.
                            </FormDescription>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={homeForm.control}
                        name="featuredTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">Section Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Hand-picked journeys"
                                className="h-10 text-xs"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={homeForm.control}
                      name="featuredLead"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium">Lead Paragraph</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="A short line under the section title"
                              className="h-10 text-xs"
                              value={field.value ?? ""}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Closing CTA Section (homepage) */}
                  <div className="space-y-4 pt-2 border-t border-border/60">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Closing Call-to-Action Section
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={homeForm.control}
                        name="ctaHeadline"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">Headline</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Let's plan your next journey"
                                className="h-10 text-xs"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={homeForm.control}
                      name="ctaSub"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium">Sub-headline</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="From Hajj and Umrah to family holidays and medical travel..."
                              className="min-h-20 text-xs"
                              value={field.value ?? ""}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Trust Stats */}
                  <div className="pt-2 border-t border-border/60">
                    <TrustStatsEditor stats={stats} onChange={setStats} />
                  </div>

                  {/* Testimonials Module Link */}
                  <div className="pt-2 border-t border-border/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <MessageSquareQuote className="size-4 text-primary" />
                          <h3 className="text-sm font-semibold text-foreground">
                            Customer Testimonials &amp; Reviews
                          </h3>
                          <Badge variant="secondary" className="text-[11px] font-normal">
                            New Module
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground max-w-xl">
                          Testimonials are now published as full records with photos, star ratings, package tags, and YouTube video reviews.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/admin/testimonials" as Route)}
                        className="h-9 gap-2 rounded-lg text-xs font-medium shrink-0 self-start sm:self-auto hover:bg-muted"
                      >
                        <span>Manage Testimonials</span>
                        <ExternalLink className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Submit actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/60">
                    <p className="text-[11px] text-muted-foreground font-mono">
                      Empty fields clear saved copy, allowing the marketing home page fallbacks to render.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={homeSaving}
                        onClick={() => homeForm.reset()}
                        className="min-h-[44px] text-xs"
                      >
                        <RotateCcw className="size-3.5 mr-1.5" aria-hidden="true" />
                        Reset
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={homeSaving}
                        className="min-h-[44px] text-xs font-semibold px-4"
                      >
                        {homeSaving ? (
                          <>
                            <Loader2 className="size-3.5 mr-2 animate-spin" aria-hidden="true" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="size-3.5 mr-2" aria-hidden="true" />
                            Save Home Settings
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <HomeVisibilityCard initial={initialHome} />
          <FooterSettingsCard initial={initialSite} />
        </TabsContent>

        {/* ==================================================================== */}
        {/* SEO & INDEXING                                                      */}
        {/* ==================================================================== */}
        <TabsContent value="seo" className="mt-4 space-y-6">
          <SeoIndexingCard initial={initialSite.searchEngineVisibility} />
          <Card className="shadow-xs border-border bg-card">
            <CardContent className="p-4 sm:p-6 text-xs text-muted-foreground space-y-1.5">
              <p>Off: robots.txt serves <span className="font-mono">Disallow: /</span>, sitemap.xml is empty, and every public page serves noindex.</p>
              <p>Admin, login, signup and account pages are always noindex regardless of this switch.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================================================================== */}
        {/* PAYMENTS & GATEWAYS                                                 */}
        {/* ==================================================================== */}
        {canManagePayments ? (
          <TabsContent value="payments" className="mt-4 space-y-6">
            <PaymentSettingsCard initial={initialPaymentSettings} />
          </TabsContent>
        ) : null}

        {/* ==================================================================== */}
        {/* EMAIL                                                               */}
        {/* ==================================================================== */}
        <TabsContent value="email" className="mt-4 space-y-6">
          <Card className="shadow-xs border-border bg-card">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">Email templates</p>
                <p className="text-xs text-muted-foreground">
                  Customer and staff notifications live under Email Templates.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="h-9 text-xs">
                <Link href="/admin/email-templates">Open Email Templates</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================================================================== */}
        {/* STORAGE                                                             */}
        {/* ==================================================================== */}
        <TabsContent value="storage" className="mt-4 space-y-6">
          <Card className="shadow-xs border-border bg-card">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">Media storage</p>
                <p className="text-xs text-muted-foreground">
                  Active driver: <span className="font-mono">{storageDriver}</span>. Manage uploads in the Media Library.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="h-9 text-xs">
                <Link href="/admin/media">Open Media Library</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================================================================== */}
        {/* DANGER ZONE                                                         */}
        {/* ==================================================================== */}
        <TabsContent value="danger" className="mt-4 space-y-6">
          <Card className="border-destructive/30 shadow-xs">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">Danger Zone</p>
                <p className="text-xs text-muted-foreground">
                  Wipe all content and re-initialize the database. Typed confirmation required.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="h-9 border-destructive/40 text-destructive hover:text-destructive">
                <Link href="/admin/reset">Open Reset &amp; Re-initialize</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
