const otpModel = require("../models/otpModel");

function generateOTP(length = 6) {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

const formatMobile = (mobile) => {
  const raw = mobile.replace(/\D/g, "");
  return raw.startsWith("91") ? raw : "91" + raw;
};

async function SEND_WHATSAPP({ mobile, message }) {
  try {
    const formattedMobile = formatMobile(mobile);

    const payload = {
      "auth-key": process.env.WA_AUTH_KEY,
      "app-key": process.env.WA_APP_KEY,
      destination_number: formattedMobile,
      template_id: process.env.WA_TEMPLATE_ID,
      device_id: process.env.WA_DEVICE_ID,
      language: "en",
      variables: [message, "+917044076603"],
    };

    const response = await fetch("https://web.wabridge.com/api/createmessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    return {
      success: true,
      message: "Message sent successfully",
    };
  } catch (error) {
    console.log(error);
    return {};
  }
}

exports.createOTP = async ({ email, phone, type }) => {
  try {
    await otpModel.deleteMany({
      $or: [{ email }, { phone }],
      verified: false,
    });

    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + parseInt(process.env.OTP_EXPIRY_MINUTES || "10"),
    );

    const otpRecord = new otpModel({
      email,
      phone,
      otp,
      type,
      expiresAt,
    });

    await otpRecord.save();

    console.log(otp);

    await SEND_WHATSAPP({ mobile: phone, message: otp });

    return { success: true, data: otpRecord };
  } catch (error) {
    return { success: false, data: error };
  }
};

exports.verifyOTP = async ({ email, phone, otp, type }) => {
  try {
    const otpRecord = await otpModel.findOne({
      $or: [{ email }, { phone }],
      otp,
      type,
      verified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return { message: "Invalid OTP", success: false };
    }

    if (otpRecord.attempts >= 3) {
      await otpModel.findByIdAndDelete(otpRecord._id);
      return {
        message: "Maximum attempts reached",
        success: false,
      };
    }

    otpRecord.attempts += 1;

    if (otpRecord.otp !== otp) {
      await otpRecord.save();

      return { message: "Invalid OTP", success: false };
    }
    otpRecord.verified = true;
    await otpRecord.save();

    // Clean up old OTPs for this user
    await otpModel.deleteMany({
      $or: [{ email }, { phone }],
      _id: { $ne: otpRecord._id },
    });

    return { message: "OTP verified", success: true };
  } catch (error) {
    console.log(error);
    return {
      message: error.message || "Error deleting Product",
      success: false,
    };
  }
};
