import { randomUUID } from "node:crypto";
import { deleteObject, getObjectSignedUrl, putObject } from "../../config/storage";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FOLDERS = ["questions", "avatars", "quizzes"] as const;
type UploadFolder = (typeof ALLOWED_FOLDERS)[number];

/**
 * Validates and uploads an image to object storage.
 *
 * @remarks Side effects: writes a new object to the configured storage bucket under the given folder prefix.
 */
export async function uploadImage(file: File, folder: UploadFolder = "questions"): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}`);
  }

  if (file.size > MAX_SIZE) {
    throw new Error(`File too large. Max size: ${MAX_SIZE / 1024 / 1024}MB`);
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const key = `${folder}/${randomUUID()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  await putObject(key, buffer, {
    contentType: file.type,
  });

  return key;
}

/**
 * Generates a temporary download URL for an uploaded object.
 */
export async function getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
  return await getObjectSignedUrl(key, expirySeconds);
}

/**
 * Deletes an uploaded object from storage.
 */
export async function deleteImage(key: string): Promise<void> {
  await deleteObject(key);
}
