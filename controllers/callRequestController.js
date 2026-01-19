const mongoose = require("mongoose");

const CallRequest = require("../models/callRequestModel");
const Customer = require("../models/customerModel");

const generateCallRequestId = async () => {
  const callRequests = await CallRequest.find(
    {},
    { callrequestId: 1, _id: 0 }
  ).sort({
    callrequestId: 1,
  });
  const callRequestIds = callRequests.map((callRequest) =>
    parseInt(callRequest.callrequestId.replace("callrequestId", ""), 10)
  );

  let callrequestId = 1;
  for (let i = 0; i < callRequestIds.length; i++) {
    if (callrequestId < callRequestIds[i]) {
      break;
    }
    callrequestId++;
  }

  return `callrequestId${String(callrequestId).padStart(4, "0")}`;
};

const generateCustomerId = async () => {
  const customers = await Customer.find({}, { customerId: 1, _id: 0 }).sort({
    customerId: 1,
  });
  const customerIds = customers.map((customer) =>
    parseInt(customer.customerId.replace("customerId", ""), 10)
  );

  let customerId = 1;
  for (let i = 0; i < customerIds.length; i++) {
    if (customerId < customerIds[i]) {
      break;
    }
    customerId++;
  }

  return `customerId${String(customerId).padStart(4, "0")}`;
};
exports.createCallRequest = async (req, res) => {
  try {
    const {
      call_service,
      customer,
      preferred_visit_date,
      remarks,
      name,
      mobile_number,
      request_type,
    } = req.body;

    let requestedCustomer = null;
    if (!customer && name && mobile_number) {
      const findingCustomer = await Customer.findOne({
        mobile_number,
      });

      if (findingCustomer) {
        requestedCustomer = findingCustomer._id;
      } else {
        const customerId = await generateCustomerId();
        const newCustomer = new Customer({
          customerId,
          name,
          mobile_number,
        });

        const savedCustomer = await newCustomer.save();
        requestedCustomer = savedCustomer._id;
      }
    } else if (customer) {
      requestedCustomer = customer;
    } else {
      return res.status(400).json({ error: "Customer is required" });
    }

    const callrequestId = await generateCallRequestId();
    const newCallRequest = new CallRequest({
      callrequestId,
      call_service,
      customer: requestedCustomer,
      preferred_visit_date: !isNaN(new Date(preferred_visit_date))
        ? new Date(preferred_visit_date)
        : null,
      remarks,
      request_type,
    });

    const savedCallRequest = await newCallRequest.save();
    res
      .status(201)
      .json({ message: "Call Request created successfully", savedCallRequest });
  } catch (error) {
    console.error("Error creating Customer:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getAllCallRequests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      sortBy = "createdAt",
      sortOrder = "desc",
      start_date,
      end_date,
      call_service,
      call_status,
      customer,
      request_type,
    } = req.query;

    const skip = (page - 1) * limit;

    const query = {};

    if (call_service) {
      query.call_service = call_service;
    }

    if (start_date && !isNaN(new Date(start_date))) {
      query.preferred_visit_date = { $gte: new Date(start_date) };
    }

    if (end_date && !isNaN(new Date(end_date))) {
      query.preferred_visit_date = {
        $lte: new Date(end_date).setHours(23, 59, 59),
      };
    }

    if (call_status) {
      query.call_status = call_status;
    }

    if (customer && mongoose.Types.ObjectId.isValid(customer)) {
      query.customer = customer;
    }

    if (request_type) {
      query.request_type = request_type;
    }

    const [callRequests, totalCallRequests] = await Promise.all([
      CallRequest.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .populate("customer"),
      CallRequest.countDocuments(query),
    ]);

    res.status(200).json({
      callRequests,
      totalCallRequests,
      currentPage: page,
      totalPages: Math.ceil(totalCallRequests / limit),
    });
  } catch (error) {
    console.error("Error creating Customer:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getCallRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const callRequest = await CallRequest.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : undefined },
        { callrequestId: id },
      ],
    }).populate("customer");
    if (!callRequest) {
      return res.status(404).json({ error: "Call Request not found" });
    }
    res.status(200).json(callRequest);
  } catch (error) {
    console.error("Error fetching Call Request by ID:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateCallRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      call_service,
      preferred_visit_date,
      remarks,
      call_status,
      request_type,
    } = req.body;

    const callRequest = await CallRequest.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : undefined },
        { callrequestId: id },
      ],
    });

    if (!callRequest) {
      return res.status(404).json({ error: "Call Request not found" });
    }

    callRequest.call_service = call_service || callRequest.call_service;
    callRequest.preferred_visit_date = !isNaN(new Date(preferred_visit_date))
      ? new Date(preferred_visit_date)
      : callRequest.preferred_visit_date;
    callRequest.remarks = remarks || callRequest.remarks;
    callRequest.call_status = call_status || callRequest.call_status;
    callRequest.request_type = request_type || callRequest.request_type;

    const updatedCallRequest = await callRequest.save();
    res.status(200).json({
      message: "Call Request updated successfully",
      updatedCallRequest,
    });
  } catch (error) {
    console.error("Error updating Call Request:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.deleteCallRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const callRequest = await CallRequest.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { callrequestId: id },
      ],
    });

    if (!callRequest) {
      return res.status(404).json({ message: "Call Request not found" });
    }

    await CallRequest.findByIdAndDelete(callRequest._id);
    res.status(200).json({ message: "Call Request deleted successfully" });
  } catch (error) {
    console.error("Error updating Call Request:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getCallRequestsFilter = async (req, res) => {
  try {
    const [callRequestServices] = await Promise.all([
      CallRequest.distinct("call_service", {
        call_service: { $ne: "" },
      }),
    ]);

    res.status(200).json({ call_request_services: callRequestServices });
  } catch (error) {
    console.error("Error updating Call Request:", error);
    res.status(500).json({ error: "Server error" });
  }
};
