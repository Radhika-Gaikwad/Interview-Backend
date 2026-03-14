import os from "os";
import path from "path";
import { Storage } from "@google-cloud/storage";
import textUtils from "./textUtils.js"; // your existing extraction utils

const storage = new Storage({
  keyFilename: "config/gcs-key.json",
});

const bucketName = "resumeanswerflow-ai";

async function convertResumeToTextAndUpload(gcsFilePath) {
  try {
    const fileName = path.basename(gcsFilePath);
    const localTempPath = path.join(os.tmpdir(), fileName); // ← Windows-safe temp dir

    // Download uploaded file
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(gcsFilePath);
    await file.download({ destination: localTempPath });
    console.log(`Downloaded file to ${localTempPath}`);

    if (!fs.existsSync(localTempPath)) {
      throw new Error(`File not found after download: ${localTempPath}`);
    }

    // Extract text based on file type
    const ext = path.extname(fileName).toLowerCase();
    let extractedData;

    if (ext === ".pdf") extractedData = await textUtils.extractTextFromPdf(localTempPath);
    else if (ext === ".docx") extractedData = await textUtils.extractTextFromDocx(localTempPath);
    else if (ext === ".pptx") extractedData = await textUtils.extractTextFromPptx(localTempPath);
    else throw new Error("Unsupported file type: " + ext);

    // Save text locally
    const txtFileName = fileName.replace(ext, ".txt");
    const txtLocalPath = path.join(os.tmpdir(), txtFileName);
    fs.writeFileSync(txtLocalPath, JSON.stringify(extractedData, null, 2), "utf-8");

    // Upload text to processed folder
    const processedPath = `resume/processed/${txtFileName}`;
    await bucket.upload(txtLocalPath, {
      destination: processedPath,
      metadata: { contentType: "text/plain" },
    });

    // Clean up temp files
    fs.unlinkSync(localTempPath);
    fs.unlinkSync(txtLocalPath);

    console.log(`Text version uploaded to ${processedPath}`);
    return `https://storage.googleapis.com/${bucketName}/${processedPath}`;
  } catch (err) {
    console.error("Error converting resume to text:", err);
    throw err;
  }
}

export default convertResumeToText;