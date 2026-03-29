import { Storage } from "@google-cloud/storage";

const isProduction = process.env.NODE_ENV === "production";

export const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,

  ...(isProduction
    ? {
        credentials: JSON.parse(process.env.GCS_KEY), // ✅ from ENV
      }
    : {
        keyFilename: "config/gcs-key.json", // ✅ local dev only
      }),
});

export const bucketName = process.env.GCS_BUCKET;

export const bucket = storage.bucket(bucketName);