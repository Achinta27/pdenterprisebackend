// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// Get all users
router.get("/users", userController.getAllUsers);

// Create a new user
router.post("/users", userController.createUser);
router.put("/users/:userId", userController.updateUser);
router.delete("/users/delete/:userId", userController.deleteUser);

router.post("/admin/login", userController.loginUser);

module.exports = router;
