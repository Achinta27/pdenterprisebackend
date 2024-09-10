const express = require("express");
const calldetailsController = require("../controllers/calldetailsController");

const router = express.Router();

router.post("/create", calldetailsController.createCallDetails);
router.post("/uploadexcel", calldetailsController.excelImport);

router.get("/get", calldetailsController.getCallDetails);
router.get("/filters", calldetailsController.fetchFilters);
router.get("/export", calldetailsController.exportCallDetails);

router.get("/get/:calldetailsId", calldetailsController.getCallDetailsById);
router.patch("/update/:calldetailsId", calldetailsController.updateCallDetails);

router.put(
  "/part2/:calldetailsId",
  calldetailsController.updateCallDetailsPart2
);
router.delete(
  "/delete/:calldetailsId",
  calldetailsController.deleteCalldetails
);

module.exports = router;
