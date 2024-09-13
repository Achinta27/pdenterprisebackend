const mongoose = require("mongoose");

const calldetailsSchema = new mongoose.Schema({
  calldetailsId: {
    type: String,
    unique: true,
    required: true,
  },
  callDate: {
    type: Date,
    required: true,
  },
  visitdate: {
    type: Date,
  },
  callNumber: {
    type: String,
    required: true,
  },
  brandName: {
    type: String,
    required: true,
  },

  customerName: {
    type: String,
    required: true,
  },
  address: {
    type: String,
  },
  route: {
    type: String,
  },
  contactNumber: {
    type: String,
    unique: true,
    required: true,
  },
  whatsappNumber: {
    type: String,
  },
  engineer: {
    type: String,
  },
  productsName: {
    type: String,
    required: true,
  },
  warrantyTerms: {
    type: String,
    required: true,
  },
  TAT: {
    type: Number, // Store TAT as a number
    default: 0,
  },
  serviceType: {
    type: String,
    required: true,
  },
  remarks: {
    type: String,
  },
  parts: {
    type: String,
  },
  jobStatus: {
    type: String,
    required: true,
  },
  modelNumber: {
    type: String,
  },
  iduser: {
    type: String,
  },
  closerCode: {
    type: String,
  },
  dateofPurchase: {
    type: Date,
  },
  oduser: {
    type: String,
  },
  followupdate: {
    type: Date,
  },
  gddate: {
    type: Date,
  },
  receivefromEngineer: {
    type: String,
  },
  amountReceived: {
    type: String,
  },
  commissionow: {
    type: String,
  },
  serviceChange: {
    type: String,
  },
  commissionDate: {
    type: Date,
  },
  NPS: {
    type: String,
  },
  incentive: {
    type: String,
  },
  expenses: {
    type: String,
  },
  approval: {
    type: String,
  },
  totalAmount: {
    type: String,
  },
  commissioniw: {
    type: String,
  },
  partamount: {
    type: String,
  },
  teamleaderId: {
    type: String,
  },
  createdAt: { type: Date, default: Date.now },
});

calldetailsSchema.pre("save", function (next) {
  const today = new Date();
  const callDate = new Date(this.callDate);
  let tatEndDate = this.gddate ? new Date(this.gddate) : today; // Stop TAT at gddate if it exists
  const tat = Math.ceil((tatEndDate - callDate) / (1000 * 60 * 60 * 24)); // Calculate TAT in days
  this.TAT = tat > 0 ? tat : 0; // Ensure TAT is at least 0
  next();
});

// Middleware for bulk inserts (insertMany)
calldetailsSchema.pre("insertMany", function (next, docs) {
  const today = new Date();
  docs.forEach((doc) => {
    if (doc.callDate) {
      let tatEndDate = doc.gddate ? new Date(doc.gddate) : today;
      const callDate = new Date(doc.callDate);
      const tat = Math.ceil((tatEndDate - callDate) / (1000 * 60 * 60 * 24));
      doc.TAT = tat > 0 ? tat.toString() : "0"; // Ensure TAT is at least 1
    }
  });
  next();
});

calldetailsSchema.index({ createdAt: -1, calldetailsId: 1 });

module.exports = mongoose.model("CallDetails", calldetailsSchema);
