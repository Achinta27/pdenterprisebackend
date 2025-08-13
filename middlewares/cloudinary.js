const cloudinary = require("cloudinary");
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadFile = async (tempFilePath, fileType) => {
  try {
    let folderName = "images";
    let format = "jpg";
    let resourceType = "image";

    if (fileType === "application/pdf") {
      folderName = "pdf";
      format = "pdf";
      resourceType = "raw";
    }
    // Upload the file to Cloudinary
    const result = await cloudinary.uploader.upload(tempFilePath, {
      folder: `pdenterprise/` + folderName,
      resource_type: resourceType,
      format: format,
    });

    return result; // Return the result of the upload
  } catch (error) {
    console.error("Error uploading file:", error);
    return new Error("File upload failed");
  }
};

const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Error deleting file:", error);
    return new Error("File deletion failed");
  }
};

module.exports = { uploadFile, deleteFile };
