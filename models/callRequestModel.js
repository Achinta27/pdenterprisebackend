const mongoose = require("mongoose");

const callRequestSchema = new mongoose.Schema(
  {
    callrequestId: {
      type: String,
      unique: true,
      required: true,
    },
    call_service: {
      type: String,
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Customer",
    },
    call_status: {
      type: String,
      required: true,
      default: "Pending",
      enum: ["Pending", "Accepted", "Rejected"],
    },
    preferred_visit_date: {
      type: Date,
    },
    remarks: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.CallRequest ||
  mongoose.model("CallRequest", callRequestSchema);
