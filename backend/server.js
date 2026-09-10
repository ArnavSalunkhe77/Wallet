const express = require("express");
const testRoutes = require('./routes/testRoutes');
const authRoutes = require('./routes/authRoutes');
const walletRoutes = require('./routes/walletRoutes');
const pool = require('./config/db');
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

app.listen(PORT , () => {
    console.log(`Server running on port ${PORT}`);
});