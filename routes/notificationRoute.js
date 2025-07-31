const express = require("express");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

router.post("/send", notificationController.sendCustomNotifications);

router.get("/", notificationController.getNotifications);

module.exports = router;