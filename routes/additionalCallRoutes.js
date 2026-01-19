const express = require("express");
const {
  getAllAdditionalCalls,
  addNewAdditionalCall,
  getAdditionalCallById,
  updateAdditionalCall,
  deleteAdditionalCall,
} = require("../controllers/additionalCallController");

const router = express.Router();

router.route("/").get(getAllAdditionalCalls).post(addNewAdditionalCall);

router
  .route("/:id")
  .get(getAdditionalCallById)
  .put(updateAdditionalCall)
  .delete(deleteAdditionalCall);

module.exports = router;
