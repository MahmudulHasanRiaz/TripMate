/**
 * Serialized destination shape passed from the server page into client
 * components. Pure structural type (no server-only import) so client files can
 * reference it freely.
 */
export type DestinationRow = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  description?: string | null;
  sortOrder?: number;
  isFeatured?: boolean;
  isActive: boolean;
  seo?: { title?: string | null; description?: string | null } | null;
};
