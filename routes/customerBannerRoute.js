const express = require("express");
const customerBannerController = require("../controllers/customerBannerController");

const router = express.Router();

router.post("/", customerBannerController.createCustomerBanner);
router.get("/", customerBannerController.getAllBanners);
router
  .route("/:id")
  .delete(customerBannerController.deleteBanner)
  .put(customerBannerController.updateBanner);

module.exports = router;
