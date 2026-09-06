import {
  Compass,
  FileCheck,
  HeartPulse,
  Moon,
  MoonStar,
  PlaneTakeoff,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Catalog icons are stored as strings (service_categories.icon). The map below
 * resolves the known seed values to lucide components; anything unrecognised
 * falls back to Compass rather than crashing on an unknown import. Extend this
 * map as the catalog gains categories — ServiceGrid tiles and the service
 * landing hero both read it, so icon treatment stays one source of truth.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  compass: Compass,
  "moon-star": MoonStar,
  moon: Moon,
  "heart-pulse": HeartPulse,
  "plane-takeoff": PlaneTakeoff,
  "file-check": FileCheck,
};

type ServiceIconProps = {
  /** lucide icon name stored on the category (seed: compass, moon-star, moon, …). */
  name: string | null;
  /** Size override — defaults to the `size-6` used by ServiceGrid tiles. */
  className?: string;
};

/**
 * The resolved category icon. Decorative (aria-hidden): the accessible name
 * always travels with the sibling text, never on the glyph.
 */
export function ServiceIcon({ name, className }: ServiceIconProps) {
  const Icon = (name && ICON_MAP[name]) || Compass;
  return <Icon className={cn("size-6", className)} aria-hidden="true" />;
}
