const mongoose = require("mongoose");
const customerBanner = require("../models/customerBanner");
const { uploadFile, deleteFile } = require("../middlewares/cloudinary");

const generateBannerId = async () => {
  const customers = await customerBanner
    .find({}, { bannerId: 1, _id: 0 })
    .sort({
      bannerId: 1,
    });
  const customerIds = customers.map((customer) =>
    parseInt(customer.bannerId.replace("bannerId", ""), 10)
  );

  let customerId = 1;
  for (let i = 0; i < customerIds.length; i++) {
    if (customerId < customerIds[i]) {
      break;
    }
    customerId++;
  }

  return `bannerId${String(customerId).padStart(4, "0")}`;
};

exports.createCustomerBanner = async (req, res) => {
  try {
    const { banner_name } = req.body;
    if (!req.files || !req.files.banner_img) {
      return res.status(400).json({ error: "Banner Image is required" });
    }

    const bannerFile = await uploadFile(
      req.files.banner_img.tempFilePath,
      req.files.banner_img.mimetype
    );

    const bannerId = await generateBannerId();
    const newBanner = new customerBanner({
      bannerId,
      banner_name,
      banner_img: {
        public_id: bannerFile.public_id,
        secure_url: bannerFile.secure_url,
      },
    });

    const savedBanner = await newBanner.save();

    res
      .status(201)
      .json({ message: "Banner created successfully", banner: savedBanner });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getAllBanners = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      status,
      name,
      start_date,
      end_date,
    } = req.query;

    const skip = (page - 1) * limit;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (name) {
      query.banner_name = { $regex: name, $options: "i" };
    }

    if (start_date && !isNaN(new Date(start_date))) {
      query.createdAt = { $gte: new Date(start_date) };
    }

    if (end_date && !isNaN(new Date(end_date))) {
      query.createdAt = { $lte: new Date(end_date).setHours(23, 59, 59) };
    }

    const [banners, totalBanners] = await Promise.all([
      customerBanner
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      customerBanner.countDocuments(query),
    ]);

    res.status(200).json({
      banners,
      totalBanners,
      page,
      totalPages: Math.ceil(totalBanners / limit),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await customerBanner.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { bannerId: id },
      ],
    });
    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }
    await deleteFile(banner.banner_img.public_id);
    await customerBanner.findByIdAndDelete(banner._id);
    res.status(200).json({ message: "Banner deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const { banner_name, status } = req.body;

    const banner = await customerBanner.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { bannerId: id },
      ],
    });

    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    banner.banner_name = banner_name ?? banner.banner_name;
    banner.status = status ?? banner.status;

    await banner.save();

    res.status(200).json({ message: "Banner updated successfully", banner });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};
