export { getFirebaseApp, getFirebaseStorage, getFirebaseFirestore, isFirebaseConfigured } from "./config";
export { uploadImageToStorage, type UploadImageResult } from "./storage";
export {
  saveImageMetadata,
  getImageMetadata,
  listImagesBySession,
  listAllImagesFromFirestore,
  listImagesByCategoryFromFirestore,
  saveSessionToFirestore,
  loadSessionFromFirestore,
  listAllSessionsFromFirestore,
  listSessionsByCategoryFromFirestore,
  type ImageMetadata,
  type SessionSnapshot,
  type SessionSummary
} from "./firestore";
