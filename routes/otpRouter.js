const express = require("express");
const {
  createAndSendOTP,
  verifyOTPController,
  resendOTP,
} = require("../controllers/otpController");

const router = express.Router();

router.post("/send", createAndSendOTP);
router.post("/verify", verifyOTPController);
router.post("/resend", resendOTP);

module.exports = router;
