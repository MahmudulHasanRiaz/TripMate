import type { Metadata } from "next";
import LandingBuilder from "../builder/LandingBuilder";

export const metadata: Metadata = { title: "New Landing Page · TripMate Admin" };
export const instant = false;

export default function NewLandingPage() {
  return <LandingBuilder />;
}
