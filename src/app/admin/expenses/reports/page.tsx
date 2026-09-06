import type { Metadata } from "next";
import { getPLReport, getServiceMargin } from "@/modules/expenses/service";
import ExpenseReportsView from "./ExpenseReportsView";

export const metadata: Metadata = { title: "Financial Reports (P&L) · TripMate Admin" };
export const instant = false;

type SearchParams = {
  from?: string;
  to?: string;
};

export default async function ExpenseReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const from = typeof sp.from === "string" ? sp.from : undefined;
  const to = typeof sp.to === "string" ? sp.to : undefined;

  const [report, margins] = await Promise.all([
    getPLReport({ from, to }),
    getServiceMargin({ from, to }),
  ]);

  return (
    <ExpenseReportsView
      report={report}
      margins={margins}
      initialFrom={from}
      initialTo={to}
    />
  );
}
