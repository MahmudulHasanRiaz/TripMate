import PlaneLoader from "@/components/PlaneLoader";

/**
 * Root-level loading fallback — covers the routes that live outside the
 * (public) and admin shells (sign-in and other top-level pages) with the
 * project's shared paper-plane loader, full-screen.
 */
export default function RootLoading() {
  return <PlaneLoader label="Loading" fullScreen />;
}
