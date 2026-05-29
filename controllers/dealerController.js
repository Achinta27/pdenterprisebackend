const mongoose = require("mongoose");
const Dealer = require("../models/dealerModel");
const jwt = require("jsonwebtoken");
const { verifyOTP } = require("../middlewares/otp");
const { uploadToS3, deleteFromS3 } = require("../middlewares/awsS3");

const generateDealerId = async () => {
  const dealers = await Dealer.find({}, { dealerId: 1, _id: 0 }).sort({
    dealerId: 1,
  });
  const dealerIds = dealers.map((d) =>
    parseInt(d.dealerId.replace("DL", ""), 10)
  );

  let id = 1;
  for (let i = 0; i < dealerIds.length; i++) {
    if (id < dealerIds[i]) break;
    id++;
  }
  return `DL${String(id).padStart(5, "0")}`;
};

exports.createDealer = async (req, res) => {
  try {
    const {
      name,
      phoneNumber,
      password,
      dealerCode,
      status,
      aadharNo,
      panCardNo,
      upiId,
      bankAccountName,
      ifsc,
      payeeName,
      remarks,
    } = req.body;

    const dealerId = await generateDealerId();

    let qrCodeImage = "";
    if (req.files && req.files.qrCodeImage) {
      const file = req.files.qrCodeImage;
      const result = await uploadToS3(
        file.tempFilePath,
        file.mimetype,
        "dealer-qr"
      );
      qrCodeImage = result.secure_url;
    }

    const newDealer = new Dealer({
      dealerId,
      name,
      phoneNumber,
      password,
      dealerCode,
      status: status || "active",
      aadharNo,
      panCardNo,
      upiId,
      qrCodeImage,
      bankAccountName,
      ifsc,
      payeeName,
      remarks,
    });

    await newDealer.save();

    res.status(201).json({ message: "Dealer created successfully", dealer: newDealer });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ error: `${field} already exists. Please try another.` });
    }
    console.error("Error creating Dealer:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.loginDealer = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const dealer = await Dealer.findOne({ phoneNumber });

    if (!dealer) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (dealer.status === "inactive") {
      return res.status(403).json({ message: "Your account is inactive. Contact admin." });
    }

    const isMatch = await dealer.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: dealer._id, role: "dealer" },
      process.env.SECRET_KEY,
      { expiresIn: "30d" }
    );

    res.status(200).json({ dealer, token });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.loginDealerWithOTP = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ message: "Phone and OTP are required" });
    }

    const { success } = await verifyOTP({
      otp,
      phone: phoneNumber,
      type: "login",
    });

    if (!success) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const dealer = await Dealer.findOne({ phoneNumber });

    if (!dealer) {
      return res.status(400).json({ message: "Dealer not found" });
    }

    if (dealer.status === "inactive") {
      return res.status(403).json({ message: "Your account is inactive. Contact admin." });
    }

    const token = jwt.sign(
      { id: dealer._id, role: "dealer" },
      process.env.SECRET_KEY,
      { expiresIn: "30d" }
    );

    res.status(200).json({ dealer, token });
  } catch (error) {
    console.error("OTP login error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.getAllDealers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      name,
      phoneNumber,
      dealerCode,
      status,
    } = req.query;

    const filter = {};

    if (status) filter.status = status;

    const orConditions = [];
    if (name) orConditions.push({ name: { $regex: name, $options: "i" } });
    if (phoneNumber) orConditions.push({ phoneNumber: { $regex: phoneNumber, $options: "i" } });
    if (dealerCode) orConditions.push({ dealerCode: { $regex: dealerCode, $options: "i" } });
    if (orConditions.length > 0) filter.$or = orConditions;

    const skip = (page - 1) * limit;

    const [dealers, total] = await Promise.all([
      Dealer.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Dealer.countDocuments(filter),
    ]);

    res.status(200).json({
      dealers,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching dealers:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getDealerById = async (req, res) => {
  try {
    const { dealerId } = req.params;

    const dealer = await Dealer.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(dealerId) ? dealerId : null },
        { dealerId },
      ],
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    res.status(200).json(dealer);
  } catch (error) {
    console.error("Error fetching dealer:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateDealer = async (req, res) => {
  try {
    const { dealerId } = req.params;

    const dealer = await Dealer.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(dealerId) ? dealerId : null },
        { dealerId },
      ],
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const {
      name,
      phoneNumber,
      password,
      dealerCode,
      status,
      aadharNo,
      panCardNo,
      upiId,
      bankAccountName,
      ifsc,
      payeeName,
      remarks,
    } = req.body;

    if (name !== undefined) dealer.name = name;
    if (phoneNumber !== undefined) dealer.phoneNumber = phoneNumber;
    if (dealerCode !== undefined) dealer.dealerCode = dealerCode;
    if (status !== undefined) dealer.status = status;
    if (aadharNo !== undefined) dealer.aadharNo = aadharNo;
    if (panCardNo !== undefined) dealer.panCardNo = panCardNo;
    if (upiId !== undefined) dealer.upiId = upiId;
    if (bankAccountName !== undefined) dealer.bankAccountName = bankAccountName;
    if (ifsc !== undefined) dealer.ifsc = ifsc;
    if (payeeName !== undefined) dealer.payeeName = payeeName;
    if (remarks !== undefined) dealer.remarks = remarks;
    if (password !== undefined && password !== "") dealer.password = password;

    if (req.files && req.files.qrCodeImage) {
      const file = req.files.qrCodeImage;
      const result = await uploadToS3(file.tempFilePath, file.mimetype, "dealer-qr");
      if (dealer.qrCodeImage) {
        await deleteFromS3(dealer.qrCodeImage);
      }
      dealer.qrCodeImage = result.secure_url;
    }

    await dealer.save();

    res.status(200).json({ message: "Dealer updated successfully", dealer });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ error: `${field} already exists.` });
    }
    console.error("Error updating dealer:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateDealerStatus = async (req, res) => {
  try {
    const { dealerId } = req.params;
    const { status } = req.body;

    const dealer = await Dealer.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(dealerId) ? dealerId : null },
        { dealerId },
      ],
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    dealer.status = status || dealer.status;
    await dealer.save();

    res.status(200).json({ message: "Dealer status updated", dealer });
  } catch (error) {
    console.error("Error updating dealer status:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.deleteDealer = async (req, res) => {
  try {
    const { dealerId } = req.params;

    const dealer = await Dealer.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(dealerId) ? dealerId : null },
        { dealerId },
      ],
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    if (dealer.qrCodeImage) {
      await deleteFromS3(dealer.qrCodeImage);
    }
    await Dealer.findByIdAndDelete(dealer._id);

    res.status(200).json({ message: "Dealer deleted successfully" });
  } catch (error) {
    console.error("Error deleting dealer:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateFcmToken = async (req, res) => {
  try {
    const { dealerId } = req.params;
    const { fcmToken } = req.body;

    const dealer = await Dealer.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(dealerId) ? dealerId : null },
        { dealerId },
      ],
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    dealer.fcmToken = fcmToken || "";
    await dealer.save();

    res.status(200).json({ message: "FCM token updated", dealer });
  } catch (error) {
    console.error("Error updating FCM token:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};