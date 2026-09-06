import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLandingById } from "@/modules/landing-pages/service";
import LandingBuilder from "../../builder/LandingBuilder";

export const metadata: Metadata = { title: "Edit Landing Page · TripMate Admin" };
export const instant = false;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditLandingPage({ params }: PageProps) {
  const { id } = await params;
  const landing = await getLandingById(id);

  if (!landing) {
    notFound();
  }

  return <LandingBuilder initialData={landing} />;
}
