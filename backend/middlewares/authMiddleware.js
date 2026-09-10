const jwt = require("jsonwebtoken");

const authMiddleware = (req,res,next) => {
    try{
        const authHeader = req.headers.authorization;
        if(!authHeader){
            return res.status(400).json({
                message : "Access Denied. No token Provided"
            });
        }
        const token = authHeader.split(" ")[1];
        
        const decoded = jwt.verify(
            token, // remember we created a token in authcontroller.js which had userId , jwt_sec , duration
            process.env.JWT_SECRET
        );
        req.userId = decoded.userId; // We are adding our own property called userId to the request object.
        next(); // "Authentication passed. Move to the next function."
    } catch(error){
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

module.exports = authMiddleware;



// For example, your JWT has userId: 3, so:
// The next API can then use req.userId to find that user's wallet.

// React/client
//     ↓
// Bearer JWT
//     ↓
// Authorization Header
//     ↓
// authMiddleware
//     ↓
// Extract JWT
//     ↓
// jwt.verify()
//     ↓
// JWT valid ✅
//     ↓
// decoded.userId = 3
//     ↓
// req.userId = 3
//     ↓
// next()
//     ↓
// Protected route
//     ↓
// userId: 3