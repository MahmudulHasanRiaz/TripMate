/** Serializable media-library item passed from the server page to client cards. */
export type MediaItem = {
  id: string;
  name: string;
  url: string;
  mime: string;
  /** bytes */
  size: number;
  alt: string | null;
  /** ISO timestamp of the upload (detail dialog's "Uploaded" row). */
  createdAt: string;
};
