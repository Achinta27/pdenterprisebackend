const mongoose = require("mongoose");

const calculateTAT = (callDate, gddate, referenceDate = new Date()) => {
  const end = gddate ? new Date(gddate) : referenceDate;
  const start = new Date(callDate);
  let tat = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  if (end.getTime() === start.getTime()) {
    return 0;
  }
  if (gddate) {
    return tat > 1 ? tat - 1 : 0;
  }
  return tat >= 0 ? tat : 0;
};

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
    type: mongoose.Schema.Types.ObjectId,
    ref: "EngineerName",
    default: null,
  },
  dealer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Dealer",
    default: null,
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
  service_images: {
    type: [
      {
        public_id: String,
        secure_url: String,
        content_type: String,
      },
    ],
    default: [],
  },
  check_in_location: {
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
  },
  dealerCallId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DealerCall",
    default: null,
  },
  history: {
    type: [
      {
        changedBy: {
          name: { type: String },
          role: { type: String },
          userId: { type: String },
        },
        changedAt: { type: Date, default: Date.now },
        changes: [
          {
            field: { type: String },
            oldValue: { type: mongoose.Schema.Types.Mixed },
            newValue: { type: mongoose.Schema.Types.Mixed },
          },
        ],
      },
    ],
    default: [],
  },
});

calldetailsSchema.pre("save", async function () {
  this.TAT = calculateTAT(this.callDate, this.gddate);

  if (this.isNew && !this.dealer && (this.contactNumber || this.customerName)) {
    const DealerCall = mongoose.model("DealerCall");
    const stickyDealer = await DealerCall.findStickyDealer(this.contactNumber, this.customerName);
    if (stickyDealer) {
      this.dealer = stickyDealer;
    }
  }
});

calldetailsSchema.pre("findOneAndUpdate", async function () {
  const currentUpdate = this.getUpdate();
  const updateData = currentUpdate.$set;
  if (updateData?.callDate || updateData?.gddate) {
    const callDate = new Date(updateData.callDate || this.getQuery().callDate);
    const gddate = updateData.gddate ? new Date(updateData.gddate) : null;
    const { $push, ...rest } = currentUpdate;
    this.setUpdate({
      ...rest,
      $set: { ...updateData, TAT: calculateTAT(callDate, gddate) },
      ...($push ? { $push } : {}),
    });
  }
});

// Middleware for bulk inserts (insertMany)
calldetailsSchema.pre("insertMany", async function (docs) {
  const today = new Date();
  const DealerCall = mongoose.model("DealerCall");

  for (const doc of docs) {
    if (doc.callDate) {
      doc.TAT = calculateTAT(doc.callDate, doc.gddate, today);
    }

    if (!doc.dealer && (doc.contactNumber || doc.customerName)) {
      const stickyDealer = await DealerCall.findStickyDealer(doc.contactNumber, doc.customerName);
      if (stickyDealer) {
        doc.dealer = stickyDealer;
      }
    }
  }
});

calldetailsSchema.index({ createdAt: -1, calldetailsId: 1 });

module.exports = mongoose.model("CallDetails", calldetailsSchema);
