// routes/categoryRoutes.js
const express = require("express");
const productcontroller = require("../controllers/productController");

const router = express.Router();

router.post("/create", productcontroller.createProduct);
router.get("/get", productcontroller.getProducts);
router.put("/update/:productId", productcontroller.updateProducts);
router.delete("/delete/:productId", productcontroller.deleteProduct);

module.exports = router;
