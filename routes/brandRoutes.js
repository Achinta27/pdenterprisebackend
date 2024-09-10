// routes/categoryRoutes.js
const express = require("express");
const {
  createBrand,
  getBrand,
  updateBrand,
  deleteBrand,
} = require("../controllers/brandController");

const router = express.Router();

router.post("/create", createBrand);
router.get("/get", getBrand);
router.put("/update/:brandId", updateBrand);
router.delete("/delete/:brandId", deleteBrand);

module.exports = router;
