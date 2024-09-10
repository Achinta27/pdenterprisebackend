// routes/categoryRoutes.js
const express = require("express");
const serviceController = require("../controllers/serviceController");

const router = express.Router();

router.post("/create", serviceController.createService);
router.get("/get", serviceController.getService);
router.put("/update/:serviceId", serviceController.updateService);
router.delete("/delete/:serviceId", serviceController.deleteService);

module.exports = router;
