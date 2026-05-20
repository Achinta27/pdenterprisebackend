const mongoose = require("mongoose");

const dealerCallSchema = new mongoose.Schema(
  {
    dealerCallId: {
      type: String,
      unique: true,
      required: true,
    },
    dealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
    },
    callNumber: {
      type: String,
    },
    customerName: {
      type: String,
      required: true,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    address: {
      type: String,
    },
    area: {
      type: String,
    },
    pinCode: {
      type: String,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BrandName",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductName",
      required: true,
    },
    remarks: {
      type: String,
    },
    adminRemarks: {
      type: String,
    },
    serviceType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceType",
    },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "approved", "rejected"],
    },
  },
  {
    timestamps: true,
  }
);

// Static method to find the most recent approved dealer for a customer
dealerCallSchema.statics.findStickyDealer = async function (contactNumber, customerName) {
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const conditions = [];

  if (contactNumber && contactNumber.trim()) {
    conditions.push({ contactNumber: { $regex: `^${escapeRegex(contactNumber.trim())}$`, $options: "i" } });
  }

  if (customerName && customerName.trim()) {
    conditions.push({ customerName: { $regex: `^${escapeRegex(customerName.trim())}$`, $options: "i" } });
  }

  if (conditions.length === 0) return null;

  const query = {
    status: "approved",
    $or: conditions,
  };

  const dealerCall = await this.findOne(query).sort({ createdAt: -1 }).lean();
  return dealerCall ? dealerCall.dealer : null;
};

module.exports = mongoose.model("DealerCall", dealerCallSchema);