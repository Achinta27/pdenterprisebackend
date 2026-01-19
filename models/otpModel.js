const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: function () {
        return !this.phone;
      },
    },
    phone: {
      type: String,
      required: function () {
        return !this.email;
      },
    },
    otp: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "login",
        "register",
        "reset-password",
        "verify-account",
        "check-in",
      ],
      default: "login",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
      max: 3,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Prevent multiple active OTPs for same user
otpSchema.index(
  {
    email: 1,
    phone: 1,
    verified: 1,
  },
  {
    partialFilterExpression: { verified: false },
  }
);

module.exports = mongoose.models.OTP || mongoose.model("OTP", otpSchema);
