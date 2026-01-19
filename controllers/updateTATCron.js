const cron = require("node-cron");
const notificationModel = require("../models/notificationModel");
require("dotenv").config();
const {
  S3Client,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const CallDetails = require("../models/calldetailsModel");
const ExcelJS = require("exceljs");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0]; // Returns YYYY-MM-DD format
}

// Cron job to update TAT every day at midnight
cron.schedule("0 0 * * *", async () => {
  try {
    const today = new Date();

    // Update the TAT for all documents based on callDate, but stop at gddate if it's set
    await CallDetails.updateMany({ callDate: { $exists: true } }, [
      {
        $set: {
          TAT: {
            $cond: {
              if: { $ne: ["$gddate", null] }, // If gddate exists
              then: {
                $cond: {
                  // Check if gddate equals callDate, then TAT is 0
                  if: { $eq: ["$gddate", "$callDate"] },
                  then: 0,
                  else: {
                    $max: [
                      0, // Ensure that TAT never goes below 0
                      {
                        $subtract: [
                          {
                            $ceil: {
                              $divide: [
                                { $subtract: ["$gddate", "$callDate"] },
                                1000 * 60 * 60 * 24, // Convert milliseconds to days
                              ],
                            },
                          },
                          1, // Subtract 1 from TAT when gddate is set
                        ],
                      },
                    ],
                  },
                },
              },
              else: {
                $ceil: {
                  $divide: [
                    { $subtract: [today, "$callDate"] },
                    1000 * 60 * 60 * 24, // Convert milliseconds to days
                  ],
                },
              },
            },
          },
        },
      },
    ]);
  } catch (error) {
    console.error("Error updating TAT in cron job:", error);
  }
});

cron.schedule("0 0 * * *", async () => {
  try {
    await notificationModel.deleteMany({});
  } catch (error) {
    console.error("Error clearing all notifications:", error);
  }
});

async function generateBackup() {
  try {
    console.log("Starting backup process...");
    const callDetails = await CallDetails.find()
      .populate("engineer", "engineername engineerId")
      .lean();

    if (!callDetails || callDetails.length === 0) {
      console.log("No call details found for backup");
      return null;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("CallDetails Backup");

    worksheet.columns = [
      { header: "Call Details ID", key: "calldetailsId", width: 20 },
      { header: "Call Date", key: "callDate", width: 15 },
      { header: "Visit Date", key: "visitdate", width: 15 },
      { header: "Call Number", key: "callNumber", width: 15 },
      { header: "Brand Name", key: "brandName", width: 15 },
      { header: "Customer Name", key: "customerName", width: 25 },
      { header: "Address", key: "address", width: 30 },
      { header: "Route", key: "route", width: 15 },
      { header: "Contact Number", key: "contactNumber", width: 15 },
      { header: "WhatsApp Number", key: "whatsappNumber", width: 15 },
      { header: "Engineer ID", key: "engineerId", width: 20 },
      { header: "Engineer Name", key: "engineerName", width: 25 },
      { header: "Products Name", key: "productsName", width: 20 },
      { header: "Warranty Terms", key: "warrantyTerms", width: 15 },
      { header: "TAT", key: "TAT", width: 10 },
      { header: "Service Type", key: "serviceType", width: 15 },
      { header: "Remarks", key: "remarks", width: 30 },
      { header: "Parts", key: "parts", width: 20 },
      { header: "Job Status", key: "jobStatus", width: 15 },
      { header: "Model Number", key: "modelNumber", width: 15 },
      { header: "ID User", key: "iduser", width: 15 },
      { header: "Closer Code", key: "closerCode", width: 15 },
      { header: "Date of Purchase", key: "dateofPurchase", width: 15 },
      { header: "OD User", key: "oduser", width: 15 },
      { header: "Followup Date", key: "followupdate", width: 15 },
      { header: "GD Date", key: "gddate", width: 15 },
      {
        header: "Receive from Engineer",
        key: "receivefromEngineer",
        width: 20,
      },
      { header: "Amount Received", key: "amountReceived", width: 15 },
      { header: "Commission OW", key: "commissionow", width: 15 },
      { header: "Service Change", key: "serviceChange", width: 15 },
      { header: "Commission Date", key: "commissionDate", width: 15 },
      { header: "NPS", key: "NPS", width: 10 },
      { header: "Incentive", key: "incentive", width: 15 },
      { header: "Expenses", key: "expenses", width: 15 },
      { header: "Approval", key: "approval", width: 15 },
      { header: "Total Amount", key: "totalAmount", width: 15 },
      { header: "Commission IW", key: "commissioniw", width: 15 },
      { header: "Part Amount", key: "partamount", width: 15 },
      { header: "Team Leader ID", key: "teamleaderId", width: 20 },
      { header: "Created At", key: "createdAt", width: 15 },
      { header: "Check-in Latitude", key: "checkInLat", width: 20 },
      { header: "Check-in Longitude", key: "checkInLng", width: 20 },
    ];

    callDetails.forEach((call) => {
      const rowData = {
        ...call,
        engineerId: call.engineer ? call.engineer.engineerId : "",
        engineerName: call.engineer ? call.engineer.engineername : "",
        callDate: call.callDate ? formatDate(call.callDate) : "",
        visitdate: call.visitdate ? formatDate(call.visitdate) : "",
        dateofPurchase: call.dateofPurchase
          ? formatDate(call.dateofPurchase)
          : "",
        followupdate: call.followupdate ? formatDate(call.followupdate) : "",
        gddate: call.gddate ? formatDate(call.gddate) : "",
        commissionDate: call.commissionDate
          ? formatDate(call.commissionDate)
          : "",
        createdAt: call.createdAt ? formatDate(call.createdAt) : "",
        checkInLat: call.check_in_location
          ? call.check_in_location.latitude
          : "",
        checkInLng: call.check_in_location
          ? call.check_in_location.longitude
          : "",
      };

      // Remove the engineer object as we've extracted its properties
      delete rowData.engineer;
      delete rowData.check_in_location;
      delete rowData.service_images;
      delete rowData.__v;
      delete rowData._id;

      worksheet.addRow(rowData);
    });

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `call_details_backup_${timestamp}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();

    const params = new PutObjectCommand({
      Bucket: "pdenterprise",
      Key: `backup/${fileName}`,
      Body: buffer,
      ContentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const data = await s3.send(params);

    console.log(`Backup completed successfully: ${data.Location}`);
    return data;
  } catch (error) {
    console.error("Error during backup generation:", error);
    throw error;
  }
}

cron.schedule(
  "0 14 * * *",
  async () => {
    console.log("Running 2:00 PM backup job...");
    try {
      await generateBackup();
    } catch (error) {
      console.error("Error in 2:00 PM backup job:", error);
    }
  },
  {
    timezone: "Asia/Kolkata", // Adjust timezone as needed
  },
);

// Schedule at 10:00 PM (22:00)
cron.schedule(
  "0 22 * * *",
  async () => {
    console.log("Running 10:00 PM backup job...");
    try {
      await generateBackup();
    } catch (error) {
      console.error("Error in 10:00 PM backup job:", error);
    }
  },
  {
    timezone: "Asia/Kolkata", // Adjust timezone as needed
  },
);
