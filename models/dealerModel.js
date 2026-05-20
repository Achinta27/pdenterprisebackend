const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const dealerSchema = new mongoose.Schema(
  {
    dealerId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    dealerCode: {
      type: String,
      unique: true,
      required: true,
    },
    status: {
      type: String,
      default: "active",
    },
    aadharNo: {
      type: String,
    },
    panCardNo: {
      type: String,
    },
    upiId: {
      type: String,
    },
    qrCodeImage: {
      type: String,
    },
    bankAccountName: {
      type: String,
    },
    ifsc: {
      type: String,
    },
    payeeName: {
      type: String,
    },
    remarks: {
      type: String,
    },
    fcmToken: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

dealerSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    console.log(err);
  }
});

dealerSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("Dealer", dealerSchema);