import type { Metadata } from "next";
import { requireSession } from "@/lib/auth-helpers";
import { myDocuments } from "@/modules/portal/service";
import PortalDocumentsClient from "./PortalDocumentsClient";

export const metadata: Metadata = {
  title: "My Documents · TripMate",
};

export const instant = false;

type SearchParams = {
  page?: string;
};

export default async function CustomerDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const page = /^\d+$/.test(sp.page ?? "") ? Math.max(1, Number(sp.page)) : 1;

  const perPage = 12;
  const paginated = await myDocuments(session.user.id, { page, perPage });
  const totalPages = Math.max(1, Math.ceil(paginated.total / perPage));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Documents</h1>
        <p className="text-sm text-muted-foreground">
          Upload and manage your passports, national IDs, visa copies, and travel documents securely.
        </p>
      </div>

      <PortalDocumentsClient
        items={paginated.items}
        total={paginated.total}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
