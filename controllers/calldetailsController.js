const mongoose = require("mongoose");
const CallDetails = require("../models/calldetailsModel");
const path = require("path");
const fs = require("fs");
const fastcsv = require("fast-csv");
const XLSX = require("xlsx");
// Counter Schema for generating unique IDs
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequenceValue: { type: Number, required: true },
});

const Counter = mongoose.model("Counter", counterSchema);

// Function to get the next sequence value
const getNextSequenceValue = async (sequenceName) => {
  const sequenceDocument = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { sequenceValue: 1 } },
    { new: true, upsert: true }
  );
  return sequenceDocument.sequenceValue;
};

// Function to generate a unique calldetailsId
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

// Initialize in-memory cache (using NodeCache) with a TTL of 10 minutes (600 seconds)
const cache = new NodeCache({ stdTTL: 600 });

// Controller for creating a new call detail
exports.createCallDetails = async (req, res) => {
  try {
    const calldetailsId = await generateCalldetailsId();

    const callDetailsData = { ...req.body, calldetailsId };
    const newCallDetails = new CallDetails(callDetailsData);
    await newCallDetails.save();
    cache.flushAll();
    res.status(201).json({
      message: "Call Details Created Successfully",
      data: newCallDetails,
    });
  } catch (error) {
    if (error.code === 11000) {
      // This is the MongoDB duplicate key error code
      const field = Object.keys(error.keyValue)[0]; // Get the field that caused the error
      const message = `${field} must be unique. The value '${error.keyValue[field]}' already exists.`;
      return res.status(400).json({
        message: "Validation Error",
        error: message,
      });
    }
    console.error("Error creating call details:", error);
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
      mobileNumber,
      serviceType,
      warrantyTerms,
      commissionOw,
      noEngineer,
      followup, // For "FollowUp" filter
      notClose,
      startDate, // Start date filter
      endDate,
    } = req.query;

    let cacheKey = `page:${page}-limit:${limit}`;
    if (teamleaderId) cacheKey += `-teamleader:${teamleaderId}`;
    if (brand) cacheKey += `-brand:${brand}`;
    if (jobStatus) cacheKey += `-jobStatus:${jobStatus}`;
    if (engineer) cacheKey += `-engineer:${engineer}`;
    if (mobileNumber) cacheKey += `-mobileNumber:${mobileNumber}`;
    if (serviceType) cacheKey += `-serviceType:${serviceType}`;
    if (warrantyTerms) cacheKey += `-warrantyTerms:${warrantyTerms}`;
    if (commissionOw) cacheKey += `-commissionOw:${commissionOw}`;
    if (noEngineer) cacheKey += `-noEngineer:${noEngineer}`;
    if (followup) cacheKey += `-followup:${followup}`;
    if (notClose) cacheKey += `-notClose:${notClose}`;
    if (startDate) cacheKey += `-startdate:${startDate}`;
    if (endDate) cacheKey += `-enddate:${endDate}`;

    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const match = {};
    if (teamleaderId) match.teamleaderId = teamleaderId;
    if (brand) match.brandName = brand;
    if (jobStatus) match.jobStatus = jobStatus;
    if (engineer) match.engineer = engineer;
    if (mobileNumber)
      match.contactNumber = { $regex: mobileNumber, $options: "i" };
    if (serviceType) match.serviceType = serviceType;
    if (warrantyTerms) match.warrantyTerms = warrantyTerms;

    if (noEngineer === "true") {
      match.engineer = { $in: [null, ""] };
    }

    if (commissionOw === "true") {
      match.commissionow = { $in: [null, ""] };
    }

    if (followup === "true") {
      match.jobStatus = "FollowUp";
    }

    if (notClose === "true") {
      match.jobStatus = "Not Close";
    }

    if (startDate && endDate) {
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0); // Set start to local midnight

      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999); // Set end to just before midnight

      match.visitdate = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    } else if (startDate) {
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0); // Set start to local midnight

      match.visitdate = {
        $gte: startOfDay,
      };
    }

    const totalDocuments = await CallDetails.countDocuments(match);

    const callDetails = await CallDetails.aggregate([
      { $match: match }, // Apply filters
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const totalPages = Math.ceil(totalDocuments / limit); // Calculate total pages after filtering

    const result = {
      page,
      totalPages,
      totalDocuments,
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
    const uniqueBrands = await CallDetails.distinct("brandName");
    const uniqueEngineers = await CallDetails.distinct("engineer");
    const uniqueWarrantyTerms = await CallDetails.distinct("warrantyTerms");
    const uniqueServiceTypes = await CallDetails.distinct("serviceType");
    const uniqueJobStatus = await CallDetails.distinct("jobStatus");

    const filters = {
      brands: uniqueBrands,
      engineers: uniqueEngineers,
      warrantyTerms: uniqueWarrantyTerms,
      serviceTypes: uniqueServiceTypes,
      jobStatuss: uniqueJobStatus,
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
    const callDetail = await CallDetails.findOne({ calldetailsId }).lean();

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
    const { calldetailsId } = req.params; // Assuming you pass calldetailsId in the route
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
      { new: true } // Return the updated document
    );

    if (!updatedCallDetails) {
      return res.status(404).json({
        message: `Call Details with ID ${calldetailsId} not found`,
      });
    }

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

// Controller for updating call details partially
exports.updateCallDetails = async (req, res) => {
  try {
    const { calldetailsId } = req.params; // Get the calldetailsId from URL parameters

    // Extract the fields to update from the request body
    const updateData = req.body;

    // Use $set only for the fields provided in the request
    const updatedCallDetails = await CallDetails.findOneAndUpdate(
      { calldetailsId }, // Find the document by calldetailsId
      { $set: updateData }, // Update only the fields provided in updateData
      { new: true, runValidators: true } // Return the updated document and run validators
    );

    if (!updatedCallDetails) {
      return res.status(404).json({
        message: `Call Details with ID ${calldetailsId} not found`,
      });
    }

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
exports.excelImport = async (req, res) => {
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

    const filePath = path.join(uploadDir, file.name);
    await file.mv(filePath);

    const fileExtension = path.extname(file.name).toLowerCase();
    if (fileExtension !== ".csv") {
      console.log("Unsupported file type");
      return res.status(400).send({ message: "Only CSV files are supported" });
    }

    const validCalldetails = [];
    const duplicateNumbersInFile = [];
    const duplicateNumbersInDB = [];
    const seenNumbers = new Set();

    const processRow = async (item) => {
      const calldetailsId = await generateCalldetailsId();
      const calldetailsData = {
        calldetailsId,
        callDate: item["callDate"]?.trim(),
        visitdate: item["visitdate"]?.trim(),
        callNumber: item["callNumber"]?.trim(),
        brandName: item["brandName"]?.trim(),
        customerName: item["customerName"]?.trim(),
        address: item["address"]?.trim(),
        route: item["route"]?.trim(),
        contactNumber: item["contactNumber"]?.trim(),
        whatsappNumber: item["whatsappNumber"]?.trim(),
        engineer: item["engineer"]?.trim(),
        productsName: item["productsName"]?.trim(),
        warrantyTerms: item["warrantyTerms"]?.trim(),
        TAT: item["TAT"]?.trim(),
        serviceType: item["serviceType"]?.trim(),
        remarks: item["remarks"]?.trim(),
        parts: item["parts"]?.trim(),
        jobStatus: item["jobStatus"]?.trim(),
        modelNumber: item["modelNumber"]?.trim(),
        iduser: item["iduser"]?.trim(),
        closerCode: item["closerCode"]?.trim(),
        dateofPurchase: item["dateofPurchase"]?.trim(),
        oduser: item["oduser"]?.trim(),
        followupdate: item["followupdate"]?.trim(),
        gddate: item["gddate"]?.trim(),
        receivefromEngineer: item["receivefromEngineer"]?.trim(),
        amountReceived: item["amountReceived"]?.trim(),
        commissionow: item["commissionow"]?.trim(),
        serviceChange: item["serviceChange"]?.trim(),
        commissionDate: item["commissionDate"]?.trim(),
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
        !calldetailsData.callNumber ||
        !calldetailsData.brandName ||
        !calldetailsData.customerName ||
        !calldetailsData.productsName ||
        !calldetailsData.warrantyTerms ||
        !calldetailsData.serviceType ||
        !calldetailsData.jobStatus
      ) {
        return; // Skip rows with missing required fields
      }

      // Check for duplicates in the file
      if (seenNumbers.has(calldetailsData.contactNumber)) {
        duplicateNumbersInFile.push(calldetailsData.contactNumber);
        return;
      }
      seenNumbers.add(calldetailsData.contactNumber);

      // Check for duplicates in the database
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

    // Create an array of promises that represent each row being processed
    const rowProcessingPromises = [];

    csvStream.on("data", (row) => {
      // Add the row processing promise to the array
      const rowPromise = processRow(row);
      rowProcessingPromises.push(rowPromise);
    });

    csvStream.on("end", async () => {
      await Promise.all(rowProcessingPromises);

      if (validCalldetails.length > 0) {
        try {
          const result = await CallDetails.insertMany(validCalldetails);
        } catch (insertError) {
          console.error("Error during insertion:", insertError);
          return res.status(500).send({
            message: "Error saving data to the database",
            error: insertError,
          });
        }
      } else {
        console.log("No valid calldetails to insert.");
      }

      fs.unlinkSync(filePath);

      return res.status(200).send({
        message: "File uploaded and data processed successfully",
        duplicatesInFile: duplicateNumbersInFile,
        duplicatesInDB: duplicateNumbersInDB,
      });
    });

    csvStream.on("error", (error) => {
      console.error("Error during CSV file processing:", error);
      return res.status(500).send({ message: "Error processing file", error });
    });

    stream.pipe(csvStream);
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).send({ message: "Error processing file", error });
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
    } = req.query;

    const match = {};
    if (teamleaderId) match.teamleaderId = teamleaderId;
    if (brand) match.brandName = brand;
    if (jobStatus) match.jobStatus = jobStatus;
    if (engineer) match.engineer = engineer;
    if (mobileNumber)
      match.contactNumber = { $regex: mobileNumber, $options: "i" };
    if (serviceType) match.serviceType = serviceType;
    if (warrantyTerms) match.warrantyTerms = warrantyTerms;

    if (noEngineer === "true") {
      match.engineer = { $in: [null, ""] };
    }

    if (commissionOw === "true") {
      match.commissionow = { $in: [null, ""] };
    }

    if (followup === "true") {
      match.jobStatus = "FollowUp";
    }

    if (notClose === "true") {
      match.jobStatus = "Not Close";
    }

    if (startDate && endDate) {
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0); // Set start to local midnight

      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999); // Set end to just before midnight

      match.visitdate = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    } else if (startDate) {
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0); // Set start to local midnight

      match.visitdate = {
        $gte: startOfDay,
      };
    }

    // Fetch all matching documents without pagination
    const callDetails = await CallDetails.find(match).sort({ createdAt: -1 });

    // Define the columns for the export
    const columns = [
      "callDate",
      "visitdate",
      "callNumber",
      "brandName",
      "customerName",
      "address",
      "route",
      "contactNumber",
      "whatsappNumber",
      "engineer",
      "productsName",
      "warrantyTerms",
      "TAT",
      "serviceType",
      "remarks",
      "parts",
      "jobStatus",
      "modelNumber",
      "iduser",
      "closerCode",
      "dateofPurchase",
      "oduser",
      "followupdate",
      "gddate",
      "receivefromEngineer",
      "amountReceived",
      "commissionow",
      "serviceChange",
      "commissionDate",
      "NPS",
      "incentive",
      "expenses",
      "approval",
      "totalAmount",
      "commissioniw",
      "partamount",
    ];

    // Prepare data for export, selecting only the specified columns
    const dataToExport = callDetails.map((detail) =>
      columns.reduce((obj, col) => {
        obj[col] = detail[col] || ""; // Use empty string if field is missing
        return obj;
      }, {})
    );

    // Create a new workbook and add the worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(dataToExport, {
      header: columns,
    });

    // Append worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Call Details");

    // Write the Excel file to memory (Buffer)
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    // Set appropriate headers and send the file
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Call_Details_${new Date().toISOString()}.xlsx"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return res.send(excelBuffer);
  } catch (error) {
    console.error("Error exporting call details:", error);
    res.status(500).json({
      message: "Error exporting call details",
      error: error.message,
    });
  }
};
