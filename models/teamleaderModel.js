// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const teamSchema = new mongoose.Schema({
  teamleaderId: {
    type: String,
    required: true,
    unique: true,
  },

  teamleadername: {
    type: String,
    required: true,
  },
  designation: {
    type: String,
    required: true,
  },

  phone: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  activeState: {
    type: String,
    default: "Active",
  },
});

// Pre-save middleware to hash password
teamSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});
const TeamLeader = mongoose.model("TeamLeader", teamSchema);

module.exports = TeamLeader;
