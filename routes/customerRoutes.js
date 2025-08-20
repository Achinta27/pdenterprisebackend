const express = require("express");
const {
  createNewCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer,
  loginCustomer,
  getCustomerById,
} = require("../controllers/customerController");

const router = express.Router();

router.route("/").post(createNewCustomer).get(getCustomers);

router
  .route("/:id")
  .put(updateCustomer)
  .delete(deleteCustomer)
  .get(getCustomerById);

router.post("/login", loginCustomer);

module.exports = router;
