import "server-only";

import { getSetting, setSetting } from "@/modules/settings/service";
import {
  DEFAULT_PAYMENT_SETTINGS,
  paymentSettingsSchema,
  type PaymentSettings,
} from "./validation";

/** Read the `payments` settings row defensively (missing → defaults). */
export async function getPaymentSettings(): Promise<PaymentSettings> {
  const raw = await getSetting("payments");
  if (!raw || typeof raw !== "object") return DEFAULT_PAYMENT_SETTINGS;
  const parsed = paymentSettingsSchema.safeParse(raw);
  if (!parsed.success) return DEFAULT_PAYMENT_SETTINGS;
  return { ...DEFAULT_PAYMENT_SETTINGS, ...parsed.data };
}

export async function updatePaymentSettings(input: PaymentSettings): Promise<PaymentSettings> {
  const parsed = paymentSettingsSchema.parse(input);
  const next = { ...DEFAULT_PAYMENT_SETTINGS, ...parsed };
  await setSetting("payments", next);
  return next;
}
