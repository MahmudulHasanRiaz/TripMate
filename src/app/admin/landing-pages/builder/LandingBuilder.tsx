"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Laptop,
  Loader2,
  Plus,
  Save,
  Send,
  Smartphone,
  Trash2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import type {
  LandingSection,
  SectionType,
  FormConfig,
  LandingFormField,
  LandingFormFieldType,
} from "@/modules/landing-pages/section-types";
import {
  CONTENT_FIELDS,
  LANDING_FORM_FIELD_TYPES,
} from "@/modules/landing-pages/section-types";
import type { LandingPage } from "@/modules/landing-pages/service";
import type { LandingPageStatus } from "@/modules/landing-pages/validation";
import { slugify } from "@/modules/landing-pages/validation";
import {
  autoFieldKey,
  isStandardNameKey,
  isStandardPhoneKey,
  isReservedFieldKey,
} from "@/lib/landing-helpers";
import { saveLandingPage } from "@/modules/landing-pages/actions";
import { LandingRenderer } from "@/components/landing/LandingRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type LandingBuilderProps = {
  initialData?: LandingPage | null;
};

const DEFAULT_SECTIONS: LandingSection[] = [
  {
    type: "hero",
    config: {
      headline: "Discover Sacred Journeys & Premium Travel",
      sub: "Curated Hajj, Umrah, and worldwide luxury packages with 5-star concierge service.",
      ctaLabel: "Inquire Now",
      ctaHref: "#lead-form-section",
    },
  },
  {
    type: "benefits",
    config: {
      items: [
        {
          title: "Direct Flights & 5-Star Stays",
          text: "Guaranteed premium airline routes and verified luxury hotels within walking distance of the Haramain.",
        },
        {
          title: "Dedicated Ground Concierge",
          text: "24/7 Bengali & English speaking guides to manage visas, transport, and private transfers.",
        },
        {
          title: "Transparent Fixed Pricing",
          text: "No hidden charges or surprise costs. Clear inclusions and immediate confirmation.",
        },
      ],
    },
  },
  {
    type: "form",
    config: {},
  },
];

const DEFAULT_FORM_CONFIG: FormConfig = {
  title: "Request Your Itinerary & Consultation",
  subtitle: "Leave your contact details and our travel specialist will reach out within 2 hours.",
  fields: [
    {
      key: "name",
      label: "Full Name",
      type: "text",
      required: true,
      placeholder: "e.g. Mahbubur Rahman",
    },
    {
      key: "phone",
      label: "Phone Number",
      type: "tel",
      required: true,
      placeholder: "+880 1712 345678",
    },
    {
      key: "email",
      label: "Email Address",
      type: "email",
      required: false,
      placeholder: "mahbub@example.com",
    },
    {
      key: "message",
      label: "Travel Details or Questions",
      type: "textarea",
      required: false,
      placeholder: "Specify destination, number of travelers, or travel dates...",
    },
  ],
};

