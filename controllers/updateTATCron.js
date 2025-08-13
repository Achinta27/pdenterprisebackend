const cron = require("node-cron");
const CallDetails = require("../models/calldetailsModel"); // Adjust the path as per your project structure
const notificationModel = require("../models/notificationModel");

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
