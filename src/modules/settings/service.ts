import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { settings } from "@/modules/settings/schema";

export type SiteSetting = {
  title: string; logoUrl: string; logoDarkUrl?: string; faviconUrl: string;
  searchEngineVisibility: boolean; phone: string; email: string; address: string;
};
export type StorageSetting = { driver: "local" | "r2" };
export type SetupSetting = { setupComplete: boolean };
export type MetaSetting = { skipped: boolean };

export async function getSetting(key: "site"): Promise<SiteSetting | null>;
export async function getSetting(key: "storage"): Promise<StorageSetting | null>;
export async function getSetting(key: "setup"): Promise<SetupSetting | null>;
export async function getSetting(key: "meta"): Promise<MetaSetting | null>;
export async function getSetting(key: "home"): Promise<Record<string, unknown> | null>;
export async function getSetting(key: "theme"): Promise<Record<string, unknown> | null>;
export async function getSetting(key: "payments"): Promise<Record<string, unknown> | null>;
export async function getSetting(key: string): Promise<unknown> {
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value: value as object })
    .onConflictDoUpdate({ target: settings.key, set: { value: value as object, updatedAt: new Date() } });
}
