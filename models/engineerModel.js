const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
    password: {
      type: String,
      required: true,
    },
    apptoken: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

engineerSchema.pre("save", async function () {
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

engineerSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("EngineerName", engineerSchema);
