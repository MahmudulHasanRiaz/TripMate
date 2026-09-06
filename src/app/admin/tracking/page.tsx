import type { Metadata } from "next";
import { getMetaConfigStatus } from "@/modules/tracking/actions";
import {
  getTrackingEventCounts,
  listTrackingEvents,
} from "@/modules/tracking/service";
import TrackingClient from "./TrackingClient";

export const metadata: Metadata = { title: "Tracking & Meta CAPI · TripMate Admin" };
export const instant = false;

type SearchParams = {
  eventName?: string;
  capiStatus?: string;
  search?: string;
  page?: string;
};

const PER_PAGE = 25;

export default async function TrackingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const eventName = typeof sp.eventName === "string" ? sp.eventName.trim() : "";
  const capiStatus = typeof sp.capiStatus === "string" ? sp.capiStatus.trim() : "";
  const search = typeof sp.search === "string" ? sp.search.trim() : "";
  const page = /^\d+$/.test(sp.page ?? "") ? Math.max(1, Number(sp.page)) : 1;

  const [statusResult, counts, paginatedEvents] = await Promise.all([
    getMetaConfigStatus(),
    getTrackingEventCounts(),
    listTrackingEvents({
      page,
      perPage: PER_PAGE,
      eventName: eventName || undefined,
      capiStatus: capiStatus || undefined,
      search: search || undefined,
    }),
  ]);

  const initialStatus = statusResult.ok ? statusResult.status : null;
  const statusError = !statusResult.ok ? statusResult.error : null;

  const totalPages = Math.max(1, Math.ceil(paginatedEvents.total / PER_PAGE));

  return (
    <TrackingClient
      initialStatus={initialStatus}
      statusError={statusError}
      events={paginatedEvents.items}
      totalEvents={paginatedEvents.total}
      counts={counts}
      currentPage={page}
      totalPages={totalPages}
      currentEventName={eventName}
      currentCapiStatus={capiStatus}
      currentSearch={search}
    />
  );
}
