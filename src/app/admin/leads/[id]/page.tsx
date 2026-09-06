import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLeadDetail, listStaffUsers } from "@/modules/leads/service";
import LeadDetailClient from "./LeadDetailClient";

export const metadata: Metadata = { title: "Lead Details · TripMate Admin" };
export const instant = false;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LeadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [lead, staffUsers] = await Promise.all([
    getLeadDetail(id),
    listStaffUsers(),
  ]);

  if (!lead) {
    notFound();
  }

  return <LeadDetailClient lead={lead} staffUsers={staffUsers} />;
}
