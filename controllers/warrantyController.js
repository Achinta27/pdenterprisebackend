const WarrantyType = require("../models/warrantyModel");

const generateWarrantyId = async () => {
  const warranty = await WarrantyType.find({}, { warrantyId: 1, _id: 0 }).sort({
    warrantyId: 1,
  });
  const warrantyIds = warranty.map((warranty) =>
    parseInt(warranty.warrantyId.replace("warrantyId", ""), 10)
  );

  let warrantyId = 1;
  for (let i = 0; i < warrantyIds.length; i++) {
    if (warrantyId < warrantyIds[i]) {
      break;
    }
    warrantyId++;
  }

  return `warrantyId${String(warrantyId).padStart(4, "0")}`;
};

exports.createWarranty = async (req, res) => {
  try {
    const { warrantytype } = req.body;

    const warrantyId = await generateWarrantyId();
    const newWarranty = new WarrantyType({
      warrantyId,
      warrantytype,
    });

    await newWarranty.save();
    res
      .status(201)
      .json({ message: "Warranty created successfully", newWarranty });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Warranty Type already exists. Please try another name.",
      });
    }
    console.error("Error creating Warranty:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getWarrenty = async (req, res) => {
  try {
    const warrantys = await WarrantyType.find();
    res.status(200).json(warrantys);
  } catch (error) {
    console.error("Error fetching warrantys:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateWarranty = async (req, res) => {
  try {
    const { warrantyId } = req.params;
    const { warrantytype, activeState } = req.body;

    const warrantyUpdate = await WarrantyType.findOne({ warrantyId });
    if (!warrantyUpdate) {
      return res.status(404).json({ message: "Warranty not found" });
    }

    warrantyUpdate.warrantytype = warrantytype || warrantyUpdate.warrantytype;
    warrantyUpdate.activeState = activeState || warrantyUpdate.activeState;

    await warrantyUpdate.save();
    res
      .status(200)
      .json({ message: "Warranty updated successfully", warrantyUpdate });
  } catch (error) {
    console.error("Error updating Warranty:", error.message);
    res.status(500).json({ message: "Error updating Warranty", error });
  }
};

exports.deleteWarranty = async (req, res) => {
  try {
    const { warrantyId } = req.params;

    // Find brand to get public_id
    const warrantyDelete = await WarrantyType.findOne({ warrantyId });
    if (!warrantyDelete) {
      return res.status(404).json({ message: "Warranty not found" });
    }

    // Delete brand from database
    await WarrantyType.findOneAndDelete({ warrantyId });
    res.status(200).json({ message: "Warranty deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting Warranty", error });
  }
};
