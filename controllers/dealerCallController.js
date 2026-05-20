const mongoose = require("mongoose");
const DealerCall = require("../models/dealerCallModel");
const Dealer = require("../models/dealerModel");
const admin = require("firebase-admin");

const generateDealerCallId = async () => {
  const calls = await DealerCall.find({}, { dealerCallId: 1, _id: 0 }).sort({
    dealerCallId: 1,
  });
  const ids = calls.map((c) => parseInt(c.dealerCallId.replace("DC", ""), 10));

  let id = 1;
  for (let i = 0; i < ids.length; i++) {
    if (id < ids[i]) break;
    id++;
  }
  return `DC${String(id).padStart(5, "0")}`;
};

const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) return;
  try {
    const message = {
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries({ type: "dealer_call", ...data }).map(([k, v]) => [
          k,
          String(v),
        ])
      ),
      token: fcmToken,
    };
    await admin.messaging().send(message);
  } catch (error) {
    if (
      error.code === "messaging/invalid-registration-token" ||
      error.code === "messaging/registration-token-not-registered"
    ) {
      console.warn("Invalid or expired FCM token.");
    } else {
      console.error("FCM send error:", error.message);
    }
  }
};

exports.createDealerCall = async (req, res) => {
  try {
    const {
      dealerId,
      customerName,
      contactNumber,
      address,
      area,
      pinCode,
      brand,
      product,
      serviceType,
      remarks,
    } = req.body;

    // Verify dealer exists and is active
    const dealer = await Dealer.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(dealerId) ? dealerId : null },
        { dealerId },
      ],
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    if (dealer.status === "inactive") {
      return res.status(403).json({ message: "Your account is inactive. Contact admin." });
    }

    const dealerCallId = await generateDealerCallId();

    const newCall = new DealerCall({
      dealerCallId,
      dealer: dealer._id,
      customerName,
      contactNumber,
      address,
      area,
      pinCode,
      brand,
      product,
      serviceType,
      remarks,
      status: "pending",
    });

    await newCall.save();

    const populatedCall = await DealerCall.findById(newCall._id)
      .populate("dealer")
      .populate("brand")
      .populate("product")
      .populate("serviceType");

    res.status(201).json({
      message: "Call submitted successfully",
      call: populatedCall,
    });
  } catch (error) {
    console.error("Error creating dealer call:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getMyCalls = async (req, res) => {
  try {
    const { dealerId } = req.query;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (dealerId) {
      if (mongoose.Types.ObjectId.isValid(dealerId)) {
        filter.dealer = dealerId;
      } else {
        const dealer = await Dealer.findOne({ dealerId });
        if (!dealer) {
          return res.status(200).json({ calls: [], total: 0, page: 1, totalPages: 0 });
        }
        filter.dealer = dealer._id;
      }
    }
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [calls, total] = await Promise.all([
      DealerCall.find(filter)
        .populate("dealer")
        .populate("brand")
        .populate("product")
        .populate("serviceType")
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      DealerCall.countDocuments(filter),
    ]);

    res.status(200).json({
      calls,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching dealer calls:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getAllDealerCalls = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, dealerId, customerName } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (dealerId) {
      if (mongoose.Types.ObjectId.isValid(dealerId)) {
        filter.dealer = dealerId;
      } else {
        const dealer = await Dealer.findOne({ dealerId });
        if (dealer) filter.dealer = dealer._id;
      }
    }
    if (customerName) {
      filter.customerName = { $regex: customerName, $options: "i" };
    }

    const skip = (page - 1) * limit;

    const [calls, total] = await Promise.all([
      DealerCall.find(filter)
        .populate("dealer")
        .populate("brand")
        .populate("product")
        .populate("serviceType")
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      DealerCall.countDocuments(filter),
    ]);

    res.status(200).json({
      calls,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching dealer calls:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getDealerCallById = async (req, res) => {
  try {
    const { id } = req.params;

    const call = await DealerCall.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { dealerCallId: id },
      ],
    })
      .populate("dealer")
      .populate("brand")
      .populate("product")
      .populate("serviceType");

    if (!call) {
      return res.status(404).json({ message: "Call not found" });
    }

    res.status(200).json(call);
  } catch (error) {
    console.error("Error fetching dealer call:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.approveCall = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminRemarks } = req.body;

    const call = await DealerCall.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { dealerCallId: id },
      ],
    }).populate("dealer");

    if (!call) {
      return res.status(404).json({ message: "Call not found" });
    }

    if (call.status !== "pending" && call.status !== "approved") {
      return res.status(400).json({ message: "Cannot approve this call" });
    }

    call.status = "approved";
    call.adminRemarks = adminRemarks || "";
    await call.save();

    const dealer = await Dealer.findById(call.dealer._id);
    await sendPushNotification(
      dealer?.fcmToken,
      "Call Approved ✅",
      `Your call for ${call.customerName} has been approved.`,
      { dealerCallId: call.dealerCallId, status: "approved" }
    );

    res.status(200).json({ message: "Call approved", call });
  } catch (error) {
    console.error("Error approving call:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.rejectCall = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminRemarks } = req.body;

    const call = await DealerCall.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { dealerCallId: id },
      ],
    }).populate("dealer");

    if (!call) {
      return res.status(404).json({ message: "Call not found" });
    }

    if (!["pending", "approved"].includes(call.status)) {
      return res.status(400).json({ message: "Cannot reject this call" });
    }

    call.status = "rejected";
    call.adminRemarks = adminRemarks || "";
    await call.save();

    const dealer = await Dealer.findById(call.dealer._id);
    await sendPushNotification(
      dealer?.fcmToken,
      "Call Rejected ❌",
      `Your call for ${call.customerName} has been rejected.`,
      { dealerCallId: call.dealerCallId, status: "rejected" }
    );

    res.status(200).json({ message: "Call rejected", call });
  } catch (error) {
    console.error("Error rejecting call:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.resetToPending = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminRemarks } = req.body;

    const call = await DealerCall.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { dealerCallId: id },
      ],
    }).populate("dealer");

    if (!call) {
      return res.status(404).json({ message: "Call not found" });
    }

    if (!["pending", "approved"].includes(call.status)) {
      return res.status(400).json({ message: "Cannot reset this call to pending" });
    }

    call.status = "pending";
    call.adminRemarks = adminRemarks || "";
    await call.save();

    const dealer = await Dealer.findById(call.dealer._id);
    await sendPushNotification(
      dealer?.fcmToken,
      "Call Reset to Pending ⏳",
      `Your call for ${call.customerName} has been reset to pending.`,
      { dealerCallId: call.dealerCallId, status: "pending" }
    );

    res.status(200).json({ message: "Call reset to pending", call });
  } catch (error) {
    console.error("Error resetting call to pending:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateDealerCall = async (req, res) => {
  try {
    const { id } = req.params;
    const { dealerId, customerName, contactNumber, address, area, pinCode, brand, product, serviceType, remarks } = req.body;

    const call = await DealerCall.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { dealerCallId: id },
      ],
    });

    if (!call) {
      return res.status(404).json({ message: "Call not found" });
    }

    if (dealerId) {
      const dealer = await Dealer.findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(dealerId) ? dealerId : null },
          { dealerId },
        ],
      });
      if (!dealer) {
        return res.status(404).json({ message: "Dealer not found" });
      }
      if (call.dealer.toString() !== dealer._id.toString()) {
        return res.status(403).json({ message: "Not authorized to update this call" });
      }
    } else {
      return res.status(400).json({ message: "dealerId is required" });
    }

    if (call.status === "approved") {
      return res.status(400).json({ message: "Cannot edit an approved call" });
    }

    if (customerName) call.customerName = customerName;
    if (contactNumber) call.contactNumber = contactNumber;
    if (address !== undefined) call.address = address;
    if (area !== undefined) call.area = area;
    if (pinCode !== undefined) call.pinCode = pinCode;
    if (brand) call.brand = brand;
    if (product) call.product = product;
    if (serviceType !== undefined) call.serviceType = serviceType;
    if (remarks !== undefined) call.remarks = remarks;

    await call.save();

    const populatedCall = await DealerCall.findById(call._id)
      .populate("dealer")
      .populate("brand")
      .populate("product")
      .populate("serviceType");

    res.status(200).json({ message: "Call updated successfully", call: populatedCall });
  } catch (error) {
    console.error("Error updating dealer call:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.deleteDealerCall = async (req, res) => {
  try {
    const { id } = req.params;
    const { dealerId } = req.query;

    const call = await DealerCall.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { dealerCallId: id },
      ],
    });

    if (!call) {
      return res.status(404).json({ message: "Call not found" });
    }

    if (call.status === "approved") {
      return res.status(400).json({ message: "Cannot delete an approved call" });
    }

    if (dealerId) {
      const dealer = await Dealer.findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(dealerId) ? dealerId : null },
          { dealerId },
        ],
      });
      if (!dealer) {
        return res.status(404).json({ message: "Dealer not found" });
      }
      if (call.dealer.toString() !== dealer._id.toString()) {
        return res.status(403).json({ message: "Not authorized to delete this call" });
      }
    } else {
      return res.status(400).json({ message: "dealerId is required" });
    }

    await DealerCall.findByIdAndDelete(call._id);

    res.status(200).json({ message: "Call deleted successfully" });
  } catch (error) {
    console.error("Error deleting dealer call:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.markApprovedById = async (dealerCallId) => {
  try {
    const call = await DealerCall.findById(dealerCallId);
    if (call && call.status !== "rejected") {
      await DealerCall.findByIdAndUpdate(dealerCallId, { status: "approved" });
    }
  } catch (error) {
    console.error("Error marking dealer call approved:", error.message);
  }
};

exports.updateFcmToken = async (req, res) => {
  try {
    const { dealerId, fcmToken } = req.body;

    if (!dealerId || !fcmToken) {
      return res.status(400).json({ message: "dealerId and fcmToken are required" });
    }

    const dealer = await Dealer.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(dealerId) ? dealerId : null },
        { dealerId },
      ],
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    dealer.fcmToken = fcmToken;
    await dealer.save();

    res.status(200).json({ message: "FCM token updated" });
  } catch (error) {
    console.error("Error updating FCM token:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.findStickyDealer = async (req, res) => {
  try {
    const { contactNumber, customerName } = req.query;

    if (!contactNumber && !customerName) {
      return res.status(400).json({ message: "contactNumber or customerName is required" });
    }

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const conditions = [];

    if (contactNumber && contactNumber.trim()) {
      conditions.push({ contactNumber: { $regex: `^${escapeRegex(contactNumber.trim())}$`, $options: "i" } });
    }
    if (customerName && customerName.trim()) {
      conditions.push({ customerName: { $regex: `^${escapeRegex(customerName.trim())}$`, $options: "i" } });
    }

    const dealerCall = await DealerCall.findOne({
      status: "approved",
      $or: conditions,
    })
      .sort({ createdAt: -1 })
      .populate("dealer", "name dealerCode phoneNumber dealerId");

    if (!dealerCall) {
      return res.status(200).json({ dealer: null, matchedBy: null });
    }

    const matchedBy =
      contactNumber && dealerCall.contactNumber.toLowerCase() === contactNumber.trim().toLowerCase()
        ? "contactNumber"
        : "customerName";

    res.status(200).json({
      dealer: dealerCall.dealer,
      matchedBy,
      dealerCallId: dealerCall.dealerCallId,
      customerName: dealerCall.customerName,
      contactNumber: dealerCall.contactNumber,
    });
  } catch (error) {
    console.error("Error finding sticky dealer:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};