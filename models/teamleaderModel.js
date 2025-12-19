// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const teamSchema = new mongoose.Schema(
  {
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
    assigned_engineers: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
      ref: "EngineerName",
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to hash password
teamSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    console.log(err);
  }
});
const TeamLeader = mongoose.model("TeamLeader", teamSchema);

module.exports = TeamLeader;
