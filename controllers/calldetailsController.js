const mongoose = require("mongoose");
const CallDetails = require("../models/calldetailsModel");
const path = require("path");
const fs = require("fs");
const fastcsv = require("fast-csv");

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequenceValue: { type: Number, required: true },
});

const Counter = mongoose.model("Counter", counterSchema);

const getNextSequenceValue = async (sequenceName) => {
  const sequenceDocument = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { sequenceValue: 1 } },
    { new: true, upsert: true }
  );
  return sequenceDocument.sequenceValue;
};

const generateCalldetailsId = async () => {
  let isUnique = false;
  let calldetailsId = "";

  while (!isUnique) {
    const sequenceValue = await getNextSequenceValue("calldetailsId");
    calldetailsId = `CD${String(sequenceValue).padStart(6, "0")}`;

    const existingCallDetail = await CallDetails.findOne({ calldetailsId });
    if (!existingCallDetail) {
      isUnique = true;
    }
  }

  return calldetailsId;
};

const NodeCache = require("node-cache");
const engineerModel = require("../models/engineerModel");

const cache = new NodeCache({ stdTTL: 300 });

// Controller for creating a new call detail
exports.createCallDetails = async (req, res) => {
  try {
    const calldetailsId = await generateCalldetailsId();

    const callDetailsData = {
      ...req.body,
      calldetailsId,
      engineer: mongoose.Types.ObjectId.isValid(req.body.engineer)
        ? req.body.engineer
        : null,
    };
    const newCallDetails = new CallDetails(callDetailsData);
    await newCallDetails.save();

    const cacheKeysToInvalidate = cache
      .keys()
      .filter((key) => key.includes("allCallDetails") || key.includes("page:"));
    cacheKeysToInvalidate.forEach((key) => cache.del(key));

    res.status(201).json({
      message: "Call Details Created Successfully",
      data: newCallDetails,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const message = `${field} must be unique. The value '${error.keyValue[field]}' already exists.`;
      if (field === "contactNumber") {
        message = "Mobile number already exists.";
      }
      console.error("Error creating call details:", error);
      return res.status(400).json({
        message: "Validation Error",
        error: message,
      });
    }
    res.status(500).json({
      message: "Error creating call details",
      error: error.message,
    });
  }
};

exports.getCallDetails = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const {
      teamleaderId,
      brand,
      jobStatus,
      engineer,
      number,
      serviceType,
      warrantyTerms,
      commissionOw,
      noEngineer,
      followup,
      notClose,
      startDate,
      endDate,
      startGdDate,
      endGdDate,
      startVisitDate,
      endVisitDate,
      sortBy,
      chooseFollowupstartdate,
      chooseFollowupenddate,
      amountmissmatched,
      productsName,
    } = req.query;

    let cacheKey = `page:${page}-limit:${limit}`;
    if (teamleaderId) cacheKey += `-teamleader:${teamleaderId}`;
    if (brand) cacheKey += `-brand:${brand}`;
    if (jobStatus) cacheKey += `-jobStatus:${jobStatus}`;
    if (engineer) cacheKey += `-engineer:${engineer}`;
    if (number) cacheKey += `-number:${number}`;
    if (serviceType) cacheKey += `-serviceType:${serviceType}`;
    if (warrantyTerms) cacheKey += `-warrantyTerms:${warrantyTerms}`;
    if (commissionOw) cacheKey += `-commissionOw:${commissionOw}`;
    if (amountmissmatched)
      cacheKey += `-amountmissmatched:${amountmissmatched}`;
    if (noEngineer) cacheKey += `-noEngineer:${noEngineer}`;
    if (followup) cacheKey += `-followup:${followup}`;
    if (notClose) cacheKey += `-notClose:${notClose}`;
    if (startDate) cacheKey += `-startdate:${startDate}`;
    if (endDate) cacheKey += `-enddate:${endDate}`;
    if (startGdDate) cacheKey += `-startGdDate:${startGdDate}`;
    if (endGdDate) cacheKey += `-endGdDate:${endGdDate}`;
    if (startVisitDate) cacheKey += `-startVisitDate:${startVisitDate}`;
    if (endVisitDate) cacheKey += `-endVisitDate:${endVisitDate}`;
    if (sortBy) cacheKey += `-sortBy:${sortBy}`;
    if (chooseFollowupstartdate)
      cacheKey += `-chooseFollowupstartdate:${chooseFollowupstartdate}`;
    if (chooseFollowupenddate)
      cacheKey += `-chooseFollowupenddate:${chooseFollowupenddate}`;
    if (productsName) cacheKey += `-productsName:${productsName}`;

    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const match = {};
    if (teamleaderId) match.teamleaderId = teamleaderId;
    if (brand) match.brandName = brand;
    if (jobStatus) match.jobStatus = jobStatus;
    if (engineer) {
      // Check if the provided 'engineer' string is a valid 24-character hex string for an ObjectId
      if (mongoose.Types.ObjectId.isValid(engineer)) {
        match.engineer = new mongoose.Types.ObjectId(engineer);
      } else if (
        engineer === "" ||
        engineer === null ||
        engineer === undefined ||
        engineer === "null" ||
        engineer === "undefined"
      ) {
        match.engineer = null;
      } else {
        console.warn(
          `Invalid engineer ID format provided: "${engineer}". Ignoring this filter.`
        );
        // Optionally, you might want to send an error response to the client:
        // return res.status(400).json({ message: "Invalid engineer ID format." });
      }
    }
    if (number) {
      match.$or = [
        { contactNumber: { $regex: number, $options: "i" } },
        { callNumber: { $regex: number, $options: "i" } },
        { whatsappNumber: { $regex: number, $options: "i" } },
        { customerName: { $regex: number, $options: "i" } },
        { modelNumber: { $regex: number, $options: "i" } },
        { iduser: { $regex: number, $options: "i" } },
        { oduser: { $regex: number, $options: "i" } },
        { parts: { $regex: number, $options: "i" } },
      ];
    }
    if (serviceType) match.serviceType = serviceType;
    if (warrantyTerms) match.warrantyTerms = warrantyTerms;

    if (noEngineer === "true") {
      delete match.engineer;
      match.engineer = null;
    }

    if (commissionOw === "true") {
      match.commissionow = { $in: [null, ""] };
    }

    if (followup === "true") {
      match.followupdate = { $ne: null };
    }

    if (notClose === "true") {
      match.jobStatus = { $ne: "CLOSED" };
    }

    if (productsName) {
      match.productsName = productsName;
    }

    if (amountmissmatched === "true") {
      match.$or = [
        {
          $and: [
            { closerCode: { $ne: "$receivefromEngineer" } },
            { closerCode: { $ne: "" } },
            { receivefromEngineer: { $ne: "" } },
          ],
        },
      ];
    }

    if (startDate && endDate) {
      const startOfDay = new Date(
        Date.UTC(
          new Date(startDate).getUTCFullYear(),
          new Date(startDate).getUTCMonth(),
          new Date(startDate).getUTCDate(),
          0,
          0,
          0,
          0
        )
      );

      const endOfDay = new Date(
        Date.UTC(
          new Date(endDate).getUTCFullYear(),
          new Date(endDate).getUTCMonth(),
          new Date(endDate).getUTCDate(),
          23,
          59,
          59,
          999
        )
      );

      match.callDate = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    } else if (startDate) {
      const startOfDay = new Date(
        Date.UTC(
          new Date(startDate).getUTCFullYear(),
          new Date(startDate).getUTCMonth(),
          new Date(startDate).getUTCDate(),
          0,
          0,
          0,
          0
        )
      );

      const endOfDay = new Date(
        Date.UTC(
          new Date(startDate).getUTCFullYear(),
          new Date(startDate).getUTCMonth(),
          new Date(startDate).getUTCDate(),
          23,
          59,
          59,
          999
        )
      );

      match.callDate = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    if (startGdDate && endGdDate) {
      const startOfDayGDdate = new Date(
        Date.UTC(
          new Date(startGdDate).getUTCFullYear(),
          new Date(startGdDate).getUTCMonth(),
          new Date(startGdDate).getUTCDate(),
          0,
          0,
          0,
          0
        )
      );

      const endOfDayGDdate = new Date(
        Date.UTC(
          new Date(endGdDate).getUTCFullYear(),
          new Date(endGdDate).getUTCMonth(),
          new Date(endGdDate).getUTCDate(),
          23,
          59,
          59,
          999
        )
      );

      match.gddate = {
        $gte: startOfDayGDdate,
        $lte: endOfDayGDdate,
      };
    } else if (startGdDate) {
      const startOfDayGDdate = new Date(
        Date.UTC(
          new Date(startGdDate).getUTCFullYear(),
          new Date(startGdDate).getUTCMonth(),
          new Date(startGdDate).getUTCDate(),
          0,
          0,
          0,
          0
        )
      );

      const endOfDayGDdate = new Date(
        Date.UTC(
          new Date(startGdDate).getUTCFullYear(),
          new Date(startGdDate).getUTCMonth(),
          new Date(startGdDate).getUTCDate(),
          23,
          59,
          59,
          999
        )
      );

      match.gddate = {
        $gte: startOfDayGDdate,
        $lte: endOfDayGDdate,
      };
    }

    if (startVisitDate && endVisitDate) {
      const startOfDayVisitdate = new Date(
        Date.UTC(
          new Date(startVisitDate).getUTCFullYear(),
          new Date(startVisitDate).getUTCMonth(),
          new Date(startVisitDate).getUTCDate(),
          0,
          0,
          0,
          0
        )
      );

      const endOfDayVisitdate = new Date(
        Date.UTC(
          new Date(endVisitDate).getUTCFullYear(),
          new Date(endVisitDate).getUTCMonth(),
          new Date(endVisitDate).getUTCDate(),
          23,
          59,
          59,
          999
        )
      );

      match.visitdate = {
        $gte: startOfDayVisitdate,
        $lte: endOfDayVisitdate,
      };
    } else if (startVisitDate) {
      const startOfDayVisitdate = new Date(
        Date.UTC(
          new Date(startVisitDate).getUTCFullYear(),
          new Date(startVisitDate).getUTCMonth(),
          new Date(startVisitDate).getUTCDate(),
          0,
          0,
          0,
          0
        )
      );

      const endOfDayVisitdate = new Date(
        Date.UTC(
          new Date(startVisitDate).getUTCFullYear(),
          new Date(startVisitDate).getUTCMonth(),
          new Date(startVisitDate).getUTCDate(),
          23,
          59,
          59,
          999
        )
      );

      match.visitdate = {
        $gte: startOfDayVisitdate,
        $lte: endOfDayVisitdate,
      };
    }

    if (chooseFollowupstartdate && chooseFollowupenddate) {
      // If both start and end date are provided, filter between the range
      const startfollowupdate = new Date(
        Date.UTC(
          new Date(chooseFollowupstartdate).getUTCFullYear(),
          new Date(chooseFollowupstartdate).getUTCMonth(),
          new Date(chooseFollowupstartdate).getUTCDate(),
          0,
          0,
          0,
          0
        )
      );

      const endfollowupdate = new Date(
        Date.UTC(
          new Date(chooseFollowupenddate).getUTCFullYear(),
          new Date(chooseFollowupenddate).getUTCMonth(),
          new Date(chooseFollowupenddate).getUTCDate(),
          23,
          59,
          59,
          999
        )
      );

      match.followupdate = {
        $gte: startfollowupdate,
        $lte: endfollowupdate,
      };
    } else if (chooseFollowupstartdate) {
      // If only the start date is provided, return data only for that specific date
      const startfollowupdate = new Date(
        Date.UTC(
          new Date(chooseFollowupstartdate).getUTCFullYear(),
          new Date(chooseFollowupstartdate).getUTCMonth(),
          new Date(chooseFollowupstartdate).getUTCDate(),
          0,
          0,
          0,
          0
        )
      );

      const endfollowupdate = new Date(
        Date.UTC(
          new Date(chooseFollowupstartdate).getUTCFullYear(),
          new Date(chooseFollowupstartdate).getUTCMonth(),
          new Date(chooseFollowupstartdate).getUTCDate(),
          23,
          59,
          59,
          999
        )
      );

      match.followupdate = {
        $gte: startfollowupdate,
        $lte: endfollowupdate,
      };
    }

    const totalDocuments = await CallDetails.countDocuments(match);
    const noEngineerCount = await CallDetails.countDocuments({
      engineer: null,
    });

    let amountMissMatchedCount = 0;

    const amountMissMatchedMatch = {
      $or: [
        {
          $and: [
            { closerCode: { $ne: "$receivefromEngineer" } },
            { closerCode: { $ne: "" } },
            { receivefromEngineer: { $ne: "" } },
          ],
        },
      ],
    };

    amountMissMatchedCount = await CallDetails.countDocuments(
      amountMissMatchedMatch
    );

    const pipeline = [{ $match: match }];

    pipeline.push({
      $lookup: {
        from: "engineernames", // Replace 'users' with the actual name of your User collection
        localField: "engineer",
        foreignField: "_id",
        as: "engineer",
      },
    });

    // Unwind the engineerDetails array to get a single engineer object (if engineer is a single reference)
    // If engineer can be an array of engineers, you might not want to unwind or handle it differently
    pipeline.push({
      $unwind: {
        path: "$engineer",
        preserveNullAndEmptyArrays: true, // This is important to keep documents that don't have an engineer
      },
    });

    // Apply sorting based on the 'sortBy' parameter
    if (sortBy === "gddate") {
      pipeline.push(
        {
          $addFields: {
            isGddateNull: {
              $cond: {
                if: {
                  $or: [{ $eq: ["$gddate", null] }, { $eq: ["$gddate", ""] }],
                },
                then: 1,
                else: 0,
              },
            },
          },
        },
        {
          $sort: {
            isGddateNull: -1,
            gddate: 1,
            createdAt: -1,
          },
        }
      );
    } else if (sortBy === "visitdate") {
      pipeline.push(
        {
          $addFields: {
            isJobClosed: {
              $cond: [{ $in: ["$jobStatus", ["CLOSED", "CANCEL"]] }, 1, 0],
            },
          },
        },
        {
          $sort: {
            isJobClosed: 1,
            visitdate: 1,
            createdAt: -1,
          },
        }
      );
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const callDetails = await CallDetails.aggregate(pipeline);

    const totalPages = Math.ceil(totalDocuments / limit);

    const result = {
      page,
      totalPages,
      totalDocuments,
      noEngineerCount,
      amountMissMatchedCount,
      data: callDetails,
    };

    cache.set(cacheKey, result);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching call details:", error);
    res.status(500).json({
      message: "Error fetching call details",
      error: error.message,
    });
  }
};

// Fetch unique filter options for dropdowns
exports.fetchFilters = async (req, res) => {
  try {
    const uniqueBrands = await CallDetails.distinct("brandName", {
      brandName: { $ne: "" },
    });
    const uniqueWarrantyTerms = await CallDetails.distinct("warrantyTerms", {
      warrantyTerms: { $ne: "" },
    });
    const uniqueServiceTypes = await CallDetails.distinct("serviceType", {
      serviceType: { $ne: "" },
    });
    const uniqueJobStatus = await CallDetails.distinct("jobStatus", {
      jobStatus: { $ne: "" },
    });
    const uniqueEngineerIds = await CallDetails.distinct("engineer", {
      engineer: { $ne: null },
    });

    const uniqueEngineers = await engineerModel.find({
      _id: { $in: uniqueEngineerIds },
    });

    const filters = {
      brands: uniqueBrands,
      warrantyTerms: uniqueWarrantyTerms,
      serviceTypes: uniqueServiceTypes,
      jobStatuss: uniqueJobStatus,
      engineers: uniqueEngineers,
    };

    // Send unique filter options as response
    res.status(200).json(filters);
  } catch (error) {
    console.error("Error fetching filter options:", error);
    res.status(500).json({
      message: "Error fetching filter options",
      error: error.message,
    });
  }
};

exports.getCallDetailsById = async (req, res) => {
  try {
    const { calldetailsId } = req.params;
    const callDetail = await CallDetails.findOne({
      $or: [
        { calldetailsId: calldetailsId },
        {
          _id: mongoose.Types.ObjectId.isValid(calldetailsId)
            ? calldetailsId
            : null,
        },
      ],
    })
      .populate("engineer")
      .lean();

    if (!callDetail) {
      return res.status(404).json({
        message: "Call detail not found",
      });
    }

    res.status(200).json({
      data: callDetail,
    });
  } catch (error) {
    console.error("Error fetching call details by ID:", error);
    res.status(500).json({
      message: "Error fetching call details",
      error: error.message,
    });
  }
};

// Controller for updating call details with second part of data
exports.updateCallDetailsPart2 = async (req, res) => {
  try {
    const { calldetailsId } = req.params;
    const updateData = {
      receivefromEngineer: req.body.receivefromEngineer,
      amountReceived: req.body.amountReceived,
      commissionow: req.body.commissionow,
      serviceChange: req.body.serviceChange,
      commissionDate: req.body.commissionDate,
      NPS: req.body.NPS,
      incentive: req.body.incentive,
      expenses: req.body.expenses,
      approval: req.body.approval,
      totalAmount: req.body.totalAmount,
      commissioniw: req.body.commissioniw,
      partamount: req.body.partamount,
    };

    const updatedCallDetails = await CallDetails.findOneAndUpdate(
      { calldetailsId },
      { $set: updateData },
      { new: true }
    );

    if (!updatedCallDetails) {
      return res.status(404).json({
        message: `Call Details with ID ${calldetailsId} not found`,
      });
    }
    const cacheKeysToInvalidate = cache.keys().filter((key) => {
      return key.includes(calldetailsId) || key.includes("page:");
    });
    cacheKeysToInvalidate.forEach((key) => cache.del(key));
    res.status(200).json({
      message: "Call Details Updated Successfully",
      data: updatedCallDetails,
    });
  } catch (error) {
    console.error("Error updating call details:", error);
    res.status(500).json({
      message: "Error updating call details",
      error: error.message,
    });
  }
};

exports.updateCallDetails = async (req, res) => {
  try {
    const { calldetailsId } = req.params;
    const updateData = req.body;

    const dateFields = [
      "callDate",
      "visitdate",
      "dateofPurchase",
      "followupdate",
      "gddate",
      "commissionDate",
    ];

    dateFields.forEach((field) => {
      if (updateData[field]) {
        const date = new Date(updateData[field]);
        updateData[field] = new Date(
          Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
        );
      }
    });

    if (!mongoose.Types.ObjectId.isValid(updateData.engineer)) {
      updateData.engineer = null;
    }

    const updatedCallDetails = await CallDetails.findOneAndUpdate(
      {
        $or: [
          { calldetailsId: calldetailsId },
          {
            _id: mongoose.Types.ObjectId.isValid(calldetailsId)
              ? calldetailsId
              : null,
          },
        ],
      },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedCallDetails) {
      return res.status(404).json({
        message: `Call Details with ID ${calldetailsId} not found`,
      });
    }
    const cacheKeysToInvalidate = cache.keys().filter((key) => {
      return key.includes(calldetailsId) || key.includes("page:");
    });
    cacheKeysToInvalidate.forEach((key) => cache.del(key));
    res.status(200).json({
      message: "Call Details Updated Successfully",
      data: updatedCallDetails,
    });
  } catch (error) {
    if (error.code === 11000) {
      // Handle duplicate key errors (e.g., unique index violations)
      const field = Object.keys(error.keyValue)[0];
      let message = `${field} must be unique. The value '${error.keyValue[field]}' already exists.`;

      // Specific message for contactNumber duplicate
      if (field === "contactNumber") {
        message = "Mobile number already exists.";
      }
      return res.status(400).json({
        message: "Validation Error",
        error: message,
      });
    }

    // Generic error handling for other issues
    console.error("Error Updating call details:", error);
    res.status(500).json({
      message: "Failed to update call details due to an internal server error.",
      error: error.message,
    });
  }
};

const parseDate = (dateString) => {
  if (!dateString) return null;

  // Handle both MM-DD-YYYY and MM/DD/YYYY formats
  const parts = dateString.split(/[-\/]/);

  if (parts.length !== 3) {
    return null; // If the date is not in the expected format, return null
  }

  const month = parseInt(parts[0], 10) - 1; // JavaScript months are 0-indexed
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  // Check if the parsed values are valid
  if (isNaN(month) || isNaN(day) || isNaN(year)) {
    return null; // Invalid date parts
  }

  const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0));

  return utcDate;
};

