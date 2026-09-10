const express = require('express');
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
router.get('/test' , (req,res) => {
    res.json({
        message : 'API is working'
    });
});
router.get("/protected", authMiddleware, (req, res) => {
    res.json({
        message: "You accessed a protected route!",
        userId: req.userId
    });
});

module.exports = router;

// TRY TO UNDERSTAND THIS FIRST , IT IS FOUNDATION FOR next ones
// GET /api/protected
//        ↓
// authMiddleware
//        ↓
// Is JWT present?
//        ↓
// Is JWT valid?
//        ↓
// YES
//        ↓
// Continue to protected route


// Think of authMiddleware as a security guard:-------------------------------------->>>
//                     ┌─────────────────┐
// Request ──────────→ │ authMiddleware  │
//                     │   JWT check     │
//                     └────────┬────────┘
//                              │
//                         Valid JWT?
//                          /       \
//                        NO         YES
//                        ↓           ↓
//                      401       req.userId
//                                    ↓
//                             Protected route