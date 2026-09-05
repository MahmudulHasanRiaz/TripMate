/** Serializable media-library item passed from the server page to client cards. */
export type MediaItem = {
  id: string;
  name: string;
  url: string;
  mime: string;
  /** bytes */
  size: number;
  alt: string | null;
};