function strVal(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function createDefaultConfigForType(type: SectionType): Record<string, unknown> {
  switch (type) {
    case "hero":
      return { headline: "New Campaign Headline", sub: "Add your supporting value proposition here." };
    case "benefits":
      return { items: [{ title: "Exclusive Benefit", text: "Highlight what makes this offer unique." }] };
    case "packageShowcase":
      return { listingIds: [] };
    case "gallery":
      return { images: [{ url: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800", alt: "Travel view" }] };
    case "testimonials":
      return { items: [{ quote: "TripMate delivered an unforgettable experience.", name: "Ahmed Khan", trip: "Umrah VIP 2026" }] };
    case "faq":
      return { items: [{ q: "What is included in this package?", a: "Flights, hotel accommodation, ground transportation, and dedicated guide support." }] };
    case "countdown":
      return { targetDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 19), label: "Offer Expires In" };
    case "stickyCta":
      return { text: "Book your consultation today", phone: "+880 1700 000000" };
    case "whatsappCta":
      return { text: "Need quick answers?", phone: "+880 1700 000000", prefill: "Hello TripMate, I would like more information on this offer." };
    case "form":
      return {};
    case "thankYou":
      return { message: "Thank you for reaching out! We have received your inquiry and will contact you shortly." };
  }
}

export default function LandingBuilder({ initialData }: LandingBuilderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Page state
  const [id] = useState<string | undefined>(initialData?.id);
  const [title, setTitle] = useState(initialData?.title || "Exclusive Travel Campaign");
  const [slug, setSlug] = useState(initialData?.slug || slugify(initialData?.title || "exclusive-travel-campaign"));
  const [status, setStatus] = useState<LandingPageStatus>(initialData?.status || "draft");
  const [fbContentId, setFbContentId] = useState(initialData?.fbContentId || "");
  const [seoTitle, setSeoTitle] = useState(initialData?.seo?.title || "");
  const [seoDescription, setSeoDescription] = useState(initialData?.seo?.description || "");

  // Builder state
  const [sections, setSections] = useState<LandingSection[]>(
    initialData?.sections && initialData.sections.length > 0
      ? (initialData.sections as LandingSection[])
      : DEFAULT_SECTIONS,
  );
  const [formConfig, setFormConfig] = useState<FormConfig>(
    initialData?.formConfig || DEFAULT_FORM_CONFIG,
  );
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const selectedSection = sections[selectedIndex];

  // Reorder sections
  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= sections.length) return;
    const next = [...sections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setSections(next);
    setSelectedIndex(to);
  };

  const removeSection = (index: number) => {
    if (sections.length <= 1) {
      setErrorBanner("A landing page needs at least one section.");
      return;
    }
    const next = sections.filter((_, i) => i !== index);
    setSections(next);
    setSelectedIndex(Math.max(0, index - 1));
  };

  const addSection = (type: SectionType) => {
    const newSection: LandingSection = {
      type,
      config: createDefaultConfigForType(type),
    } as LandingSection;
    const next = [...sections, newSection];
    setSections(next);
    setSelectedIndex(next.length - 1);
  };

  // Update selected section config
  const updateSelectedConfig = (key: string, value: unknown) => {
    if (!selectedSection) return;
    const nextConfig = { ...(selectedSection.config as Record<string, unknown>), [key]: value };
    const nextSections = [...sections];
    nextSections[selectedIndex] = {
      ...selectedSection,
      config: nextConfig,
    } as LandingSection;
    setSections(nextSections);
  };

  // Save handler
  const handleSave = (targetStatus?: LandingPageStatus) => {
    setErrorBanner(null);
    setSaveNotice(null);

    const savingStatus = targetStatus ?? status;

    // Check reachability if page has a form section
    const hasForm = sections.some((s) => s.type === "form");
    if (hasForm) {
      const reachable = formConfig.fields.some((f) => f.type === "email" || f.type === "tel");
      if (!reachable) {
        setErrorBanner("Form requires at least one email or phone field so visitors can be reached.");
        return;
      }
    }

    startTransition(async () => {
      try {
        const payload = {
          id: id || undefined,
          title: title.trim(),
          slug: slug.trim(),
          status: savingStatus,
          sections,
          formConfig: hasForm ? formConfig : null,
          seo: {
            title: seoTitle.trim() || undefined,
            description: seoDescription.trim() || undefined,
          },
          fbContentId: fbContentId.trim() || null,
        };

        const result = await saveLandingPage(payload);
        if (result.ok) {
          setStatus(savingStatus);
          setSaveNotice(`Saved successfully as ${savingStatus}!`);
          setTimeout(() => setSaveNotice(null), 3000);
          if (!id && result.data?.id) {
            router.push(`/admin/landing-pages/${result.data.id}/edit` as Route);
          } else {
            router.refresh();
          }
        } else {
          setErrorBanner(result.error || "Failed to save landing page");
        }
      } catch (err) {
        console.error("[LandingBuilder] Save error", err);
        setErrorBanner("An unexpected error occurred while saving.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Header & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="size-9">
            <Link href={"/admin/landing-pages" as Route}>
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
          </Button>

          <div className="flex flex-col">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Landing Page Title"
              className="font-semibold text-foreground text-lg bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded px-1"
            />
            <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground font-mono">
              <span>/l/{slug}</span>
              <span className="text-border">•</span>
              <Badge variant={status === "published" ? "success" : "secondary"} className="text-[10px] h-4">
                {status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Viewport switch & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Device toggle */}
          <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => setPreviewDevice("desktop")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                previewDevice === "desktop" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Laptop className="size-3.5" aria-hidden="true" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice("mobile")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                previewDevice === "mobile" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Smartphone className="size-3.5" aria-hidden="true" />
              Mobile
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="h-9 text-xs"
          >
            Page Settings
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => handleSave("draft")}
            className="h-9 text-xs"
          >
            <Save className="mr-1.5 size-3.5" aria-hidden="true" />
            Save Draft
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() => handleSave("published")}
            className="h-9 text-xs font-semibold"
          >
            {isPending ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="mr-1.5 size-3.5" aria-hidden="true" />
            )}
            {status === "published" ? "Save & Update" : "Publish Page"}
          </Button>
        </div>
      </div>

      {/* Notifications & Error banner */}
      {errorBanner ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <span>{errorBanner}</span>
        </div>
      ) : null}

      {saveNotice ? (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
          <Check className="size-4 shrink-0" aria-hidden="true" />
          <span>{saveNotice}</span>
        </div>
      ) : null}

      {/* Page Settings Collapsible */}
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <CollapsibleContent className="rounded-xl border border-border bg-card p-5 shadow-sm mb-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="page-slug" className="text-xs font-medium">URL Slug (/l/[slug])</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  id="page-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="h-9 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSlug(slugify(title))}
                  className="h-9 text-xs shrink-0"
                >
                  Regenerate
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="fb-content-id" className="text-xs font-medium">Meta FB Content ID</Label>
              <Input
                id="fb-content-id"
                value={fbContentId}
                onChange={(e) => setFbContentId(e.target.value)}
                placeholder="e.g. hajj_offer_2026"
                className="mt-1 h-9 font-mono text-xs"
              />
            </div>

            <div>
              <Label htmlFor="seo-title" className="text-xs font-medium">SEO Title (max 70 chars)</Label>
              <Input
                id="seo-title"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Search engine title..."
                maxLength={70}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <Label htmlFor="seo-desc" className="text-xs font-medium">SEO Description (max 160 chars)</Label>
              <Input
                id="seo-desc"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Search engine summary..."
                maxLength={160}
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* 3-Column Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Rail: Section List (3 cols) */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sections ({sections.length})
            </h3>

            {/* Add Section Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[11px] text-muted-foreground">Core</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => addSection("hero")}>Hero Section</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSection("benefits")}>Benefits Grid</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSection("form")}>Lead Form Island</DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[11px] text-muted-foreground">Content</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => addSection("packageShowcase")}>Package Showcase</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSection("gallery")}>Image Gallery</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSection("testimonials")}>Testimonials</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSection("faq")}>FAQ Accordion</DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[11px] text-muted-foreground">Conversion</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => addSection("countdown")}>Countdown Urgency</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSection("stickyCta")}>Sticky Phone CTA</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSection("whatsappCta")}>WhatsApp Deep Link</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSection("thankYou")}>Thank You Card</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Ordered Section Chips */}
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {sections.map((section, idx) => {
              const isSelected = idx === selectedIndex;
              const cfg = section.config as Record<string, unknown>;
              let labelToken = "";
              if (section.type === "hero") labelToken = typeof cfg.headline === "string" ? cfg.headline : "";
              else if (section.type === "benefits") labelToken = `${Array.isArray(cfg.items) ? cfg.items.length : 0} items`;
              else if (section.type === "countdown") labelToken = typeof cfg.label === "string" ? cfg.label : "";
              else if (section.type === "whatsappCta") labelToken = "WhatsApp";
              else if (section.type === "stickyCta") labelToken = "Sticky Phone";
              else if (section.type === "form") labelToken = "Lead Form";

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg border p-2.5 text-xs transition-all cursor-pointer select-none",
                    isSelected
                      ? "border-primary bg-primary/5 font-semibold text-foreground shadow-xs"
                      : "border-border/60 hover:border-border hover:bg-muted/40 text-muted-foreground",
                  )}
                >
                  <div className="min-w-0 flex-1 truncate">
                    <span className="capitalize text-foreground">{section.type}</span>
                    {labelToken ? (
                      <span className="ml-1.5 text-[11px] font-normal text-muted-foreground truncate">
                        — {labelToken}
                      </span>
                    ) : null}
                  </div>

                  {/* Section Controls */}
                  <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={idx === 0}
                      onClick={() => moveSection(idx, idx - 1)}
                      className="size-6 text-muted-foreground hover:text-foreground"
                    >
                      <ChevronUp className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={idx === sections.length - 1}
                      onClick={() => moveSection(idx, idx + 1)}
                      className="size-6 text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSection(idx)}
                      className="size-6 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Canvas: Live Preview (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-border bg-card p-3 shadow-sm flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-2 border-b border-border/60 text-xs text-muted-foreground">
            <span className="font-medium">Live Canvas Preview</span>
            <span className="font-mono text-[11px]">{previewDevice === "mobile" ? "375px viewport" : "Responsive 100%"}</span>
          </div>

          <div
            className={cn(
              "w-full overflow-hidden transition-all duration-300 mt-3 rounded-lg border border-border/80 bg-background shadow-xs",
              previewDevice === "mobile" ? "max-w-[375px]" : "max-w-full",
            )}
            style={{ maxHeight: "720px", overflowY: "auto" }}
          >
            <LandingRenderer
              sections={sections}
              formConfig={formConfig}
              landingSlug={slug}
              mode="preview"
            />
          </div>
        </div>

        {/* Right Panel: Section Config Form (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Configuring: <span className="text-foreground capitalize">{selectedSection?.type}</span>
              </h3>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase font-mono">
              Section #{selectedIndex + 1}
            </Badge>
          </div>

          {!selectedSection ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Select a section to edit its configuration.</p>
          ) : selectedSection.type === "form" ? (
            /* Special Form & Field Builder */
            <div className="space-y-4 text-xs">
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-2.5 text-primary text-[11px] flex items-start gap-2">
                <HelpCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>Lead Form Guarantee:</strong> Keep at least one phone or email field so inquiries are reachable. Standard keys (<code className="font-mono">name</code>, <code className="font-mono">phone</code>) ensure clean board presentation.
                </span>
              </div>

              <div>
                <Label className="text-xs">Form Title</Label>
                <Input
                  value={formConfig.title || ""}
                  onChange={(e) => setFormConfig({ ...formConfig, title: e.target.value })}
                  placeholder="Inquiry Form Title"
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Form Subtitle</Label>
                <Input
                  value={formConfig.subtitle || ""}
                  onChange={(e) => setFormConfig({ ...formConfig, subtitle: e.target.value })}
                  placeholder="Form subtitle or instructions"
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground">Form Fields ({formConfig.fields.length}/6)</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={formConfig.fields.length >= 6}
                    onClick={() => {
                      const newField: LandingFormField = {
                        key: `field_${Date.now()}`,
                        label: "New Field",
                        type: "text",
                        required: false,
                        placeholder: "",
                      };
                      setFormConfig({ ...formConfig, fields: [...formConfig.fields, newField] });
                    }}
                    className="h-7 px-2 text-[11px]"
                  >
                    <Plus className="size-3 mr-1" aria-hidden="true" />
                    Add Field
                  </Button>
                </div>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {formConfig.fields.map((field, fIdx) => {
                    const isNameKey = isStandardNameKey(field.key);
                    const isPhoneKey = isStandardPhoneKey(field.key);
                    const isHoneypot = isReservedFieldKey(field.key);

                    return (
                      <div key={fIdx} className="rounded-lg border border-border/80 bg-secondary/30 p-3 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <Input
                            value={field.label}
                            onChange={(e) => {
                              const newLabel = e.target.value;
                              const updatedFields = [...formConfig.fields];
                              const newKey = autoFieldKey(newLabel);
                              updatedFields[fIdx] = {
                                ...field,
                                label: newLabel,
                                key: isHoneypot ? field.key : newKey,
                              };
                              setFormConfig({ ...formConfig, fields: updatedFields });
                            }}
                            placeholder="Field Label"
                            className="h-7 text-xs font-medium"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated = formConfig.fields.filter((_, i) => i !== fIdx);
                              setFormConfig({ ...formConfig, fields: updated });
                            }}
                            className="size-7 text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Stored Key</Label>
                            <Input
                              value={field.key}
                              onChange={(e) => {
                                const k = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
                                const updated = [...formConfig.fields];
                                updated[fIdx] = { ...field, key: k };
                                setFormConfig({ ...formConfig, fields: updated });
                              }}
                              className={cn(
                                "h-7 text-[11px] font-mono",
                                isHoneypot && "border-destructive text-destructive",
                              )}
                            />
                          </div>

                          <div>
                            <Label className="text-[10px] text-muted-foreground">Type</Label>
                            <Select
                              value={field.type}
                              onValueChange={(val: LandingFormFieldType) => {
                                const updated = [...formConfig.fields];
                                updated[fIdx] = {
                                  ...field,
                                  type: val,
                                  options: val === "select" ? (field.options || ["Option 1", "Option 2"]) : undefined,
                                };
                                setFormConfig({ ...formConfig, fields: updated });
                              }}
                            >
                              <SelectTrigger className="h-7 text-[11px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {LANDING_FORM_FIELD_TYPES.map((t) => (
                                  <SelectItem key={t} value={t} className="text-xs">
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Special auto-slugging helper tags (User revision 4) */}
                        {isNameKey ? (
                          <p className="text-[10px] text-success font-medium flex items-center gap-1">
                            <Check className="size-3" aria-hidden="true" />
                            Uses standard key for lead inbox name capture
                          </p>
                        ) : isPhoneKey ? (
                          <p className="text-[10px] text-success font-medium flex items-center gap-1">
                            <Check className="size-3" aria-hidden="true" />
                            Uses standard key for lead inbox phone capture
                          </p>
                        ) : null}

                        {isHoneypot ? (
                          <p className="text-[10px] text-destructive font-medium">
                            &quot;company_website&quot; is reserved by the bot-filter. Please choose another key.
                          </p>
                        ) : null}

                        {/* Options editor for select */}
                        {field.type === "select" ? (
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Options (comma-separated)</Label>
                            <Input
                              value={(field.options || []).join(", ")}
                              onChange={(e) => {
                                const opts = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                                const updated = [...formConfig.fields];
                                updated[fIdx] = { ...field, options: opts };
                                setFormConfig({ ...formConfig, fields: updated });
                              }}
                              placeholder="e.g. Dhaka, Chittagong, Sylhet"
                              className="h-7 text-xs"
                            />
                          </div>
                        ) : null}

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`req-${fIdx}`}
                              checked={field.required}
                              onCheckedChange={(checked) => {
                                const updated = [...formConfig.fields];
                                updated[fIdx] = { ...field, required: checked };
                                setFormConfig({ ...formConfig, fields: updated });
                              }}
                            />
                            <Label htmlFor={`req-${fIdx}`} className="text-[11px] cursor-pointer">
                              Required
                            </Label>
                          </div>

                          <Input
                            value={field.placeholder || ""}
                            onChange={(e) => {
                              const updated = [...formConfig.fields];
                              updated[fIdx] = { ...field, placeholder: e.target.value };
                              setFormConfig({ ...formConfig, fields: updated });
                            }}
                            placeholder="Placeholder text..."
                            className="h-6 w-36 text-[10px]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* General Dynamic Form generated from CONTENT_FIELDS */
            <div className="space-y-3.5 text-xs">
              {(CONTENT_FIELDS[selectedSection.type] || []).map((fieldDef) => {
                const cfg = selectedSection.config as Record<string, unknown>;
                const val = cfg[fieldDef.key];

                if (fieldDef.kind === "text") {
                  return (
                    <div key={fieldDef.key}>
                      <Label className="text-xs">{fieldDef.label}</Label>
                      <Input
                        value={typeof val === "string" ? val : ""}
                        onChange={(e) => updateSelectedConfig(fieldDef.key, e.target.value)}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                  );
                }

                if (fieldDef.kind === "textarea") {
                  return (
                    <div key={fieldDef.key}>
                      <Label className="text-xs">{fieldDef.label}</Label>
                      <Textarea
                        value={typeof val === "string" ? val : ""}
                        onChange={(e) => updateSelectedConfig(fieldDef.key, e.target.value)}
                        rows={3}
                        className="mt-1 text-xs resize-none"
                      />
                    </div>
                  );
                }

                if (fieldDef.kind === "image") {
                  return (
                    <div key={fieldDef.key}>
                      <Label className="text-xs">{fieldDef.label}</Label>
                      <Input
                        value={typeof val === "string" ? val : ""}
                        onChange={(e) => updateSelectedConfig(fieldDef.key, e.target.value)}
                        placeholder="https://..."
                        className="mt-1 h-8 text-xs"
                      />
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Attach via Media Library URL or external image link.
                      </p>
                    </div>
                  );
                }

                if (fieldDef.kind === "repeatable") {
                  const items: Record<string, unknown>[] = Array.isArray(val)
                    ? (val as Record<string, unknown>[])
                    : [];

                  return (
                    <div key={fieldDef.key} className="space-y-2 border-t border-border pt-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">{fieldDef.label} ({items.length})</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            let newItem: Record<string, unknown> = {};
                            if (selectedSection.type === "benefits") newItem = { title: "Benefit Title", text: "Benefit Description" };
                            else if (selectedSection.type === "gallery") newItem = { url: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800", alt: "Travel photo" };
                            else if (selectedSection.type === "testimonials") newItem = { quote: "Great journey.", name: "Traveler", trip: "Umrah" };
                            else if (selectedSection.type === "faq") newItem = { q: "Question?", a: "Answer details." };
                            updateSelectedConfig(fieldDef.key, [...items, newItem]);
                          }}
                          className="h-6 px-2 text-[10px]"
                        >
                          <Plus className="size-3 mr-1" aria-hidden="true" />
                          Add
                        </Button>
                      </div>

                      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                        {items.map((item, itIdx) => (
                          <div key={itIdx} className="rounded-lg border border-border/80 bg-secondary/20 p-2.5 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-semibold text-muted-foreground">Item #{itIdx + 1}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const filtered = items.filter((_, i) => i !== itIdx);
                                  updateSelectedConfig(fieldDef.key, filtered);
                                }}
                                className="size-5 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-3" aria-hidden="true" />
                              </Button>
                            </div>

                            {/* Render fields based on item shape */}
                            {selectedSection.type === "benefits" ? (
                              <>
                                <Input
                                  value={strVal(item.title)}
                                  onChange={(e) => {
                                    const next = [...items];
                                    next[itIdx] = { ...item, title: e.target.value };
                                    updateSelectedConfig(fieldDef.key, next);
                                  }}
                                  placeholder="Title"
                                  className="h-7 text-xs"
                                />
                                <Textarea
                                  value={strVal(item.text)}
                                  onChange={(e) => {
                                    const next = [...items];
                                    next[itIdx] = { ...item, text: e.target.value };
                                    updateSelectedConfig(fieldDef.key, next);
                                  }}
                                  placeholder="Description"
                                  rows={2}
                                  className="text-xs resize-none"
                                />
                              </>
                            ) : selectedSection.type === "gallery" ? (
                              <>
                                <Input
                                  value={strVal(item.url)}
                                  onChange={(e) => {
                                    const next = [...items];
                                    next[itIdx] = { ...item, url: e.target.value };
                                    updateSelectedConfig(fieldDef.key, next);
                                  }}
                                  placeholder="Image URL"
                                  className="h-7 text-xs"
                                />
                                <Input
                                  value={strVal(item.alt)}
                                  onChange={(e) => {
                                    const next = [...items];
                                    next[itIdx] = { ...item, alt: e.target.value };
                                    updateSelectedConfig(fieldDef.key, next);
                                  }}
                                  placeholder="Alt Text"
                                  className="h-7 text-xs"
                                />
                              </>
                            ) : selectedSection.type === "testimonials" ? (
                              <>
                                <Textarea
                                  value={strVal(item.quote)}
                                  onChange={(e) => {
                                    const next = [...items];
                                    next[itIdx] = { ...item, quote: e.target.value };
                                    updateSelectedConfig(fieldDef.key, next);
                                  }}
                                  placeholder="Quote"
                                  rows={2}
                                  className="text-xs resize-none"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    value={strVal(item.name)}
                                    onChange={(e) => {
                                      const next = [...items];
                                      next[itIdx] = { ...item, name: e.target.value };
                                      updateSelectedConfig(fieldDef.key, next);
                                    }}
                                    placeholder="Name"
                                    className="h-7 text-xs"
                                  />
                                  <Input
                                    value={strVal(item.trip)}
                                    onChange={(e) => {
                                      const next = [...items];
                                      next[itIdx] = { ...item, trip: e.target.value };
                                      updateSelectedConfig(fieldDef.key, next);
                                    }}
                                    placeholder="Trip Tag"
                                    className="h-7 text-xs"
                                  />
                                </div>
                              </>
                            ) : selectedSection.type === "faq" ? (
                              <>
                                <Input
                                  value={strVal(item.q)}
                                  onChange={(e) => {
                                    const next = [...items];
                                    next[itIdx] = { ...item, q: e.target.value };
                                    updateSelectedConfig(fieldDef.key, next);
                                  }}
                                  placeholder="Question"
                                  className="h-7 text-xs font-medium"
                                />
                                <Textarea
                                  value={strVal(item.a)}
                                  onChange={(e) => {
                                    const next = [...items];
                                    next[itIdx] = { ...item, a: e.target.value };
                                    updateSelectedConfig(fieldDef.key, next);
                                  }}
                                  placeholder="Answer"
                                  rows={2}
                                  className="text-xs resize-none"
                                />
                              </>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
