const mongoose = require("mongoose");

const warrantySchema = new mongoose.Schema(
  {
    warrantyId: {
      type: String,
      unique: true,
      required: true,
    },
    warrantytype: {
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

module.exports = mongoose.model("WarrantyType", warrantySchema);
