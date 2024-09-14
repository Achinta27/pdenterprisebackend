// controllers/userController.js
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

dotenv.config();

const generateUserId = async () => {
  const user = await User.find({}, { userId: 1, _id: 0 }).sort({
    userId: 1,
  });
  const userIds = user.map((user) =>
    parseInt(user.userId.replace("userId", ""), 10)
  );

  let userId = 1;
  for (let i = 0; i < userIds.length; i++) {
    if (userId < userIds[i]) {
      break;
    }
    userId++;
  }

  return `userId${String(userId).padStart(4, "0")}`;
};
// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ userId: { $ne: "userId0001" } });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new user
exports.createUser = async (req, res) => {
  const { name, email, phone, password, designation } = req.body;
  const userId = await generateUserId();

  // Validate required fields
  if (!name || !phone || !password || !designation) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: "Phone already in use" });
    }

    // Create new user
    const newUser = new User({
      name,

      phone,
      password,
      designation,
      userId,
      ...(email && { email }),
    });
    const savedUser = await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: savedUser._id, email: savedUser.email },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );

    // Respond with the created user and token
    res.status(201).json({ user: savedUser, token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, designation, phone, password, activeState } = req.body;

    const userUpdate = await User.findOne({ userId });
    if (!userUpdate) {
      return res.status(404).json({ message: "Admin not found" });
    }

    userUpdate.name = name || userUpdate.name;
    userUpdate.designation = designation || userUpdate.designation;
    userUpdate.phone = phone || userUpdate.phone;
    userUpdate.password = password || userUpdate.password;

    userUpdate.activeState = activeState || userUpdate.activeState;

    await userUpdate.save();
    res.status(200).json({ message: "Admin updated successfully", userUpdate });
  } catch (error) {
    console.error("Error updating Admin:", error.message);
    res.status(500).json({ message: "Error updating Admin", error });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const userDelete = await User.findOne({ userId });
    if (!userDelete) {
      return res.status(404).json({ message: "Admin User not found" });
    }

    await User.findOneAndDelete({ userId });
    res.status(200).json({ message: "Admin deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting Admin", error });
  }
};

exports.loginUser = async (req, res) => {
  const { emailOrPhone, password } = req.body;

  if (!emailOrPhone || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.activeState === "Disable") {
      return res
        .status(403)
        .json({ message: "Your account is disabled, please contact support" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id.toString(), password: user.password, name: user.name },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.status(200).json({ user, token, name: user.name });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
