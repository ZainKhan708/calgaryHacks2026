import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "./config";

export interface UploadImageResult {
  downloadUrl: string;
  storagePath: string;
}

/**
 * Upload an image file to Firebase Storage.
 * Path: images/{sessionId}/{fileId}.{ext}
 */
export async function uploadImageToStorage(
  file: File | Blob,
  sessionId: string,
  fileId: string,
  mimeType?: string
): Promise<UploadImageResult | null> {
  const storage = getFirebaseStorage();
  if (!storage) return null;

  const mime = mimeType ?? (file instanceof File ? file.type : "image/png");
  const ext = getExtensionFromMime(mime);
  const storagePath = `images/${sessionId}/${fileId}${ext}`;
  const storageRef = ref(storage, storagePath);

  const bytes = await file.arrayBuffer();
  const snapshot = await uploadBytes(storageRef, bytes, { contentType: mime });
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return { downloadUrl, storagePath };
}

function getExtensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp"
  };
  return map[mime] ?? ".png";
}
