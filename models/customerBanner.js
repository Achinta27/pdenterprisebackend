const mongoose = require("mongoose");

const customerBannerSchema = new mongoose.Schema(
  {
    bannerId: {
      type: String,
      unique: true,
      required: true,
    },
    banner_name: {
      type: String,
    },
    banner_img: {
      type: {
        public_id: String,
        secure_url: String,
      },
      required: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.CustomerBanner ||
  mongoose.model("CustomerBanner", customerBannerSchema);
