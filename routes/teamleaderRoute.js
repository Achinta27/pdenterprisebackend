// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const teamleaderController = require("../controllers/teamleaderController");

// Get all users
router.get("/teamleader", teamleaderController.getAllTeamLeader);
router.get("/teamleader/:teamleaderId", teamleaderController.getTeamLeaderById);

// Create a new user
router.post("/teamleader", teamleaderController.createTeamleader);
router.put("/teamleader/:teamleaderId", teamleaderController.updateTeamleader);
router.delete(
  "/teamleader/delete/:teamleaderId",
  teamleaderController.deleteTeamleader
);
router.post("/teamleader/login", teamleaderController.loginTeamLeader);

module.exports = router;
