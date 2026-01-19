const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    mobile_number: {
      type: String,
      unique: true,
      required: true,
    },
    date_of_birth: {
      type: Date,
    },
    activeState: {
      type: Boolean,
      default: true,
    },
    password: {
      type: String,
    },
    address: {
      type: String,
    },
    pincode: {
      type: String,
    },
    area: {
      type: String,
    },
    photo: {
      type: {
        public_id: String,
        secure_url: String,
        content_type: String,
      },
      default: null,
    },
  },
  { timestamps: true }
);

customerSchema.pre("save", async function () {
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

customerSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);