exports.excelImport = async (req, res) => {
  let filePath; // Declare filePath here to make it accessible in the outer catch block
  try {
    if (!req.files || !req.files.file) {
      console.log("No file uploaded");
      return res.status(400).send({ message: "No file uploaded" });
    }

    const file = req.files.file;
    const uploadDir = path.join(__dirname, "../uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    filePath = path.join(uploadDir, file.name); // Assign filePath here
    await file.mv(filePath);

    const fileExtension = path.extname(file.name).toLowerCase();
    if (fileExtension !== ".csv") {
      console.log("Unsupported file type");
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).send({ message: "Only CSV files are supported" });
    }

    const validCalldetails = [];
    const duplicateNumbersInFile = [];
    const duplicateNumbersInDB = [];
    const seenNumbersInFile = new Set(); // Renamed for clarity

    const processRow = async (item) => {
      const calldetailsId = await generateCalldetailsId();
      const calldetailsData = {
        calldetailsId,
        callDate: parseDate(item["callDate"]?.trim()),
        visitdate: parseDate(item["visitdate"]?.trim()),
        callNumber: item["callNumber"]?.trim(),
        brandName: item["brandName"]?.trim(),
        customerName: item["customerName"]?.trim(),
        address: item["address"]?.trim(),
        route: item["route"]?.trim(),
        contactNumber: item["contactNumber"]?.trim(),
        whatsappNumber: item["whatsappNumber"]?.trim(),
        engineer: null, // Set engineer to null as requested
        productsName: item["productsName"]?.trim(),
        warrantyTerms: item["warrantyTerms"]?.trim(),
        serviceType: item["serviceType"]?.trim(),
        remarks: item["remarks"]?.trim(),
        parts: item["parts"]?.trim(),
        jobStatus: item["jobStatus"]?.trim(),
        modelNumber: item["modelNumber"]?.trim(),
        iduser: item["iduser"]?.trim(),
        closerCode: item["closerCode"]?.trim(),
        dateofPurchase: parseDate(item["dateofPurchase"]?.trim()),
        oduser: item["oduser"]?.trim(),
        followupdate: parseDate(item["followupdate"]?.trim()),
        gddate: parseDate(item["gddate"]?.trim()),
        receivefromEngineer: item["receivefromEngineer"]?.trim(),
        amountReceived: item["amountReceived"]?.trim(),
        commissionow: item["commissionow"]?.trim(),
        serviceChange: item["serviceChange"]?.trim(),
        commissionDate: parseDate(item["commissionDate"]?.trim()),
        NPS: item["NPS"]?.trim(),
        incentive: item["incentive"]?.trim(),
        expenses: item["expenses"]?.trim(),
        approval: item["approval"]?.trim(),
        totalAmount: item["totalAmount"]?.trim(),
        commissioniw: item["commissioniw"]?.trim(),
        partamount: item["partamount"]?.trim(),
      };

      // Validate required fields
      if (
        !calldetailsData.calldetailsId ||
        !calldetailsData.callDate ||
        !calldetailsData.brandName ||
        !calldetailsData.customerName ||
        !calldetailsData.productsName ||
        !calldetailsData.warrantyTerms ||
        !calldetailsData.serviceType ||
        !calldetailsData.jobStatus
      ) {
        return; // Skip rows with missing required fields
      }

      // Check for duplicates in the file using contactNumber
      if (
        calldetailsData.contactNumber &&
        seenNumbersInFile.has(calldetailsData.contactNumber)
      ) {
        duplicateNumbersInFile.push(calldetailsData.contactNumber);
        return;
      }
      if (calldetailsData.contactNumber) {
        seenNumbersInFile.add(calldetailsData.contactNumber);
      }

      // Check for duplicates in the database using contactNumber
      const existingCallDetail = await CallDetails.findOne({
        contactNumber: calldetailsData.contactNumber,
      });
      if (existingCallDetail) {
        duplicateNumbersInDB.push(calldetailsData.contactNumber);
        return;
      }

      validCalldetails.push(calldetailsData);
    };

    const stream = fs.createReadStream(filePath);
    const csvStream = fastcsv.parse({ headers: true, trim: true });

    const rowProcessingPromises = [];

    csvStream.on("data", (row) => {
      // Push the promise returned by processRow into the array
      rowProcessingPromises.push(processRow(row));
    });

    csvStream.on("end", async () => {
      // Wait for all row processing promises to resolve
      await Promise.all(rowProcessingPromises);

      if (validCalldetails.length > 0) {
        try {
          const result = await CallDetails.insertMany(validCalldetails);
          // Invalidate cache keys related to CallDetails (e.g., all entries, or specific ones if identifiable)
          // As calldetailsId is dynamically generated, invalidating all 'page:' keys is a good approach.
          // If you have specific keys for single call details that you can derive, you'd invalidate those too.
          const cacheKeysToInvalidate = cache.keys().filter((key) => {
            return key.includes("page:"); // Invalidate all pagination-related caches
            // If you had specific keys like 'calldetails:<id>', you could add:
            // || validCalldetails.some(detail => key.includes(detail.calldetailsId))
          });
          cacheKeysToInvalidate.forEach((key) => cache.del(key));

          console.log(`Successfully inserted ${result.length} records.`);
        } catch (insertError) {
          console.error("Error during insertion:", insertError);
          // Ensure filePath is cleaned up even if insertion fails
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          return res.status(500).send({
            message: "Error saving data to the database",
            error: insertError.message, // Send only the message for security
          });
        }
      } else {
        console.log("No valid calldetails to insert.");
      }

      // Clean up the uploaded file after processing
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return res.status(200).send({
        message: "File uploaded and data processed successfully",
        insertedCount: validCalldetails.length,
        duplicatesInFile: duplicateNumbersInFile,
        duplicatesInDB: duplicateNumbersInDB,
      });
    });

    csvStream.on("error", (error) => {
      // Ensure filePath is cleaned up if CSV parsing fails
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      console.error("Error during CSV file processing:", error);
      return res
        .status(500)
        .send({ message: "Error processing file", error: error.message });
    });

    stream.pipe(csvStream);
  } catch (error) {
    // Ensure filePath is cleaned up if any error occurs before CSV streaming starts or if mv fails
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    console.error("Error in excelImport function:", error);
    res
      .status(500)
      .send({ message: "Error processing file", error: error.message });
  }
};

