const mongoose = require("mongoose");
const AdditionalCall = require("../models/additionalCallModel");

const generateAdditionalCallId = async () => {
  const callRequests = await AdditionalCall.find(
    {},
    { callId: 1, _id: 0 },
  ).sort({
    callId: 1,
  });
  const callRequestIds = callRequests.map((callRequest) =>
    parseInt(callRequest.callId.replace("callId", ""), 10),
  );

  let callrequestId = 1;
  for (let i = 0; i < callRequestIds.length; i++) {
    if (callrequestId < callRequestIds[i]) {
      break;
    }
    callrequestId++;
  }

  return `callId${String(callrequestId).padStart(4, "0")}`;
};

exports.addNewAdditionalCall = async (req, res) => {
  try {
    const {
      requested_date,
      service_type,
      additional_service_type,
      visit_date,
      total_amount,
      profit_amount,
      commission_amount,
      customer,
      remarks,
    } = req.body;
    const callId = await generateAdditionalCallId();
    const newCall = new AdditionalCall({
      callId,
      requested_date,
      service_type,
      additional_service_type,
      visit_date,
      total_amount,
      profit_amount,
      commission_amount,
      customer,
      remarks,
    });
    await newCall.save();
    res.status(201).json({ message: "Call added successfully", call: newCall });
  } catch (error) {
    console.error("Error creating Customer:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

exports.getAllAdditionalCalls = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy,
      sortOrder,
      status,
      start_date,
      end_date,
      search,
      service_type,
      additional_service_type,
    } = req.query;

    const skip = (page - 1) * limit;

    const query = {};

    if (status) {
      query.status = status;
    }

    // Fix for date filtering with $or
    if (start_date && !isNaN(new Date(start_date))) {
      const startDate = new Date(start_date);
      query.$or = [
        { createdAt: { $gte: startDate } },
        { requested_date: { $gte: startDate } },
        { visit_date: { $gte: startDate } },
      ];
    }

    if (end_date && !isNaN(new Date(end_date))) {
      const endDate = new Date(end_date);
      endDate.setHours(23, 59, 59, 999);

      // If $or already exists (from start_date), merge conditions
      if (query.$or) {
        // Apply $lte to all date fields in the existing $or
        query.$or = query.$or.map((condition) => {
          const field = Object.keys(condition)[0];
          return { [field]: { ...condition[field], $lte: endDate } };
        });
      } else {
        query.$or = [
          { createdAt: { $lte: endDate } },
          { requested_date: { $lte: endDate } },
          { visit_date: { $lte: endDate } },
        ];
      }
    }

    if (service_type) {
      query.service_type = service_type;
    }

    if (additional_service_type) {
      query.additional_service_type = additional_service_type;
    }

    if (search) {
      if (query.$or) {
        query.$or.push({ callId: { $regex: search, $options: "i" } });
        query.$or.push({ remarks: { $regex: search, $options: "i" } });
      } else {
        query.$or = [{ callId: { $regex: search, $options: "i" } }];
        query.$or.push({ remarks: { $regex: search, $options: "i" } });
      }
    }

    const sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;
    }

    const callRequests = await AdditionalCall.find(query)
      .populate("customer")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalCallRequests = await AdditionalCall.countDocuments(query);

    res.status(200).json({
      data: callRequests,
      pagination: {
        total: totalCallRequests,
        currentPage: page,
        totalPages: Math.ceil(totalCallRequests / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching Call Requests:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

exports.getAdditionalCallById = async (req, res) => {
  try {
    const { id } = req.params;
    const callRequest = await AdditionalCall.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : undefined },
        { callId: id },
      ],
    }).populate("customer");
    if (!callRequest) {
      return res.status(404).json({ error: "Call Request not found" });
    }
    res.status(200).json(callRequest);
  } catch (error) {
    console.error("Error fetching Call Request by ID:", error.message);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

exports.deleteAdditionalCall = async (req, res) => {
  try {
    const { id } = req.params;

    const callRequest = await AdditionalCall.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { callId: id },
      ],
    });

    if (!callRequest) {
      return res.status(404).json({ message: "Call Request not found" });
    }

    await AdditionalCall.findByIdAndDelete(callRequest._id);
    res.status(200).json({ message: "Call Request deleted successfully" });
  } catch (error) {
    console.error("Error updating Call Request:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

exports.updateAdditionalCall = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      requested_date,
      service_type,
      additional_service_type,
      visit_date,
      total_amount,
      profit_amount,
      commission_amount,
      customer,
      remarks,
      status,
    } = req.body;

    const callRequest = await AdditionalCall.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { callId: id },
      ],
    });

    if (!callRequest) {
      return res.status(404).json({ error: "Call Request not found" });
    }

    callRequest.requested_date = requested_date || callRequest.requested_date;
    callRequest.service_type = service_type || callRequest.service_type;
    callRequest.additional_service_type =
      additional_service_type || callRequest.additional_service_type;
    callRequest.visit_date = visit_date || callRequest.visit_date;
    callRequest.total_amount = total_amount || callRequest.total_amount;
    callRequest.profit_amount = profit_amount || callRequest.profit_amount;
    callRequest.commission_amount =
      commission_amount || callRequest.commission_amount;
    callRequest.customer = customer || callRequest.customer;
    callRequest.remarks = remarks || callRequest.remarks;
    callRequest.status = status || callRequest.status;

    await callRequest.save();
    res.status(200).json({ message: "Call Request updated successfully" });
  } catch (error) {
    console.error("Error updating Call Request:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};
