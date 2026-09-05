/**
 * Serialized post-category shape passed from the server page into client
 * components. Pure structural type (no server-only import) so client files can
 * reference it freely.
 */
export type PostCategoryRow = {
  id: string;
  name: string;
  slug: string;
};
