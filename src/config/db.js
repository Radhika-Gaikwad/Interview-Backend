import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage"; // Import Storage for buckets
import fs from "fs";

const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("./gcs-key.json", import.meta.url))
);

// Prevent re-initializing if the app is already running
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // Optional: You can set the default bucket globally here
    // storageBucket: "answerflow-ai" (or "answerflow-ai.appspot.com")
  });
}

// 1. Initialize Firestore Database
const db = getFirestore();

// 2. Initialize the specific Cloud Storage Bucket
const bucket = getStorage().bucket("answerflow-ai");

// Export db as default for backwards compatibility, and explicitly export both
export { db, bucket };
export default db;