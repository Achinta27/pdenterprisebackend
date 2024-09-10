// routes/categoryRoutes.js
const express = require("express");
const warrantyController = require("../controllers/warrantyController");

const router = express.Router();

router.post("/create", warrantyController.createWarranty);
router.get("/get", warrantyController.getWarrenty);
router.put("/update/:warrantyId", warrantyController.updateWarranty);
router.delete("/delete/:warrantyId", warrantyController.deleteWarranty);

module.exports = router;
