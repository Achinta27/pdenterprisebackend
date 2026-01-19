// routes/categoryRoutes.js
const express = require("express");
const engineerController = require("../controllers/engineerController");

const router = express.Router();

router.post("/create", engineerController.createEngineer);
router.get("/get", engineerController.getEngineer);
router.put("/update/:engineerId", engineerController.updateEngineer);
router.delete("/delete/:engineerId", engineerController.deleteEngineer);

router.post("/login", engineerController.loginEngineer);
router.post("/login-with-otp", engineerController.loginEngineerWithOTP);

router.get("/get/:id", engineerController.getEngineerById);

module.exports = router;
