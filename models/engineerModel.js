const mongoose = require("mongoose");

const engineerSchema = new mongoose.Schema(
  {
    engineerId: {
      type: String,
      unique: true,
      required: true,
    },
    engineername: {
      type: String,
      required: true,
    },
    engineerMobilenumber: {
      type: String,
      unique: true,
      required: true,
    },
    engineerCity: {
      type: String,
    },

    activeState: {
      type: String,
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("EngineerName", engineerSchema);
