const cron = require("node-cron");
const CallDetails = require("../models/calldetailsModel"); // Adjust the path as per your project structure

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
                $ceil: {
                  $divide: [
                    { $subtract: ["$gddate", "$callDate"] },
                    1000 * 60 * 60 * 24, // Convert milliseconds to days
                  ],
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
