import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// Parse the GCS_KEY environment variable (which should be the full JSON string)
const serviceAccount = JSON.parse(process.env.GCS_KEY);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // Use the environment variable for the bucket name
    storageBucket: process.env.GCS_BUCKET
  });
}

const db = getFirestore();

// Use the environment variable here as well
const bucket = getStorage().bucket(process.env.GCS_BUCKET);

export { db, bucket };
export default db;