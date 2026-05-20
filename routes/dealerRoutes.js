const express = require("express");
const dealerController = require("../controllers/dealerController");

const router = express.Router();

router.post("/create", dealerController.createDealer);
router.post("/login", dealerController.loginDealer);
router.post("/login-with-otp", dealerController.loginDealerWithOTP);
router.get("/get-all", dealerController.getAllDealers);
router.get("/get/:dealerId", dealerController.getDealerById);
router.put("/update/:dealerId", dealerController.updateDealer);
router.put("/status/:dealerId", dealerController.updateDealerStatus);
router.delete("/delete/:dealerId", dealerController.deleteDealer);
router.put("/update-fcm/:dealerId", dealerController.updateFcmToken);

module.exports = router;