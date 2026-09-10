const express = require("express");
const router = express.Router();

const {registerUser, loginUser} = require("../controllers/authController"); // registerUser is fn which we wrote to regitserUser in DB in authController file
router.post('/register' , registerUser);
router.post('/login' , loginUser);
module.exports = router;




// So our FLOW in simple terms : 
// POST /api/auth/register
//           ↓
//      authRoutes.js
//           ↓
//     registerUser() --> also create a wallet for that user , we dont want a user without wallet thats useless
//           ↓
//       bcrypt
//           ↓
//      PostgreSQL
