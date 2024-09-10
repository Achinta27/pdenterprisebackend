const express = require("express");
const jobstatusController = require("../controllers/jobstatusController");

const router = express.Router();

router.post("/create", jobstatusController.createJobstatus);
router.get("/get", jobstatusController.getJobstatus);
router.put("/update/:jobstatusId", jobstatusController.updateJobstatus);
router.delete("/delete/:jobstatusId", jobstatusController.deleteJobstatus);

module.exports = router;
