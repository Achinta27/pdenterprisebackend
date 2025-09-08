const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const crypto = require("crypto");

require("dotenv").config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload file to S3
 * @param {string} tempFilePath - Local file path
 * @param {string} fileType - File type (e.g. "image/png" or "application/pdf")
 * @param {string} bucketName - S3 bucket name
 * @param {string} folder - Optional folder inside bucket
 * @returns {Promise<string>} - Public S3 file URL
 */
exports.uploadToS3 = async (tempFilePath, fileType, folder = "uploads") => {
  try {
    const fileStream = fs.createReadStream(tempFilePath);
    const fileName = path.basename(tempFilePath);

    const uniqueId = crypto.randomUUID();
    const key = folder
      ? `${folder}/${uniqueId}-${fileName}`
      : `${uniqueId}-${fileName}`;

    // Use provided fileType or auto-detect
    const contentType =
      fileType || mime.lookup(tempFilePath) || "application/octet-stream";

    const command = new PutObjectCommand({
      Bucket: "pdenterprise",
      Key: key,
      Body: fileStream,
      ContentType: contentType,
    });

    await s3.send(command);

    return {
      secure_url: `https://pdenterprise.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      public_id: key,
    };
  } catch (err) {
    console.error("S3 Upload Error:", err);
    throw err;
  }
};

/**
 * Delete file from S3
 * @param {string} fileUrl - Full S3 file URL
 * @param {string} bucketName - S3 bucket name
 * @returns {Promise<boolean>} - True if deleted
 */
exports.deleteFromS3 = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: "pdenterprise",
      Key: key,
    });

    await s3.send(command);
    return true;
  } catch (err) {
    console.error("S3 Delete Error:", err);
    throw err;
  }
};
