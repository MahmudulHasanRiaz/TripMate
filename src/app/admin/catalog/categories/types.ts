import type { ServiceKind } from "@/modules/catalog/validation";

/**
 * Serialized category shape passed from the server page into client
 * components. Pure structural type (no server-only import) so client files can
 * reference it freely.
 */
export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  kind: ServiceKind;
  redirectUrl: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
};
