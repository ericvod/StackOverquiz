import { Storage } from "@google-cloud/storage";
import { Client as MinioClient } from "minio";
import { env } from "./env";

interface PutObjectMetadata {
  contentType: string;
}

const minioClient = new MinioClient({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

const gcsClient =
  env.STORAGE_DRIVER === "gcs"
    ? new Storage({
        projectId: env.GCS_PROJECT_ID || undefined,
      })
    : undefined;

function getGcsBucket() {
  if (!gcsClient) {
    throw new Error("GCS storage client is not configured");
  }

  return gcsClient.bucket(env.GCS_BUCKET);
}

async function ensureMinioBucket() {
  const exists = await minioClient.bucketExists(env.MINIO_BUCKET);
  if (!exists) {
    await minioClient.makeBucket(env.MINIO_BUCKET);
    console.log(`Bucket "${env.MINIO_BUCKET}" created`);
  }
}

async function ensureGcsBucket() {
  const exists = await bucketExists();
  if (!exists) {
    throw new Error(`GCS bucket "${env.GCS_BUCKET}" is not available`);
  }
}

export async function ensureBucket() {
  if (env.STORAGE_DRIVER === "gcs") {
    await ensureGcsBucket();
    return;
  }

  await ensureMinioBucket();
}

export async function bucketExists() {
  if (env.STORAGE_DRIVER === "gcs") {
    await getGcsBucket().getFiles({
      autoPaginate: false,
      maxResults: 1,
    });

    return true;
  }

  return await minioClient.bucketExists(env.MINIO_BUCKET);
}

export async function putObject(key: string, buffer: Buffer, metadata: PutObjectMetadata) {
  if (env.STORAGE_DRIVER === "gcs") {
    await getGcsBucket()
      .file(key)
      .save(buffer, {
        resumable: false,
        metadata: {
          contentType: metadata.contentType,
        },
      });
    return;
  }

  await minioClient.putObject(BUCKET_NAME, key, buffer, buffer.length, {
    "Content-Type": metadata.contentType,
  });
}

export async function getObjectSignedUrl(key: string, expirySeconds = 3600) {
  if (env.STORAGE_DRIVER === "gcs") {
    const [url] = await getGcsBucket()
      .file(key)
      .getSignedUrl({
        action: "read",
        expires: Date.now() + expirySeconds * 1000,
        version: "v4",
      });

    return url;
  }

  const rawUrl = await minioClient.presignedGetObject(BUCKET_NAME, key, expirySeconds);

  if (env.MINIO_PUBLIC_ENDPOINT) {
    const parsed = new URL(rawUrl);
    const publicBase = new URL(env.MINIO_PUBLIC_ENDPOINT);
    parsed.protocol = publicBase.protocol;
    parsed.hostname = publicBase.hostname;
    parsed.port = publicBase.port;
    return parsed.toString();
  }

  return rawUrl;
}

export async function deleteObject(key: string) {
  if (env.STORAGE_DRIVER === "gcs") {
    try {
      await getGcsBucket().file(key).delete();
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === 404) {
        return;
      }

      throw error;
    }
    return;
  }

  await minioClient.removeObject(BUCKET_NAME, key);
}

export const BUCKET_NAME = env.STORAGE_DRIVER === "gcs" ? env.GCS_BUCKET : env.MINIO_BUCKET;
export const STORAGE_DRIVER = env.STORAGE_DRIVER;
