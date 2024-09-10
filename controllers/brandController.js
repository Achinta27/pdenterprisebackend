const BrandName = require("../models/brandModel");

const generateBrandId = async () => {
  const brand = await BrandName.find({}, { brandId: 1, _id: 0 }).sort({
    brandId: 1,
  });
  const brandIds = brand.map((brand) =>
    parseInt(brand.brandId.replace("brandId", ""), 10)
  );

  let brandId = 1;
  for (let i = 0; i < brandIds.length; i++) {
    if (brandId < brandIds[i]) {
      break;
    }
    brandId++;
  }

  return `brandId${String(brandId).padStart(4, "0")}`;
};

exports.createBrand = async (req, res) => {
  try {
    const { brandname } = req.body;

    const brandId = await generateBrandId();
    const newBrand = new BrandName({
      brandId,
      brandname,
    });

    await newBrand.save();
    res.status(201).json({ message: "Brand created successfully", newBrand });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ error: "Brand Name already exists. Please try another name." });
    }
    console.error("Error creating Brand:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getBrand = async (req, res) => {
  try {
    const brands = await BrandName.find();
    res.status(200).json(brands);
  } catch (error) {
    console.error("Error fetching Brands:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { brandname, activeState } = req.body;

    const brandUpdate = await BrandName.findOne({ brandId });
    if (!brandUpdate) {
      return res.status(404).json({ message: "Brand not found" });
    }

    brandUpdate.brandname = brandname || brandUpdate.brandname;
    brandUpdate.activeState = activeState || brandUpdate.activeState;

    await brandUpdate.save();
    res
      .status(200)
      .json({ message: "Brand updated successfully", brandUpdate });
  } catch (error) {
    console.error("Error updating Brand:", error.message);
    res.status(500).json({ message: "Error updating Brand", error });
  }
};

exports.deleteBrand = async (req, res) => {
  try {
    const { brandId } = req.params;

    // Find brand to get public_id
    const brandDelete = await BrandName.findOne({ brandId });
    if (!brandDelete) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Delete brand from database
    await BrandName.findOneAndDelete({ brandId });
    res.status(200).json({ message: "Brand deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting Brand", error });
  }
};
