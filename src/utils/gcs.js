import { Storage } from "@google-cloud/storage";

export const storage = new Storage({
  projectId: "gen-lang-client-0149291660",
  keyFilename: "config/gcs-key.json",
});

export const bucketName = "answerflow-ai";

export const bucket = storage.bucket(bucketName);