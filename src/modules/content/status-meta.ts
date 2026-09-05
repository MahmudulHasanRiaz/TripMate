import type { ContentStatus } from "./validation";

/**
 * Presentation metadata for content status. Pure data (no server-only import)
 * so both the server-rendered table and the client row actions agree on labels
 * and badge tones. Variant strings match the Badge component's variant set.
 */
export type BadgeTone =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "info";

export const CONTENT_STATUS_META: Record<
  ContentStatus,
  { label: string; variant: BadgeTone }
> = {
  draft: { label: "Draft", variant: "secondary" },
  published: { label: "Published", variant: "success" },
};
