const mongoose = require("mongoose");
const Customer = require("../models/customerModel");
const jwt = require("jsonwebtoken");
const { deleteFromS3, uploadToS3 } = require("../middlewares/awsS3");
const { verifyOTP } = require("../middlewares/otp");

const generateCustomerId = async () => {
  const customers = await Customer.find({}, { customerId: 1, _id: 0 }).sort({
    customerId: 1,
  });
  const customerIds = customers.map((customer) =>
    parseInt(customer.customerId.replace("customerId", ""), 10),
  );

  let customerId = 1;
  for (let i = 0; i < customerIds.length; i++) {
    if (customerId < customerIds[i]) {
      break;
    }
    customerId++;
  }

  return `customerId${String(customerId).padStart(4, "0")}`;
};

exports.createNewCustomer = async (req, res) => {
  try {
    const {
      name,
      mobile_number,
      date_of_birth,
      password,
      address,
      pincode,
      area,
    } = req.body;

    let photo = null;

    if (!name.trim() || !mobile_number.trim() || !password.trim()) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (req.files && req.files.photo) {
      try {
        const photoFile = await uploadToS3(
          req.files.photo.tempFilePath,
          req.files.photo.mimetype,
        );
        photo = {
          secure_url: photoFile.secure_url,
          public_id: photoFile.public_id,
          content_type: req.files.photo.mimetype,
        };
      } catch (error) {
        console.log(error);
      }
    }

    const customerId = await generateCustomerId();
    const newCustomer = new Customer({
      customerId,
      name,
      mobile_number,
      date_of_birth,
      password,
      photo,
      address,
      pincode,
      area,
    });

    const savedCustomer = await newCustomer.save();

    const token = jwt.sign(
      { _id: savedCustomer._id, name: savedCustomer.name },
      process.env.SECRET_KEY,
      { expiresIn: "30d" },
    );
    res.status(201).json({
      message: "Customer created successfully",
      token,
      customer: savedCustomer,
    });
  } catch (error) {
    console.error("Error creating Customer:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        error:
          "This Customer Mobile Number already exists. Please try another Number.",
      });
    }
    res.status(500).json({ error: "Server error" });
  }
};

exports.getCustomers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      name,
      mobile_number,
      pincode,
      area,
      start_date,
      end_date,
      sortBy = "createdAt",
      sortOrder = "desc",
      activeState,
    } = req.query;

    const skip = (page - 1) * limit;

    const [customers, totalCustomers] = await Promise.all([
      Customer.find({
        ...(name && { name: { $regex: name, $options: "i" } }),
        ...(mobile_number && { mobile_number: { $regex: mobile_number } }),
        ...(pincode && { pincode }),
        ...(area && { area }),
        ...(activeState && {
          activeState: activeState === "false" ? false : true,
        }),
        ...(start_date &&
          !isNaN(new Date(start_date)) && {
            createdAt: { $gte: new Date(start_date) },
          }),
        ...(end_date &&
          !isNaN(new Date(end_date)) && {
            createdAt: { $lte: new Date(end_date) },
          }),
      })
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .select("-password"),
      Customer.countDocuments({
        ...(name && { name: { $regex: name, $options: "i" } }),
        ...(mobile_number && { mobile_number: { $regex: mobile_number } }),
        ...(pincode && { pincode }),
        ...(area && { area }),
        ...(activeState && {
          activeState: activeState === "false" ? false : true,
        }),
        ...(start_date &&
          !isNaN(new Date(start_date)) && {
            createdAt: { $gte: new Date(start_date) },
          }),
        ...(end_date &&
          !isNaN(new Date(end_date)) && {
            createdAt: { $lte: new Date(end_date) },
          }),
      }),
    ]);

    const totalPages = Math.ceil(totalCustomers / limit);

    res.status(200).json({
      customers,
      totalCustomers,
      totalPages,
      page,
    });
  } catch (error) {
    console.error("Error fetching Customers:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : undefined },
        { customerId: id },
      ],
    }).select("-password");
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.status(200).json(customer);
  } catch (error) {
    console.error("Error fetching Customer by ID:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      mobile_number,
      date_of_birth,
      password,
      address,
      pincode,
      area,
      activeState,
    } = req.body;

    const customer = await Customer.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : undefined },
        { customerId: id },
      ],
    });

    if (req.files && req.files.photo) {
      try {
        const photoFile = await uploadToS3(
          req.files.photo.tempFilePath,
          req.files.photo.mimetype,
        );
        customer.photo = {
          secure_url: photoFile.secure_url,
          public_id: photoFile.public_id,
          content_type: req.files.photo.mimetype,
        };
      } catch (error) {
        console.log(error);
      }
    }

    customer.name = name ?? customer.name;
    customer.mobile_number = mobile_number ?? customer.mobile_number;
    customer.date_of_birth = date_of_birth ?? customer.date_of_birth;
    customer.password = password ?? customer.password;
    customer.address = address ?? customer.address;
    customer.pincode = pincode ?? customer.pincode;
    customer.area = area ?? customer.area;
    customer.activeState = activeState ?? customer.activeState;

    await customer.save();
    res
      .status(200)
      .json({ message: "Customer updated successfully", customer });
  } catch (error) {
    console.error("Error creating Customer:", error.message);
    if (error.code === 11000) {
      return res.status(400).json({
        error:
          "This Customer Mobile Number already exists. Please try another Number.",
      });
    }
    res.status(500).json({ error: "Server error" });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { customerId: id },
      ],
    });

    if (customer.photo && customer.photo.public_id) {
      try {
        await deleteFromS3(customer.photo.public_id);
      } catch (error) {
        console.log(error);
      }
    }

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    await Customer.findByIdAndDelete(customer._id);
    res.status(200).json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Error deleting Customer:", error.message);
    res.status(500).json({ message: "Error deleting Customer", error });
  }
};

exports.loginCustomer = async (req, res) => {
  try {
    const { mobile_number, password } = req.body;

    if (!mobile_number || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const customer = await Customer.findOne({ mobile_number });

    if (!customer || !(await customer.comparePassword(password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!customer.activeState) {
      return res.status(400).json({ message: "Your account is disabled" });
    }

    const token = jwt.sign(
      { id: customer._id, name: customer.name },
      process.env.SECRET_KEY,
      { expiresIn: "30d" },
    );

    res.status(200).json({ message: "Login successful", token, customer });
  } catch (error) {
    console.error("Error logging in Customer:", error.message);
    res.status(500).json({ message: "Error logging in Customer", error });
  }
};

exports.loginCustomerWithOTP = async (req, res) => {
  try {
    const { emailOrPhone, otp } = req.body;
    const { success } = await verifyOTP({
      otp,
      phone: emailOrPhone,
      type: "login",
    });

    if (!success) {
      console.log("Invalid OTP");
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const user = await Customer.findOne({
      mobile_number: emailOrPhone,
    });

    if (!user) {
      console.log("Invalid credentials");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.activeState) {
      console.log("Your account is disabled, please contact support");
      return res
        .status(403)
        .json({ message: "Your account is disabled, please contact support" });
    }

    const token = jwt.sign(
      { id: user._id, name: user.name },
      process.env.SECRET_KEY,
      { expiresIn: "30d" },
    );

    res
      .status(200)
      .json({ customer: user, token, message: "Login successful" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
