const express = require("express");
const {
  createCallRequest,
  getAllCallRequests,
  updateCallRequest,
  deleteCallRequest,
  getCallRequestById,
  getCallRequestsFilter,
} = require("../controllers/callRequestController");

const router = express.Router();

router.route("/").post(createCallRequest).get(getAllCallRequests);

router
  .route("/:id")
  .put(updateCallRequest)
  .delete(deleteCallRequest)
  .get(getCallRequestById);

router.get("/filter/get", getCallRequestsFilter);

module.exports = router;
