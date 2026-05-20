const express = require("express");
const dealerCallController = require("../controllers/dealerCallController");

const router = express.Router();

router.post("/create", dealerCallController.createDealerCall);
router.post("/update-fcm", dealerCallController.updateFcmToken);
router.get("/get-my-calls", dealerCallController.getMyCalls);
router.get("/get-all", dealerCallController.getAllDealerCalls);
router.put("/approve/:id", dealerCallController.approveCall);
router.put("/reject/:id", dealerCallController.rejectCall);
router.put("/reset-to-pending/:id", dealerCallController.resetToPending);
router.put("/:id", dealerCallController.updateDealerCall);
router.delete("/:id", dealerCallController.deleteDealerCall);
router.get("/get/:id", dealerCallController.getDealerCallById);
router.get("/find-dealer", dealerCallController.findStickyDealer);

module.exports = router;