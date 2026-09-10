const bcrypt = require("bcrypt");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const registerUser = async(req,res) =>{
    let client;
    try{
        const {name , email , password} = req.body;
        if(!name || !email || !password){
            return res.status(400).json({
                message : "All fields are required!"
            });
        }
        client = await pool.connect();
        await client.query("BEGIN");
        const hashedPassword = await bcrypt.hash(password, 10); // 10 is the cost factor/salt rounds used by bcrypt
        
        const result = await client.query( // regUser
            `INSERT INTO users (name , email , password_hash)
            VALUES ($1,$2,$3) 
            RETURNING id , name , email , created_at`,
            [name , email , hashedPassword]
        )

        const user = result.rows[0];
        const userWallet = await client.query( // assign wallet for user
            `INSERT INTO wallets (user_id , balance)
            VALUES ($1 , $2)`,
            [user.id, 0.00]
        )

        // Both user and wallet were created successfully
        await client.query("COMMIT");

        res.status(201).json({
            message: "User registered successfully",
            user: result.rows[0]
        });
    } catch (error) {
        if (client) {
            await client.query("ROLLBACK");
        }
        console.log(error);
        res.status(500).json({
            message: "Server error"
        });
    } finally { // when work is done return the connection to the pool / restore it basically
        if (client) {
            client.release();
        }
    }


}
const loginUser = async(req,res) => {
    try{
        const {email , password} = req.body;
        if(!email || !password){
            return res.status(400).json({
                message: "Email and password are required!"
            });
        }
        const result = await pool.query( // IMP - DB query
            `SELECT id , name , email , password_hash FROM users 
                WHERE email = $1
            `,[email]
        )
        if(result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }
        const user = result.rows[0];
        // if we have email in db then match the password
        const isPasswordCorrect = await bcrypt.compare( // return bool value
            password , user.password_hash
        );
        if(!isPasswordCorrect){
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // JWT Token when we login
        const token = jwt.sign(
            {userId : user.id},
            process.env.JWT_SECRET,
            {expiresIn : '1h'}
        ) // this says : Create a JWT containing this user's ID, sign it using our secret, and make it expire after 1 hour.

        res.status(200).json({
            message: "Login successful",
            token: token // users browser/React app simply keeps the token.
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
}
module.exports = {
    registerUser , loginUser
};

// VALUES ($1,$2,$3)  means i will give db actual values seprately which we give next speratly in [name, email, hashedPassword]
// so postgresSQL meatches them like -->
// $1 → name
// $2 → email
// $3 → hashedPassword

// FLOW : 
// User enters details
//        ↓
// name, email, password
//        ↓
// bcrypt.hash(password, 10)
//        ↓
// hashedPassword
//        ↓
// pool.query()
//        ↓
// PostgreSQL
//        ↓
// INSERT into users
//        ↓
// RETURNING id, name, email, created_at
//        ↓
// result.rows[0]


// NEXT is when we regUser in and store userInfo in DB we will assign a wallet to the user and so
// to connect User to a new Wallet we will use Id
// simple digram ---->
// made by gpt for understanding purposes
// users
// ┌────┬───────┬─────────────────┐
// │ id │ name  │ email           │
// ├────┼───────┼─────────────────┤
// │ 1  │ Arnav │ arnav@gmail.com │
// └────┴───────┴─────────────────┘

// wallets
// ┌────┬─────────┬─────────┐
// │ id │ user_id │ balance │
// ├────┼─────────┼─────────┤
// │ 1  │    1    │  0.00   │
// └────┴─────────┴─────────┘



// now we will next make advvancement in things we did above there can be a case we have a users created but wallet isnt created for the user
// so to avoid this we will use POSTGRES SQL transaction
// We'll use ---->>
// BEGIN
//    ↓
// Create user
//    ↓
// Create wallet
//    ↓
// COMMIT

// If anything fails:

// ROLLBACK - Meaning PostgreSQL will undo everything.


// client.query() ensures that both useRegistartion and wallet creation happens thirugh same connection so when on falis we rollbck




// LOGIN ------------------------------------------------------------------------------------------------------------
// we use JWT token  : in simple words --> Login verifies your password once. JWT verification happens on each protected  API request.

// Backend sends JWT to React after successful login. React stores the JWT and sends it back to the Backend with future protected requests 
// so the Backend can identify and authenticate the user.

// JWT FLOW in our wallet app : Digram taken from gpt to understand the flow of JWT 

        //       USER (Amit)
        //           │
        //           │ Email + Password
        //           ↓
        //   ┌─────────────────┐
        //   │  React Frontend │
        //   └────────┬────────┘
        //            │
        //            │ Login Request
        //            ↓
        //   ┌─────────────────┐
        //   │ Node/Express    │
        //   │    Backend      │
        //   └────────┬────────┘
        //            │
        //            │ Check email & password
        //            ↓
        //      PostgreSQL DB
        //            │
        //            │ Correct 
        //            ↓
        //   Backend creates JWT
        //      (userId = 3)
        //            │
        //            │ JWT
        //            ↓
        //   ┌─────────────────┐
        //   │  React Frontend │
        //   │  stores JWT 🎫  │
        //   └────────┬────────┘
        //            │
        //            │
        //   User asks: "My Wallet"
        //            │
        //            │ JWT + Request
        //            ↓
        //   ┌─────────────────┐
        //   │ Node/Express    │
        //   │    Backend      │
        //   └────────┬────────┘
        //            │
        //            │ Verify JWT
        //            ↓
        //       userId = 3
        //            │
        //            ↓
        //   Find Amit's wallet
        //            │
        //            ↓
        //   Return wallet balance
        //            │
        //            ↓
        //   ┌─────────────────┐
        //   │  React Frontend │
        //   └─────────────────┘