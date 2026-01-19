const express = require("express");
const {
  createNewCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer,
  loginCustomer,
  getCustomerById,
  loginCustomerWithOTP,
} = require("../controllers/customerController");

const router = express.Router();

router.route("/").post(createNewCustomer).get(getCustomers);

router
  .route("/:id")
  .put(updateCustomer)
  .delete(deleteCustomer)
  .get(getCustomerById);

router.post("/login", loginCustomer);

router.post("/login-with-otp", loginCustomerWithOTP);

module.exports = router;
