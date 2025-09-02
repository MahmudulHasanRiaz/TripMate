
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getEmbedUrl(url: string): string | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url);

    // YouTube
    if (urlObj.hostname.includes("youtube.com") || urlObj.hostname.includes("youtu.be")) {
      let videoId = urlObj.searchParams.get("v");
      if (urlObj.hostname.includes("youtu.be")) {
        videoId = urlObj.pathname.slice(1);
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    // Vimeo
    if (urlObj.hostname.includes("vimeo.com")) {
      const videoId = urlObj.pathname.split("/").pop();
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
    
    // Facebook videos are tricky and often don't work in simple iframes.
    // For now, we will return null for Facebook.
    if (urlObj.hostname.includes("facebook.com")) {
      // Basic support for fb.watch or facebook.com/watch links
      // This is not guaranteed to work due to Facebook's embedding policies.
      // A more robust solution requires their oEmbed API.
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&width=560`;
    }

  } catch (error) {
    console.error("Invalid URL for embedding:", error);
    return null;
  }

  return null; // Return null if no matching service is found
}

export function getInitials(name?: string | null): string {
    if (!name) return "U";
    const nameParts = name.trim().split(' ');
    if (nameParts.length > 1) {
        const firstInitial = nameParts[0].charAt(0);
        const lastInitial = nameParts[nameParts.length - 1].charAt(0);
        return `${firstInitial}${lastInitial}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}
