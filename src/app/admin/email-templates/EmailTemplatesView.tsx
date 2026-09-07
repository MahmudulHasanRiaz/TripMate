"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  Code2,
  Eye,
  Info,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import type { EmailTemplateSummary } from "@/modules/email/admin";
import { previewEmailTemplateAction } from "@/modules/email/admin-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EmailTemplatesViewProps = {
  templates: EmailTemplateSummary[];
};

export default function EmailTemplatesView({ templates }: EmailTemplatesViewProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateSummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Preview state
  const [previewSubject, setPreviewSubject] = useState<string>("");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewLoading, startPreviewTransition] = useTransition();
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Overrides state (string values for inputs)
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const handleOpenPreview = (template: EmailTemplateSummary) => {
    setSelectedTemplate(template);
    setOverrides({});
    setPreviewError(null);
    setPreviewSubject("");
    setPreviewHtml("");
    setDialogOpen(true);

    startPreviewTransition(async () => {
      try {
        const res = await previewEmailTemplateAction({ id: template.id });
        if (res.ok) {
          setPreviewSubject(res.data.subject);
          setPreviewHtml(res.data.html);
        } else {
          setPreviewError(res.error || "Failed to render template preview.");
        }
      } catch {
        setPreviewError("An unexpected error occurred while fetching template preview.");
      }
    });
  };

  const handleUpdateOverrides = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTemplate) return;

    setPreviewError(null);
    // Filter out empty override strings so undefined/defaults take effect or pass nonempty
    const cleanedOverrides: Record<string, string> = {};
    for (const [k, v] of Object.entries(overrides)) {
      if (v !== "") {
        cleanedOverrides[k] = v;
      }
    }

    startPreviewTransition(async () => {
      try {
        const res = await previewEmailTemplateAction({
          id: selectedTemplate.id,
          overrides: cleanedOverrides,
        });
        if (res.ok) {
          setPreviewSubject(res.data.subject);
          setPreviewHtml(res.data.html);
        } else {
          setPreviewError(res.error || "Failed to render template preview.");
        }
      } catch {
        setPreviewError("An unexpected error occurred while rendering template preview.");
      }
    });
  };

  const handleResetOverrides = () => {
    if (!selectedTemplate) return;
    setOverrides({});
    setPreviewError(null);

    startPreviewTransition(async () => {
      try {
        const res = await previewEmailTemplateAction({ id: selectedTemplate.id });
        if (res.ok) {
          setPreviewSubject(res.data.subject);
          setPreviewHtml(res.data.html);
        } else {
          setPreviewError(res.error || "Failed to render template preview.");
        }
      } catch {
        setPreviewError("An unexpected error occurred while fetching template preview.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Code-owned governance notice */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-4 text-xs">
        <Info className="size-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            Templates are code-owned — preview only.
          </p>
          <p className="text-muted-foreground">
            Transactional email templates are defined in code (<code className="font-mono text-[11px] text-foreground">src/modules/email/templates/</code>) to guarantee type safety and transactional reliability. Use this registry to preview formatting, verify dynamic merge variables, and test email layouts.
          </p>
        </div>
      </div>

      {/* 6 Templates Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => {
          const isCustomer = template.audience === "customer";

          return (
            <Card
              key={template.id}
              className="shadow-xs border-border bg-card flex flex-col justify-between hover:border-primary/40 transition-colors"
            >
              <CardHeader className="p-4 pb-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant={isCustomer ? "secondary" : "info"}
                    className="text-[10px] uppercase tracking-wider font-semibold gap-1 px-2 py-0.5"
                  >
                    {isCustomer ? (
                      <User className="size-2.5" aria-hidden="true" />
                    ) : (
                      <Users className="size-2.5" aria-hidden="true" />
                    )}
                    <span>{template.audience}</span>
                  </Badge>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {template.id}
                  </span>
                </div>
                <CardTitle className="text-sm font-semibold tracking-tight text-foreground line-clamp-1">
                  {template.name}
                </CardTitle>
                <CardDescription className="text-xs line-clamp-2 min-h-[32px]">
                  {template.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Parameters ({template.params.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {template.params.map((param) => (
                      <span
                        key={param.key}
                        className="font-mono text-[10px] bg-secondary/80 text-secondary-foreground px-1.5 py-0.5 rounded-sm"
                      >
                        {param.key}
                      </span>
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenPreview(template)}
                  className="w-full min-h-[44px] text-xs font-medium gap-1.5"
                >
                  <Eye className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  <span>Preview Template</span>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-border bg-card">
          <DialogHeader className="p-4 pb-3 border-b border-border/60 bg-secondary/20 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base font-semibold text-foreground">
                    {selectedTemplate?.name}
                  </DialogTitle>
                  <Badge
                    variant={selectedTemplate?.audience === "customer" ? "secondary" : "info"}
                    className="text-[10px] uppercase font-mono px-1.5 py-0"
                  >
                    {selectedTemplate?.audience}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground line-clamp-1">
                  {selectedTemplate?.description}
                </DialogDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {selectedTemplate?.id}
              </Badge>
            </div>

            {/* Subject line strip */}
            <div className="mt-3 flex items-center gap-2 rounded-md bg-background px-3 py-2 border border-border">
              <span className="text-xs font-semibold text-muted-foreground shrink-0">Subject:</span>
              <p className="font-mono text-xs font-semibold text-foreground truncate">
                {previewLoading && !previewSubject ? (
                  <span className="text-muted-foreground italic font-sans">Generating preview...</span>
                ) : (
                  previewSubject || "—"
                )}
              </p>
            </div>
          </DialogHeader>

          {/* Dialog Body: Split layout (Preview on Left, Overrides on Right) */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-0">
            {/* HTML Preview Frame */}
            <div className="md:col-span-7 lg:col-span-8 p-4 flex flex-col gap-2 bg-muted/10 border-b md:border-b-0 md:border-r border-border/60">
              <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                <span className="font-medium flex items-center gap-1.5">
                  <Code2 className="size-3.5" aria-hidden="true" />
                  Sandboxed HTML Output
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  sandbox=&quot;&quot; (inert, scripts disabled)
                </span>
              </div>

              {previewError ? (
                <div
                  role="alert"
                  aria-live="polite"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2"
                >
                  <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="font-semibold">Failed to render preview</p>
                    <p className="font-mono text-[11px]">{previewError}</p>
                  </div>
                </div>
              ) : null}

              <div className="relative flex-1 min-h-[380px] rounded-lg border border-border bg-white overflow-hidden shadow-inner">
                {previewLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-xs">
                    <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 border border-border shadow-md text-xs font-medium">
                      <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
                      <span>Rendering template...</span>
                    </div>
                  </div>
                )}
                <iframe
                  srcDoc={previewHtml}
                  sandbox=""
                  title={`Email preview for ${selectedTemplate?.name}`}
                  className="w-full h-full min-h-[380px] border-0"
                />
              </div>
            </div>

            {/* Overrides Mini-Form */}
            <div className="md:col-span-5 lg:col-span-4 p-4 flex flex-col justify-between bg-card space-y-4">
              <div className="space-y-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
                    <span>Variable Overrides</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Test layout rendering with custom names, links, and prices.
                  </p>
                </div>

                <form id="overrides-form" onSubmit={handleUpdateOverrides} className="space-y-3 pt-1">
                  {selectedTemplate?.params.map((param) => (
                    <div key={param.key} className="space-y-1">
                      <Label
                        htmlFor={`param-${param.key}`}
                        className="text-xs font-mono font-medium flex items-center justify-between"
                      >
                        <span>{param.key}</span>
                        <span className="text-[10px] text-muted-foreground font-sans font-normal">
                          {param.type}
                        </span>
                      </Label>
                      <Input
                        id={`param-${param.key}`}
                        placeholder={`Override ${param.key}...`}
                        value={overrides[param.key] ?? ""}
                        onChange={(e) =>
                          setOverrides((prev) => ({
                            ...prev,
                            [param.key]: e.target.value,
                          }))
                        }
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  ))}
                </form>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-3 border-t border-border/60">
                <Button
                  type="submit"
                  form="overrides-form"
                  disabled={previewLoading}
                  className="w-full min-h-[44px] text-xs font-semibold gap-1.5"
                >
                  {previewLoading ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="size-3.5" aria-hidden="true" />
                  )}
                  <span>Update Preview</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={previewLoading}
                  onClick={handleResetOverrides}
                  className="w-full min-h-[44px] text-xs gap-1.5"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  <span>Reset to Sample Defaults</span>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
