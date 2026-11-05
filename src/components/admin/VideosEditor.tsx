"use client";

/**
 * VideosEditor — the ONE shared controlled editor for an entity's `videos`
 * array (FU-35): listings, posts and destinations all edit their videos here
 * so the row language stays identical everywhere.
 *
 * Plain controlled component (value + onChange) so it drops into a
 * react-hook-form FormField (field.value / field.onChange) just as easily as
 * a useState dialog. Rows are NOT trimmed or filtered here — blank rows are
 * the caller's payload-mapping concern, same as the gallery editors.
 *
 * The URL cell offers the media-library picker (accept="any") like every
 * other media field: a video is usually a YouTube/Vimeo link typed by hand,
 * but any library file an operator picks lands in the same URL cell.
 */
import { Plus, X } from "lucide-react";

import { MAX_VIDEOS, type VideoEntry } from "@/lib/videos";
import { MediaPickerButton } from "@/components/admin/MediaPickerField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function VideosEditor({
  value,
  onChange,
  label = "Videos",
}: {
  value: VideoEntry[];
  onChange: (next: VideoEntry[]) => void;
  label?: string;
}) {
  const atCap = value.length >= MAX_VIDEOS;

  const update = (index: number, patch: Partial<VideoEntry>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label>{label}</Label>
          <p className="text-sm text-muted-foreground">
            YouTube, Vimeo or a direct video file (MP4/WebM) — paste a link or
            pick from the media library.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={atCap}
          onClick={() => onChange([...value, { url: "", title: "" }])}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add video
        </Button>
      </div>
      {atCap ? (
        <p className="text-sm text-muted-foreground">
          Maximum {MAX_VIDEOS} videos
        </p>
      ) : null}
      <ul className="space-y-3">
        {value.map((video, index) => (
          <li key={index} className="rounded-md border border-border p-3">
            <div className="flex items-start gap-2">
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                <div className="flex items-start gap-1 sm:col-span-2">
                  <Input
                    className="flex-1"
                    placeholder="https://www.youtube.com/watch?v=…"
                    aria-label={`Video ${index + 1} URL`}
                    value={video.url}
                    onChange={(e) => update(index, { url: e.target.value })}
                  />
                  <MediaPickerButton
                    accept="any"
                    label={`Browse media for video ${index + 1}`}
                    onPick={(url) => update(index, { url })}
                  />
                </div>
                <Input
                  placeholder="Title (optional)"
                  aria-label={`Video ${index + 1} title`}
                  value={video.title}
                  onChange={(e) => update(index, { title: e.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                aria-label={`Remove video ${index + 1}`}
                className="mt-1 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">No videos yet.</p>
      ) : null}
    </div>
  );
}
