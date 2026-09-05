export interface StorageDriver {
  put(key: string, data: Buffer, contentType: string): Promise<{ url: string }>;
  delete(key: string): Promise<void>;
  testConnection(): Promise<{ ok: boolean; error?: string }>;
}
