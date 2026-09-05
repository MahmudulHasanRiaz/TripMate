import "server-only";
import type { StorageDriver } from "./driver-types";
import { LocalDriver } from "./drivers/local";
import { R2Driver } from "./drivers/r2";

export type { StorageDriver } from "./driver-types";

export function getStorageDriver(setting: "local" | "r2"): StorageDriver {
  return setting === "r2" ? new R2Driver() : new LocalDriver();
}
