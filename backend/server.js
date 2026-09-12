const express = require("express");
const testRoutes = require('./routes/testRoutes');
const authRoutes = require('./routes/authRoutes');
const walletRoutes = require('./routes/walletRoutes');
const pool = require('./config/db');
const redisClient = require("./config/redis");



const app = express();
app.use(express.json());
const PORT = 5000;



app.get('/' , (req,res) => {
    res.send('Highly distributed Ledger and Wallet System Backend is running!');
});


app.use('/api' , testRoutes); // This is called Route modularisation
app.use('/api/auth', authRoutes);
app.use('/api' , walletRoutes);
pool.query("SELECT NOW()", (err, result) => {
    if (err) {
        console.log("Database connection failed:", err.message);
    } else {
        console.log("Database connected successfully!");
        console.log("Database time:", result.rows[0].now);
    }
});


redisClient.connect()
.then(() => {
    console.log("Redis connected successfully!");
}).catch((error) => {
    console.log("Redis connection failed:", error.message);
})

app.listen(PORT , () => {
    console.log(`Server running on port ${PORT}`);
});




// ┌─────────────────────────────────────────────────────────────┐
// │              DISTRIBUTED WALLET SYSTEM                     │
// └─────────────────────────────────────────────────────────────┘

// 1. PROJECT SETUP
//    │
//    ├── Node.js + Express
//    ├── PostgreSQL
//    ├── Git + GitHub
//    ├── dotenv
//    └── Project folder structure
//    │
//    ▼
// 2. DATABASE
//    │
//    ├── users
//    │     ├── id
//    │     ├── name
//    │     ├── email
//    │     └── password_hash
//    │
//    ├── wallets
//    │     ├── id
//    │     ├── user_id
//    │     └── balance
//    │
//    ├── ledger
//    │     ├── sender_wallet_id
//    │     ├── receiver_wallet_id
//    │     ├── amount
//    │     ├── transaction_type
//    │     └── status
//    │
//    └── idempotency_keys
//          ├── user_id
//          ├── idempotency_key
//          └── UNIQUE(user_id, idempotency_key)
//    │
//    ▼
// 3. USER AUTHENTICATION
//    │
//    ├── User Registration
//    │     ├── Password hashing with bcrypt
//    │     ├── User inserted into DB
//    │     └── Wallet automatically created
//    │
//    ├── User Login
//    │     ├── Email/password verification
//    │     ├── bcrypt.compare()
//    │     └── JWT generated
//    │
//    └── JWT Authentication Middleware
//          ├── Reads Authorization header
//          ├── Extracts Bearer token
//          ├── jwt.verify()
//          └── req.userId
//    │
//    ▼
// 4. WALLET OPERATIONS
//    │
//    ├── Get Wallet
//    ├── Deposit Money
//    ├── Withdraw Money
//    └── Transfer Money
//    │
//    ▼
// 5. DATABASE TRANSACTIONS
//    │
//    ├── BEGIN
//    │     ↓
//    ├── Perform operations
//    │     ↓
//    ├── COMMIT
//    │
//    └── If error → ROLLBACK
//    │
//    ▼
// 6. CONCURRENCY CONTROL
//    │
//    ├── FOR UPDATE row locking
//    │
//    ├── Prevents race conditions
//    │
//    ├── Locks sender + receiver wallets
//    │
//    └── Concurrent transactions wait
//    │
//    ▼
// 7. DEADLOCK AVOIDANCE
//    │
//    ├── Find lower wallet ID
//    ├── Find higher wallet ID
//    │
//    └── Always lock:
//          lower ID → higher ID
//    │
//    ▼
// 8. BALANCE SAFETY
//    │
//    ├── Check sufficient balance
//    ├── Prevent negative balance
//    ├── Sender balance decreases
//    └── Receiver balance increases
//    │
//    ▼
// 9. LEDGER RECORDING
//    │
//    └── Successful transfers recorded
//          in ledger table
//    │
//    ▼
// 10. IDEMPOTENCY
//     │
//     ├── Client sends Idempotency-Key
//     │
//     ├── Key stored in database
//     │
//     ├── UNIQUE(user_id, key)
//     │
//     ├── First request
//     │     → Transfer succeeds
//     │
//     └── Same key again
//           → Duplicate request
//           → No second transfer




// REDIS : redisClient.connect() ....

// server starts
//      ↓
// Node creates Redis client
//      ↓
// redisClient.connect()
//      ↓
// localhost:6379
//      ↓
// Docker Redis container
//      ↓
// "Redis connected successfully!"


        //          Node.js / Express
        //           /            \
        //          ↓              ↓
        //   PostgreSQL           Redis
        //   port 5433           port 6379