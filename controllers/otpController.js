const { createOTP, verifyOTP } = require("../middlewares/otp");
const otpModel = require("../models/otpModel");

exports.createAndSendOTP = async (req, res) => {
  try {
    const { email, phone, type } = req.body;

    const { data } = await createOTP({ email, phone, type });

    res.status(201).json({ message: "OTP created successfully", data });
  } catch (error) {
    res.status(500).json({ message: "Error creating OTP", error });
  }
};

exports.verifyOTPController = async (req, res) => {
  try {
    const { email, phone, otp, type } = req.body;

    const otpRecord = await verifyOTP({ email, phone, otp, type });

    if (!otpRecord.success) {
      throw new Error(otpRecord.message);
    }

    return res.status(400).json({ message: "OTP verified", success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.message || "Error Verify OTP",
      success: false,
    });
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const { email, phone, type } = req.body;

    const existingOtp = await otpModel.findOne({
      $or: [{ email }, { phone }],
      verified: false,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: 3 },
    });

    if (existingOtp) {
      // Check if enough time has passed (at least 30 seconds)
      const timeElapsed = Date.now() - existingOtp.createdAt.getTime();
      if (timeElapsed < 30000) {
        return res.status(200).json({
          success: false,
          message: "Please wait before requesting a new OTP",
          waitTime: Math.ceil((30000 - timeElapsed) / 1000),
        });
      }
    }

    await otpModel.deleteMany({
      $or: [{ email }, { phone }],
      verified: false,
    });

    const otp = await createOTP({ email, phone, type });
    const newOtp = otp.data;

    res.status(200).json({ message: "OTP resent successfully", data: newOtp });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.message || "Error to resend OTP",
      success: false,
    });
  }
};
