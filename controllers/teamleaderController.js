const TeamLeader = require("../models/teamleaderModel");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

dotenv.config();

const generateTeamleaderId = async () => {
  const teamleader = await TeamLeader.find(
    {},
    { teamleaderId: 1, _id: 0 }
  ).sort({
    teamleaderId: 1,
  });
  const teamleaderIds = teamleader.map((teamleader) =>
    parseInt(teamleader.teamleaderId.replace("teamleaderId", ""), 10)
  );

  let teamleaderId = 1;
  for (let i = 0; i < teamleaderIds.length; i++) {
    if (teamleaderId < teamleaderIds[i]) {
      break;
    }
    teamleaderId++;
  }

  return `teamleaderId${String(teamleaderId).padStart(4, "0")}`;
};

// Create a new user
exports.createTeamleader = async (req, res) => {
  const { teamleadername, phone, password, designation } = req.body;
  const teamleaderId = await generateTeamleaderId();

  // Validate required fields
  if (!teamleadername || !phone || !password || !designation) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if the user already exists
    const existingTeamleader = await TeamLeader.findOne({ phone });
    if (existingTeamleader) {
      return res.status(400).json({ message: "Phone number  already in use" });
    }

    // Create new user
    const newTeamleader = new TeamLeader({
      teamleadername,
      phone,
      password,
      designation,
      teamleaderId,
    });
    const savedteamleader = await newTeamleader.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: savedteamleader._id, phone: savedteamleader.phone },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );

    // Respond with the created user and token
    res.status(201).json({ teamleader: savedteamleader, token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllTeamLeader = async (req, res) => {
  try {
    const teamleaders = await TeamLeader.find();
    res.json(teamleaders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTeamLeaderById = async (req, res) => {
  const { teamleaderId } = req.params;

  try {
    const teamLeader = await TeamLeader.findOne({ teamleaderId });

    if (!teamLeader) {
      return res.status(404).json({ message: "Team Leader not found" });
    }

    res.status(200).json(teamLeader);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateTeamleader = async (req, res) => {
  try {
    const { teamleaderId } = req.params;
    const { teamleadername, designation, phone, password, activeState } =
      req.body;

    const teamleaderUpdate = await TeamLeader.findOne({ teamleaderId });
    if (!teamleaderUpdate) {
      return res.status(404).json({ message: "TeamLeader not found" });
    }

    teamleaderUpdate.teamleadername =
      teamleadername || teamleaderUpdate.teamleadername;
    teamleaderUpdate.designation = designation || teamleaderUpdate.designation;
    teamleaderUpdate.phone = phone || teamleaderUpdate.phone;
    teamleaderUpdate.password = password || teamleaderUpdate.password;

    teamleaderUpdate.activeState = activeState || teamleaderUpdate.activeState;

    await teamleaderUpdate.save();
    res
      .status(200)
      .json({ message: "Teamleader updated successfully", teamleaderUpdate });
  } catch (error) {
    console.error("Error updating Teamleader:", error.message);
    res.status(500).json({ message: "Error updating Teamleader", error });
  }
};

exports.deleteTeamleader = async (req, res) => {
  try {
    const { teamleaderId } = req.params;

    const teamleaderDelete = await TeamLeader.findOne({ teamleaderId });
    if (!teamleaderDelete) {
      return res.status(404).json({ message: "Teamleader User not found" });
    }

    await TeamLeader.findOneAndDelete({ teamleaderId });
    res.status(200).json({ message: "Teamleader deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting Teamleader", error });
  }
};

exports.loginTeamLeader = async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const teamleader = await TeamLeader.findOne({ phone });

    if (!teamleader) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, teamleader.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: teamleader._id.toString(),
        password: teamleader.password,
        name: teamleader.teamleadername,
      },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      teamleader,
      token,
      name: teamleader.teamleadername,
      role: teamleader.designation,
      id: teamleader.teamleaderId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
