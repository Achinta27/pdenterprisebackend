const ProductName = require("../models/productModel");

const generateproductId = async () => {
  const product = await ProductName.find({}, { productId: 1, _id: 0 }).sort({
    productId: 1,
  });
  const productIds = product.map((product) =>
    parseInt(product.productId.replace("productId", ""), 10)
  );

  let productId = 1;
  for (let i = 0; i < productIds.length; i++) {
    if (productId < productIds[i]) {
      break;
    }
    productId++;
  }

  return `productId${String(productId).padStart(4, "0")}`;
};

exports.createProduct = async (req, res) => {
  try {
    const { productname } = req.body;

    const productId = await generateproductId();
    const newProduct = new ProductName({
      productId,
      productname,
    });

    await newProduct.save();
    res
      .status(201)
      .json({ message: "Product created successfully", newProduct });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Product Name already exists. Please try another name.",
      });
    }
    console.error("Error creating Product:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const products = await ProductName.find();
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching Products:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const { productname, activeState } = req.body;

    const productUpdate = await ProductName.findOne({ productId });
    if (!productUpdate) {
      return res.status(404).json({ message: "Product not found" });
    }

    productUpdate.productname = productname || productUpdate.productname;
    productUpdate.activeState = activeState || productUpdate.activeState;

    await productUpdate.save();
    res
      .status(200)
      .json({ message: "Product updated successfully", productUpdate });
  } catch (error) {
    console.error("Error updating Product:", error.message);
    res.status(500).json({ message: "Error updating Product", error });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const productDelete = await ProductName.findOne({ productId });
    if (!productDelete) {
      return res.status(404).json({ message: "Product not found" });
    }

    await ProductName.findOneAndDelete({ productId });
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting Product", error });
  }
};
