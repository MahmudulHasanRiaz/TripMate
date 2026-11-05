export interface StorageDriver {
  put(key: string, data: Buffer, contentType: string): Promise<{ url: string }>;
  /** Read an object's bytes back (rename copies old → new through this). */
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  testConnection(): Promise<{ ok: boolean; error?: string }>;
}
