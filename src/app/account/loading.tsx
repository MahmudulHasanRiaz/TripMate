import PlaneLoader from "@/components/PlaneLoader";

/**
 * Customer-portal loading fallback — the project's shared paper-plane
 * loader, in the active theme's branding colour.
 */
export default function AccountLoading() {
  return <PlaneLoader label="Loading your portal" className="min-h-[52vh]" />;
}
