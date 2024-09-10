const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    serviceId: {
      type: String,
      unique: true,
      required: true,
    },
    servicetype: {
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

module.exports = mongoose.model("ServiceType", serviceSchema);
