import "server-only";
import {
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { StorageDriver } from "../driver-types";

/**
 * Cloudflare R2 storage driver (S3-compatible).
 *
 * Keys are the media module's `<uuid>.<ext>` storage keys (see validation.ts);
 * objects are stored flat in the bucket. Public URLs are derived from
 * R2_PUBLIC_URL — the custom domain bound to the bucket (public reads must NOT
 * go through the r2.dev or S3 endpoints, which lack per-bucket access for
 * unauthenticated GETs the way a bound custom domain provides).
 *
 * Credentials are read at CALL time (not construction time) so the same
 * process can switch drivers/config without a restart and tests can point env
 * at a throwaway bucket. A missing/partial credential set throws a descriptive
 * error rather than failing deep inside the SDK. Bucket connectivity is
 * verified by `testConnection` (HeadBucket).
 */
export class R2Driver implements StorageDriver {
  private config() {
    const id = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET_NAME;
    const publicUrl = process.env.R2_PUBLIC_URL;
    const missing = [
      !id && "R2_ACCOUNT_ID",
      !accessKeyId && "R2_ACCESS_KEY_ID",
      !secretAccessKey && "R2_SECRET_ACCESS_KEY",
      !bucket && "R2_BUCKET_NAME",
      !publicUrl && "R2_PUBLIC_URL",
    ].filter(Boolean);
    if (missing.length > 0) {
      throw new Error(`R2 storage not configured — missing ${missing.join(", ")}.`);
    }
    return {
      bucket: bucket!,
      publicUrl: publicUrl!.replace(/\/+$/, ""),
      client: new S3Client({
        region: "auto",
        endpoint: `https://${id}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
      }),
    };
  }

  async put(key: string, data: Buffer, contentType: string) {
    const { client, bucket, publicUrl } = this.config();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
    return { url: `${publicUrl}/${key}` };
  }

  async delete(key: string) {
    const { client, bucket } = this.config();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  async testConnection() {
    const id = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET_NAME;
    if (!id || !accessKeyId || !secretAccessKey || !bucket) {
      return { ok: false, error: "R2 credentials incomplete" };
    }
    try {
      const client = new S3Client({
        region: "auto",
        endpoint: `https://${id}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Connection failed" };
    }
  }
}
