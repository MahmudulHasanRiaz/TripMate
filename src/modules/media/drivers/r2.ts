import "server-only";
import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import type { StorageDriver } from "../driver-types";

export class R2Driver implements StorageDriver {
  async put(): Promise<{ url: string }> {
    throw new Error("R2 upload lands in Plan 3 (media module)");
  }
  async delete(): Promise<void> {
    throw new Error("R2 delete lands in Plan 3 (media module)");
  }

  async testConnection() {
    const id = process.env.R2_ACCOUNT_ID;
    const key = process.env.R2_ACCESS_KEY_ID;
    const secret = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET_NAME;
    if (!id || !key || !secret || !bucket) {
      return { ok: false, error: "R2 credentials incomplete" };
    }
    try {
      const client = new S3Client({
        region: "auto",
        endpoint: `https://${id}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: key, secretAccessKey: secret },
      });
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Connection failed" };
    }
  }
}
