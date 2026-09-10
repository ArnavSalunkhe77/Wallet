const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const { getWallet , depositMoney , withdrawMoney , transferMoney } = require("../controllers/walletController");


router.get('/wallet' , authMiddleware , getWallet);
router.post("/wallet/deposit", authMiddleware, depositMoney);
router.post("/wallet/withdraw", authMiddleware, withdrawMoney);
router.post("/wallet/transfer", authMiddleware , transferMoney);
module.exports = router;


//FLOW : ----->
// GET /wallet
//    ↓
// authMiddleware
//    ↓
// JWT valid?
//    ↓
// req.userId = 3
//    ↓
// getWallet
//    ↓
// Find wallet where user_id = 3
//    ↓
// Return wallet


/// COMPLETED WITH :
// GET /api/wallet → fetch wallet
// POST /api/wallet/deposit → deposit money
// JWT protection on both endpoints
// User-specific wallet lookup using req.userId
// Database balance update