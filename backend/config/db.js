const { Pool } = require("pg"); // for us pg is basically a translator/connector that allows Node.js to communicate with PostgreSQL.
require("dotenv").config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT // PostgreSQL is running on computer at port 5433.
});

module.exports = pool;

// what this is actually means --->

// .env
//  │
//  │ credentials
//  ▼
// db.js
//  │
//  │ pg Pool
//  ▼
// PostgreSQL 18
//  │
//  ▼
// distributed_wallet ---> this is our database inside postgreSQL