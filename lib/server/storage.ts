/**
 * Object-storage client. Works against MinIO (local) and AWS S3 (prod) — the
 * only knob between them is `S3_FORCE_PATH_STYLE`. Lazy-creates the bucket on
 * first use so dev setup is one command (`docker compose up`) rather than two.
 *
 * Direct module use: `import { storage } from '@/lib/server/storage'`.
 */
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '@/lib/env';

function requireEnv() {
  if (!env.S3_ENDPOINT || !env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new Error(
      'S3 storage is not configured. Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.',
    );
  }
  return {
    endpoint: env.S3_ENDPOINT,
    bucket: env.S3_BUCKET,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  };
}

const client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials:
    env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
      ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY }
      : undefined,
});

let bucketChecked = false;

async function ensureBucket() {
  const { bucket } = requireEnv();
  if (bucketChecked) return;
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (error) {
    const code = (error as { name?: string; $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (code === 404 || code === 301) {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    } else if (code !== 200 && code !== undefined) {
      throw error;
    }
  }
  bucketChecked = true;
}

export const storage = {
  async putObject(key: string, body: Buffer | Uint8Array, contentType: string) {
    const { bucket } = requireEnv();
    await ensureBucket();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  },

  async getObjectBody(key: string): Promise<Buffer> {
    const { bucket } = requireEnv();
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!res.Body) throw new Error(`Object ${key} has empty body`);
    const chunks: Uint8Array[] = [];
    // @ts-expect-error AWS SDK returns a Web ReadableStream; iterate it.
    for await (const chunk of res.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  },

  async deleteObject(key: string) {
    const { bucket } = requireEnv();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  },

  async getPresignedDownloadUrl(key: string, expiresInSeconds = 300): Promise<string> {
    const { bucket } = requireEnv();
    return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  },
};

export function documentStorageKey(botId: string, documentId: string, ext: string): string {
  return `bots/${botId}/documents/${documentId}${ext}`;
}
