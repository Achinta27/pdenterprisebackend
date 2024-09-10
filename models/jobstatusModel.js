const mongoose = require("mongoose");

const jobstatusSchema = new mongoose.Schema(
  {
    jobstatusId: {
      type: String,
      unique: true,
      required: true,
    },
    jobstatusName: {
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

module.exports = mongoose.model("JobStatusName", jobstatusSchema);
