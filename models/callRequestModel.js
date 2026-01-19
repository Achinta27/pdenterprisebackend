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
    request_type: {
      type: String,
      required: true,
      default: "repair_services",
      enum: [
        "electronics_parts",
        "repair_services",
        "salon_services",
        "sanitary_services",
        "cleaning_services",
        "grocery_services",
      ],
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
