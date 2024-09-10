const EngineerName = require("../models/engineerModel");

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
    const { engineername, engineerMobilenumber, engineerCity } = req.body;

    const engineerId = await generateEngineerId();
    const newEngineer = new EngineerName({
      engineerId,
      engineername,
      engineerMobilenumber,
      engineerCity,
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
    const engineers = await EngineerName.find();
    res.status(200).json(engineers);
  } catch (error) {
    console.error("Error fetching Engineers:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateEngineer = async (req, res) => {
  try {
    const { engineerId } = req.params;
    const { engineername, engineerMobilenumber, engineerCity, activeState } =
      req.body;

    const engineerUpdate = await EngineerName.findOne({ engineerId });
    if (!engineerUpdate) {
      return res.status(404).json({ message: "Engineer not found" });
    }

    engineerUpdate.engineername = engineername || engineerUpdate.engineername;
    engineerUpdate.engineerMobilenumber =
      engineerMobilenumber || engineerUpdate.engineerMobilenumber;
    engineerUpdate.engineerCity = engineerCity || engineerUpdate.engineerCity;
    engineerUpdate.activeState = activeState || engineerUpdate.activeState;

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
