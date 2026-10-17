import { z } from "zod";

/** Extract YouTube Video ID from any standard YouTube URL */
export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/,
  );
  return match ? match[1] : null;
}

/** Get YouTube video thumbnail URL */
export function getYouTubeThumbnailUrl(url: string | null | undefined): string | null {
  const id = extractYouTubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export const testimonialInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  tripLabel: z.string().trim().max(100, "Trip label too long").nullable().optional(),
  packageId: z.string().uuid("Invalid package ID").nullable().optional(),
  quote: z.string().trim().min(5, "Quote must be at least 5 characters").max(1500, "Quote too long"),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  photoUrl: z.string().trim().nullable().optional(),
  videoUrl: z
    .string()
    .trim()
    .refine(
      (val) => !val || extractYouTubeVideoId(val) !== null,
      "Please enter a valid YouTube video URL (e.g. https://www.youtube.com/watch?v=...)",
    )
    .nullable()
    .optional(),
  galleryUrls: z.array(z.string().trim()).default([]).optional(),
  featured: z.boolean().default(false),
  isPublished: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export type TestimonialInput = z.infer<typeof testimonialInputSchema>;
