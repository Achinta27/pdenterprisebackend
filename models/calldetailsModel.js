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
    unique: true,
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
    type: Number,
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
    type: Number,
  },
  amountReceived: {
    type: String,
  },
  commissionow: {
    type: Number,
  },
  serviceChange: {
    type: Number,
  },
  commissionDate: {
    type: Date,
  },
  NPS: {
    type: Number,
  },
  incentive: {
    type: Number,
  },
  expenses: {
    type: Number,
  },
  approval: {
    type: Number,
  },
  totalAmount: {
    type: String,
  },
  commissioniw: {
    type: Number,
  },
  partamount: {
    type: Number,
  },
  teamleaderId: {
    type: String,
  },
  createdAt: { type: Date, default: Date.now },
});

calldetailsSchema.pre("save", function (next) {
  const today = new Date();
  const callDate = new Date(this.callDate);

  // If gddate is set, we use it for the TAT calculation
  let tatEndDate = this.gddate ? new Date(this.gddate) : today;

  // Calculate TAT in days
  let tat = Math.ceil((tatEndDate - callDate) / (1000 * 60 * 60 * 24)); // Difference in days

  // If gddate is set, and it's the same as callDate, TAT should be 0
  if (this.gddate && tatEndDate.getTime() === callDate.getTime()) {
    tat = 0;
  } else if (this.gddate) {
    // Otherwise, reduce TAT by 1 if gddate is set and gddate is not the same as callDate
    tat = tat > 1 ? tat - 1 : 0;
  }

  this.TAT = tat >= 0 ? tat : 0; // Ensure TAT is at least 0
  next();
});

calldetailsSchema.pre("findOneAndUpdate", async function (next) {
  const updateData = this.getUpdate().$set;
  const today = new Date();

  if (updateData.callDate || updateData.gddate) {
    const callDate = new Date(updateData.callDate || this.getQuery().callDate);
    const gddate = updateData.gddate ? new Date(updateData.gddate) : null;

    // Determine the tatEndDate based on whether gddate is set
    let tatEndDate = gddate ? new Date(gddate) : today;

    // Calculate TAT in days
    let tat = Math.ceil((tatEndDate - callDate) / (1000 * 60 * 60 * 24)); // Difference in days

    // If gddate is set and equals to callDate, TAT should be 0
    if (gddate && tatEndDate.getTime() === callDate.getTime()) {
      tat = 0;
    } else if (gddate) {
      // If gddate is set and not the same as callDate, subtract 1 from TAT
      tat = tat > 1 ? tat - 1 : 0;
    }

    // Update the TAT in the update query
    this.setUpdate({ $set: { ...updateData, TAT: tat } });
  }
  next();
});

// Middleware for bulk inserts (insertMany)
calldetailsSchema.pre("insertMany", function (next, docs) {
  const today = new Date();

  docs.forEach((doc) => {
    if (doc.callDate) {
      let tatEndDate = doc.gddate ? new Date(doc.gddate) : today;
      const callDate = new Date(doc.callDate);
      let tat = Math.ceil((tatEndDate - callDate) / (1000 * 60 * 60 * 24));

      // Reduce TAT by 1 if gddate is set
      if (doc.gddate) {
        tat = tat > 1 ? tat - 1 : 0;
      }

      doc.TAT = tat >= 0 ? tat.toString() : "0"; // Ensure TAT is at least 0
    }
  });

  next();
});

calldetailsSchema.index({ createdAt: -1, calldetailsId: 1 });

module.exports = mongoose.model("CallDetails", calldetailsSchema);
