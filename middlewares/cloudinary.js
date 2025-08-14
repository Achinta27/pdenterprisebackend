const cloudinary = require("cloudinary");
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadFile = async (tempFilePath, fileType) => {
  try {
    console.log(tempFilePath);
    console.log(fileType);

    let folderName = "images";

    let resource_type = "image";

    if (fileType === "application/pdf") {
      folderName = "pdf";
      resource_type = "raw";
    } else if (fileType.startsWith("video")) {
      folderName = "video";
      resource_type = "video";
    }

    // Upload the file to Cloudinary
    let result;
    if (resource_type === "image") {
      result = await cloudinary.uploader.upload(tempFilePath, {
        folder: `pdenterprise/` + folderName,
        resource_type: resource_type,
      });
    } else {
      result = await cloudinary.uploader.upload(
        tempFilePath,
        function (result) {
          console.log(result);
        },
        {
          folder: `pdenterprise/` + folderName,
          resource_type: resource_type,
        }
      );
    }
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
