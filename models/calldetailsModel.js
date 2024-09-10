const mongoose = require("mongoose");

const calldetailsSchema = new mongoose.Schema({
  calldetailsId: {
    type: String,
    unique: true,
    required: true,
  },
  callDate: {
    type: String,
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
    type: String,
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
    type: String,
  },
  oduser: {
    type: String,
  },
  followupdate: {
    type: String,
  },
  gddate: {
    type: String,
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
    type: String,
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

calldetailsSchema.index({ createdAt: -1, calldetailsId: 1 });

module.exports = mongoose.model("CallDetails", calldetailsSchema);
