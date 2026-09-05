import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="font-display text-6xl font-bold">404</h1>
      <p className="text-muted-foreground">This page wandered off the itinerary.</p>
      <Link href="/" className="text-primary underline underline-offset-4">
        Back to home
      </Link>
    </main>
  );
}
