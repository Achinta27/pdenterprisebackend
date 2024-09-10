const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    brandId: {
      type: String,
      unique: true,
      required: true,
    },
    brandname: {
      type: String,
      unique: true,
      required: true,
    },
    activeState: {
      type: String,
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("BrandName", brandSchema);
