const mongoose = require("mongoose");
const EngineerName = require("../models/engineerModel");
const jwt = require("jsonwebtoken");

const generateEngineerId = async () => {
  const engineer = await EngineerName.find({}, { engineerId: 1, _id: 0 }).sort({
    engineerId: 1,
  });
  const engineerIds = engineer.map((engineer) =>
    parseInt(engineer.engineerId.replace("engineerId", ""), 10)
  );

  let engineerId = 1;
  for (let i = 0; i < engineerIds.length; i++) {
    if (engineerId < engineerIds[i]) {
      break;
    }
    engineerId++;
  }

  return `engineerId${String(engineerId).padStart(4, "0")}`;
};

exports.createEngineer = async (req, res) => {
  try {
    const { engineername, engineerMobilenumber, engineerCity, password } =
      req.body;

    const engineerId = await generateEngineerId();
    const newEngineer = new EngineerName({
      engineerId,
      engineername,
      engineerMobilenumber,
      engineerCity,
      password,
    });

    await newEngineer.save();
    res
      .status(201)
      .json({ message: "Engineer created successfully", newEngineer });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        error:
          "This Engineer Mobile Number already exists. Please try another Number.",
      });
    }
    console.error("Error creating Engineer:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getEngineer = async (req, res) => {
  try {
    const { activeState, engineerCity, engineername, engineerMobilenumber } =
      req.query;

    let filter = {};

    if (activeState) {
      filter.activeState = activeState;
    }

    if (engineerCity) {
      filter.engineerCity = engineerCity;
    }
    if (engineername) {
      filter.engineername = { $regex: engineername, $options: "i" };
    }
    if (engineerMobilenumber) {
      filter.engineerMobilenumber = {
        $regex: engineerMobilenumber,
        $options: "i",
      };
    }
    const engineers = await EngineerName.find(filter);
    res.status(200).json(engineers);
  } catch (error) {
    console.error("Error fetching Engineers:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateEngineer = async (req, res) => {
  try {
    const { engineerId } = req.params;
    const {
      engineername,
      engineerMobilenumber,
      engineerCity,
      activeState,
      password,
      apptoken,
    } = req.body;

    const engineerUpdate = await EngineerName.findOne({
      $or: [
        {
          _id: mongoose.Types.ObjectId.isValid(engineerId) ? engineerId : null,
        },
        { engineerId },
      ],
    });
    if (!engineerUpdate) {
      return res.status(404).json({ message: "Engineer not found" });
    }

    engineerUpdate.engineername = engineername || engineerUpdate.engineername;
    engineerUpdate.engineerMobilenumber =
      engineerMobilenumber || engineerUpdate.engineerMobilenumber;
    engineerUpdate.engineerCity = engineerCity || engineerUpdate.engineerCity;
    engineerUpdate.activeState = activeState || engineerUpdate.activeState;
    engineerUpdate.password = password || engineerUpdate.password;
    engineerUpdate.apptoken = apptoken || engineerUpdate.apptoken;

    await engineerUpdate.save();
    res
      .status(200)
      .json({ message: "Engineer updated successfully", engineerUpdate });
  } catch (error) {
    console.error("Error updating Engineer:", error.message);
    res.status(500).json({ message: "Error updating Engineer", error });
  }
};

exports.deleteEngineer = async (req, res) => {
  try {
    const { engineerId } = req.params;

    const engineerDelete = await EngineerName.findOne({ engineerId });
    if (!engineerDelete) {
      return res.status(404).json({ message: "Engineer not found" });
    }

    await EngineerName.findOneAndDelete({ engineerId });
    res.status(200).json({ message: "Engineer deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting Engineer", error });
  }
};

exports.loginEngineer = async (req, res) => {
  const { emailOrPhone, password } = req.body;

  if (!emailOrPhone || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const user = await EngineerName.findOne({
      engineerMobilenumber: emailOrPhone,
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.activeState === "Disable") {
      return res
        .status(403)
        .json({ message: "Your account is disabled, please contact support" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, name: user.name },
      process.env.SECRET_KEY,
      { expiresIn: "30d" }
    );

    res.status(200).json({ user, token, name: user.name });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEngineerById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await EngineerName.findOne({
      $or: [
        {
          _id: mongoose.Types.ObjectId.isValid(id) ? id : null,
        },
        { engineerId: id },
      ],
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