exports.deleteCalldetails = async (req, res) => {
  try {
    const { calldetailsId } = req.params;

    const callDelete = await CallDetails.findOne({ calldetailsId });
    if (!callDelete) {
      return res.status(404).json({ message: "Call not found" });
    }

    await CallDetails.findOneAndDelete({ calldetailsId });
    const cacheKeysToInvalidate = cache.keys().filter((key) => {
      return key.includes(calldetailsId) || key.includes("page:");
    });
    cacheKeysToInvalidate.forEach((key) => cache.del(key));

    res.status(200).json({ message: "Call deleted successfully" });
  } catch (error) {
    console.error("Error deleting Call:", error.message);
    res.status(500).json({ message: "Error deleting Call", error });
  }
};

exports.exportCallDetails = async (req, res) => {
  try {
    const {
      teamleaderId,
      brand,
      jobStatus,
      engineer,
      mobileNumber,
      serviceType,
      warrantyTerms,
      commissionOw,
      noEngineer,
      followup,
      notClose,
      startDate,
      endDate,
      startGdDate,
      endGdDate,
      startVisitDate,
      endVisitDate,
      skip = 0, // For pagination
      limit = 40000, // Maximum 40K records in one batch
    } = req.query;

    const match = {};
    if (teamleaderId) match.teamleaderId = teamleaderId;
    if (brand) match.brandName = brand;
    if (jobStatus) match.jobStatus = jobStatus;
    if (engineer && mongoose.Types.ObjectId.isValid(engineer))
      match.engineer = engineer;
    if (mobileNumber)
      match.contactNumber = { $regex: mobileNumber, $options: "i" };
    if (serviceType) match.serviceType = serviceType;
    if (warrantyTerms) match.warrantyTerms = warrantyTerms;

    if (noEngineer === "true") {
      match.engineer = null;
    }

    if (commissionOw === "true") {
      match.commissionow = { $in: [null, ""] };
    }

    if (followup === "true") {
      match.jobStatus = "FollowUp";
    }

    if (notClose === "true") {
      match.jobStatus = { $ne: "CLOSED" };
    }

    if (startDate && endDate) {
      const startOfDay = new Date(
        Date.UTC(
          new Date(startDate).getUTCFullYear(),
          new Date(startDate).getUTCMonth(),
          new Date(startDate).getUTCDate(),
          0,
          0,
          0,
          0
        )
      );

      const endOfDay = new Date(
        Date.UTC(
          new Date(endDate).getUTCFullYear(),
          new Date(endDate).getUTCMonth(),
          new Date(endDate).getUTCDate(),
          23,
          59,
          59,
          999
        )
      );

      match.callDate = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    } else if (startDate) {
      const startOfDay = new Date(
        Date.UTC(
          new Date(startDate).getUTCFullYear(),
          new Date(startDate).getUTCMonth(),
          new Date(startDate).getUTCDate(),
          0,
          0,
          0,
          0
        )
      );

      const endOfDay = new Date(
        Date.UTC(
          new Date(startDate).getUTCFullYear(),
          new Date(startDate).getUTCMonth(),
          new Date(startDate).getUTCDate(),
          23,
          59,
          59,
          999
        )
      );

      match.callDate = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    if (startGdDate && endGdDate) {
      const startOfDayGDdate = new Date(
        Date.UTC(
          new Date(startGdDate).getUTCFullYear(),
          new Date(startGdDate).getUTCMonth(),
          new Date(startGdDate).getUTCDate(),
          0,
          0,
          0,
          0
        )
      );

      const endOfDayGDdate = new Date(
        Date.UTC(
          new Date(endGdDate).getUTCFullYear(),
          new Date(endGdDate).getUTCMonth(),
          new Date(endGdDate).getUTCDate(),
          23,
          59,
          59,
          999
        )
      );

      match.gddate = {
        $gte: startOfDayGDdate,
        $lte: endOfDayGDdate,
      };
    } else if (startGdDate) {
      const startOfDayGDdate = new Date(
        Date.UTC(
          new Date(startGdDate).getUTCFullYear(),
          new Date(startGdDate).getUTCMonth(),
          new Date(startGdDate).getUTCDate(),
          0,
          0,
          0,
          0
        )
      );

      const endOfDayGDdate = new Date(
        Date.UTC(
          new Date(startGdDate).getUTCFullYear(),
          new Date(startGdDate).getUTCMonth(),
          new Date(startGdDate).getUTCDate(),
          23,
          59,
          59,
          999
        )
      );

      match.gddate = {
        $gte: startOfDayGDdate,
        $lte: endOfDayGDdate,
      };
    }

    if (startVisitDate && endVisitDate) {
      const startOfDayVisitdate = new Date(
        Date.UTC(
          new Date(startVisitDate).getUTCFullYear(),
          new Date(startVisitDate).getUTCMonth(),
          new Date(startVisitDate).getUTCDate(),
          0,
          0,
          0,
          0
        )
      );

      const endOfDayVisitdate = new Date(
        Date.UTC(
          new Date(endVisitDate).getUTCFullYear(),
          new Date(endVisitDate).getUTCMonth(),
          new Date(endVisitDate).getUTCDate(),
          23,
          59,
          59,
          999
        )
      );

      match.visitdate = {
        $gte: startOfDayVisitdate,
        $lte: endOfDayVisitdate,
      };
    } else if (startVisitDate) {
      const startOfDayVisitdate = new Date(
        Date.UTC(
          new Date(startVisitDate).getUTCFullYear(),
          new Date(startVisitDate).getUTCMonth(),
          new Date(startVisitDate).getUTCDate(),
          0,
          0,
          0,
          0
        )
      );

      const endOfDayVisitdate = new Date(
        Date.UTC(
          new Date(startVisitDate).getUTCFullYear(),
          new Date(startVisitDate).getUTCMonth(),
          new Date(startVisitDate).getUTCDate(),
          23,
          59,
          59,
          999
        )
      );

      match.visitdate = {
        $gte: startOfDayVisitdate,
        $lte: endOfDayVisitdate,
      };
    }

    // Get the total number of matching records
    const totalRecords = await CallDetails.countDocuments(match);
    if (totalRecords === 0) {
      return res.status(404).json({
        message: "No records found matching the criteria.",
      });
    }

    // Fetch data in batches
    const batch = await CallDetails.find(match)
      .populate("engineer")
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    // Return the batch data
    return res.status(200).json({
      data: batch,
      totalRecords,
    });
  } catch (error) {
    console.error("Error exporting call details:", error);
    res.status(500).json({
      message: "Error exporting call details",
      error: error.message,
    });
  }
};
