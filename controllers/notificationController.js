const mongoose = require("mongoose");
const notificationModel = require("../models/notificationModel");
const admin = require("firebase-admin");
const engineerModel = require("../models/engineerModel");

exports.getNotifications = async (req, res) => {
  try {
    const {
      userId,
      type,
      startDate,
      endDate,
      limit = 20,
      page = 1,
    } = req.query;

    let filter = {};

    // Filter by userId if provided
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res
          .status(400)
          .json({ message: "Invalid userId format.", success: false });
      }
      // The Notification model's userId field already stores the _id of the user (BDE, Telecaller, DM, or User)
      filter.userId = userId;
    }

    // Filter by notification type if provided
    if (type) {
      filter["customData.type"] = type; // Assuming 'type' is stored within customData
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.sentAt = {};
      if (startDate) {
        const startOfDay = new Date(startDate);
        startOfDay.setUTCHours(0, 0, 0, 0); // Start of the day in UTC
        filter.sentAt.$gte = startOfDay;
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setUTCHours(23, 59, 59, 999); // End of the day in UTC
        filter.sentAt.$lte = endOfDay;
      }
    }

    const pageNumber = Math.max(1, parseInt(page));
    const itemsPerPage = Math.max(1, parseInt(limit));
    const skip = (pageNumber - 1) * itemsPerPage;

    // Fetch notifications from the database
    const notifications = await notificationModel
      .find(filter)
      .sort({ sentAt: -1, createdAt: -1 }) // Sort by most recent first
      .skip(skip)
      .limit(itemsPerPage);

    const totalCount = await notificationModel.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / itemsPerPage);

    res.status(200).json({
      message: "Notifications fetched successfully.",
      notifications,
      totalCount,
      totalPages,
      currentPage: pageNumber,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      message: "Internal server error while fetching notifications.",
      success: false,
    });
  }
};

const sendFCMNotification = async (
  targetTokenOrTopic,
  message,
  userId = null,
  topicForDb = null
) => {
  try {
    if (
      !message ||
      typeof message !== "object" ||
      (!message.notification && !message.data)
    ) {
      throw new Error(
        "FCM message object is invalid or missing notification/data payload."
      );
    }

    // Determine the actual target for FCM and set it on the message object
    if (
      topicForDb &&
      typeof topicForDb === "string" &&
      topicForDb.trim() !== ""
    ) {
      message.topic = topicForDb;
      delete message.token; // Ensure 'token' is not present if 'topic' is used
    } else if (
      targetTokenOrTopic &&
      typeof targetTokenOrTopic === "string" &&
      targetTokenOrTopic.trim() !== ""
    ) {
      message.token = targetTokenOrTopic; // Set the token
      delete message.topic; // Ensure 'topic' is not present if 'token' is used
    } else {
      throw new Error(
        "FCM message must specify a valid token or a valid topic."
      );
    }

    const response = await admin.messaging().send(message);

    // Save notification record to database
    await notificationModel.create({
      userId: userId,
      topic: topicForDb,
      title: message.notification?.title || "No Title",
      body: message.notification?.body || "No Body",
      customData: message.data,
      sentAt: new Date(),
    });
    console.log("Notification record saved to database.");

    return { success: true, response };
  } catch (error) {
    console.error("Error sending notification:", error);
    if (
      error.code === "messaging/invalid-registration-token" ||
      error.code === "messaging/registration-token-not-registered"
    ) {
      console.warn(
        `Invalid or expired FCM token for target: ${targetTokenOrTopic}. Consider removing from database.`
      );
    }
    // Still attempt to save a record even if FCM send fails
    try {
      await notificationModel.create({
        userId: userId,
        topic: topicForDb,
        title: message.notification?.title || "No Title",
        body: message.notification?.body || "No Body",
        customData: {
          ...message.data,
          fcmError: error.message,
          fcmErrorCode: error.code,
        },
        sentAt: new Date(),
      });
      console.log("Failed notification record saved to database.");
    } catch (dbError) {
      console.error(
        "Error saving failed notification record to database:",
        dbError
      );
    }

    return { success: false, error: error.message };
  }
};

exports.sendCustomNotifications = async (req, res) => {
  const { targetUserId, targetFcmToken, topic, title, body, customData } =
    req.body;

  let message = {
    notification: {
      title: title || "New Notification",
      body: body || "You have a new update!",
    },
    data: {
      type: customData?.type || "general",
      entityId: customData?.entityId || "",
      ...Object.fromEntries(
        Object.entries(customData || {}).map(([key, value]) => [
          key,
          String(value),
        ])
      ),
    },
  };

  let target;
  let userIdForDb = null;
  let topicForDb = null;

  try {
    if (targetUserId) {
      let user = await engineerModel.findOne({
        $or: [
          {
            _id: mongoose.Types.ObjectId.isValid(targetUserId)
              ? targetUserId
              : undefined,
          },
          { engineerId: targetUserId }, // Assuming a 'userId' field for lookup
        ],
      });

      if (!user || !user.apptoken) {
        return res.status(400).json({
          message: "User not found or no apptoken available for targetUserId.",
        });
      }
      target = user.apptoken;
      userIdForDb = user._id;
      topicForDb = null;
    } else if (targetFcmToken) {
      target = targetFcmToken;
      userIdForDb = null;
      topicForDb = null;
    } else if (topic) {
      target = topic;
      message.topic = topic;
      topicForDb = topic;
      userIdForDb = null;
    } else {
      return res.status(400).json({
        message: "No target (token or topic) specified for notification.",
      });
    }

    const result = await sendFCMNotification(
      target,
      message,
      userIdForDb,
      topicForDb
    );

    if (result.success) {
      res.status(200).json({
        message: "Notification sent successfully!",
        response: result.response,
      });
    } else {
      res
        .status(500)
        .json({ message: "Failed to send notification.", error: result.error });
    }
  } catch (error) {
    console.error("Error in /api/send-notification route:", error);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};
