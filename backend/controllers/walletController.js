const pool = require("../config/db");

const getWallet = async (req, res) => {
    try{
        const userId = req.userId;
        const result = await pool.query(
            `SELECT id , user_id , balance , created_at FROM wallets WHERE user_id = $1` , [userId]
        );
        if(result.rows.length === 0){
            return res.status(404).json({
                message : "Wallet not found!"
            });
        }
        const wallet = result.rows[0];
        return res.status(200).json({
            wallet: wallet
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};
const depositMoney = async (req,res) => {
    const client = await pool.connect();
    //client.query() → use that connection to talk to PostgreSQL
    try{
        const { amount } = req.body;
        if(!amount || amount <= 0){
            return res.status(400).json({
                message : "Deposit amount must be greater than 0"
            });
        }
        const userId = req.userId;

        await client.query("BEGIN");

        const result = await client.query(
            `UPDATE wallets
            SET balance = balance + $1
            WHERE user_id = $2
            RETURNING id , user_id , balance`, [amount , userId]
        );
        if (result.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Wallet not found"
            });
        }

        // LEDGER Query
        const wallet = result.rows[0];
        const ledger = await client.query(
            `INSERT INTO ledger 
            (sender_wallet_id , receiver_wallet_id , amount , transaction_type , status)
            VALUES ($1 , $2 , $3 , $4 , $5)`,[null,wallet.id,amount,"DEPOSIT","SUCCESS"]
        );
        // console.log("LEDGER INSERT RESULT:", ledger);
        await client.query("COMMIT");



        return res.status(200).json({
            message : "Money deposited successfully!",
            wallet : result.rows[0],
        });
    }
    catch (error) {
        console.log(error);
        await client.query("ROLLBACK");
        return res.status(500).json({
            message: "Server error"
        });
    }finally {
        client.release();
    }
};

const withdrawMoney = async (req, res) => {
    let client;

    try {
        const { amount } = req.body;

        if (amount <= 0 || !amount) {
            return res.status(400).json({
                message: "Withdrawal amount must be greater than 0"
            });
        }

        const userId = req.userId;

        client = await pool.connect();

        await client.query("BEGIN");

        const result = await client.query(
            `UPDATE wallets
            SET balance = balance - $1
            WHERE user_id = $2
            AND balance >= $1
            RETURNING id, user_id, balance`,
            [amount, userId]
        );

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                message: "Insufficient balance or wallet not found"
            });
        }

        const wallet = result.rows[0];

        const ledger = await client.query(
            `INSERT INTO ledger
            (sender_wallet_id, receiver_wallet_id, amount, transaction_type, status)
            VALUES ($1, $2, $3, $4, $5)`,
            [wallet.id, null, amount, "WITHDRAW", "SUCCESS"]
        );

        await client.query("COMMIT");

        return res.status(200).json({
            message: "Money withdrawn successfully!",
            wallet: wallet
        });

    } catch (error) {

        console.log(error);

        if (client) {
            await client.query("ROLLBACK");
        }

        return res.status(500).json({
            message: "Server error"
        });

    } finally {

        if (client) {
            client.release();
        }

    }
};
// WALLET TO WALLET transfer
// Arnav's wallet
// ₹1000
//     │
//     │ ₹300
//     ↓
// Rahul's wallet

const transferMoney = async (req,res) => {
    let client;
    try{
        const { receiverWalletId , amount} = req.body;

        const idempotencyKey = req.headers["idempotency-key"]; // get idempotent key

        if (!idempotencyKey) { // validate the key we gott header
            return res.status(400).json({
                message: "Idempotency key is required"
            });
        }

        if(!amount || amount<=0){
            return res.status(400).json({
                message : "Transfer amount must be greater than 0"
            });
        }

        const senderUserId = req.userId;

        client = await pool.connect();
        
        await client.query("BEGIN");   

        const idempotencyResult = await client.query( // then insert the key if not there already
            `INSERT INTO idempotency_keys (user_id , idempotency_key)
            VALUES ($1 , $2)
            ON CONFLICT (user_id , idempotency_key) DO NOTHING RETURNING id` ,
            [senderUserId,idempotencyKey]
        )

        if(idempotencyResult.rows.length === 0){ // if already there we rollback
            await client.query("ROLLBACK");

            return res.status(409).json({
                message: "Duplicate request"
            });
        }
        
        const senderResult = await client.query(
            `SELECT id, balance
            FROM wallets
            WHERE user_id = $1`,
            [senderUserId]
        );

        if(senderResult.rows.length === 0){
            await client.query("ROLLBACK");

            return res.status(404).json({
                message : "Sender wallet not found"
            });
        }

        const senderWallet = senderResult.rows[0]; // this row has arnav's id and balance
        
        const receiverResult = await client.query(
            `SELECT id, balance FROM wallets WHERE id = $1`,
            [receiverWalletId]
        );

        if(receiverResult.rows.length === 0){
            await client.query("ROLLBACK");

            return res.status(404).json({
                message : "Receiver wallet not found"
            });
        }

        const receiverWallet = receiverResult.rows[0]; // has rahuls id and balance

        if (senderWallet.id === receiverWallet.id) { // edge case
            await client.query("ROLLBACK");

            return res.status(400).json({
                message: "Sender and receiver cannot be the same wallet"
            });
        } 

        // so here now have both sender(arnav's wallet) and reciever(rahuls wallet)

        // before changing balances, there's one important safety improvement we should make: 
        // lock both wallet rows so concurrent transfers can't mess up the balances.

        // now DEADLOCK AVOIDANCE WILL TAKE place like we will lock the wallet ids of both sender and reciver in ascending order which is fixed
        const firstWalletId = Math.min(senderWallet.id, receiverWallet.id);
        const secondWalletId = Math.max(senderWallet.id, receiverWallet.id);

        const lock = await client.query( // lock is just variable to understand later when i will revise
            `SELECT id , balance
            FROM wallets
            WHERE id IN ($1, $2)
            ORDER BY id
            FOR UPDATE`,
            [firstWalletId, secondWalletId]
        );
        
        // FOR UPDATE doesn't prevent another transaction from trying. It makes the other transaction wait until the first transaction finishes.
        // That's exactly what happened here.
        //  project is now moving beyond a basic CRUD wallet into concurrency-safe transaction processing.


        const lockedSenderWallet = lock.rows.find( // after locking rows in sorted order , we find sender wallet id  and then check if balance is suff
            wallet => wallet.id === senderWallet.id
        );


        if (lockedSenderWallet.balance < amount) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                message: "Insufficient balance"
            });

        } 


        const deductFromSender = await client.query( // deduct money from sender - arnav
            `UPDATE wallets 
            SET balance = balance - $1
            WHERE id = $2`,
            [amount, senderWallet.id]
        );
        const addToReceiver = await client.query( // add money to reciever - rahul
            `UPDATE wallets
            SET balance = balance + $1
            WHERE id = $2`,
            [amount, receiverWallet.id]
        );

        const ledger = await client.query(
            `INSERT INTO ledger
            (sender_wallet_id, receiver_wallet_id, amount, transaction_type, status)
            VALUES ($1, $2, $3, $4, $5)`,
            [senderWallet.id, receiverWallet.id, amount, "TRANSFER", "SUCCESS"]
        )

        await client.query("COMMIT"); // "Everything in this transaction succeeded. Permanently save all of it."

        return res.status(200).json({
            message: "Money transferred successfully!"
        });

    } catch (error) {
        console.log(error);

        if (client) {
            await client.query("ROLLBACK");
        }

        return res.status(500).json({
            message: "Server error"
        });

    } finally {
        if (client) {
            client.release();
        }
    }   
    

}
module.exports = {
    getWallet , depositMoney , withdrawMoney , transferMoney
};


// FLOW ---->

// req.userId
//     ↓
// userId
//     ↓
// SQL query
//     ↓
// Find wallet
//     ↓
// result.rows[0]
//     ↓
// Return wallet



// DEPOSIT MONEY ------------------------------------------------>>>>>
// Client sends:
// { amount: 500 }
//        ↓
// req.body
//        ↓
// amount = 500

// JWT
//  ↓
// authMiddleware
//  ↓
// req.userId = 3
//        ↓
// userId = req.userId
//        ↓
// UPDATE wallets
// SET balance = balance + 500
// WHERE user_id = 3
//        ↓
// Amit's balance updated

// amount   ← req.body
// userId   ← req.userId

// -------------------------------------------------------------------------------------------------------------------------

// LEDGER ---> 
// 1) DEPOSIT + LEDGER 
// try
//  ↓
// validate
//  ↓
// connect
//  ↓
// BEGIN
//  ↓
// UPDATE
//  ↓
// INSERT ledger
//  ↓
// COMMIT
//  ↓
// catch → ROLLBACK
//  ↓
// finally → release

//2) WITHDRAW + LEDGER
// try
//  ↓
// validate
//  ↓
// connect
//  ↓
// BEGIN
//  ↓
// UPDATE
//  ↓
// INSERT ledger
//  ↓
// COMMIT
//  ↓
// catch → ROLLBACK
//  ↓
// finally → release



// WALLLET TO WALLET TRANSFER 
// BEGIN
//    ↓
// Check sender
//    ↓
// Subtract from sender
//    ↓
// Add to receiver
//    ↓
// Insert TRANSFER into ledger
//    ↓
// COMMIT

// WITH LOCK : 
// Transfer A
//    ↓
// locks Arnav wallet
//    ↓
// checks balance
//    ↓
// updates balance
//    ↓
// COMMIT
//    ↓
// unlocks

// Transfer B
//    ↓
// waits for the lock




// idempotency - key : -----------------------------------------------------------------------------

// Request
//    ↓
// BEGIN
//    ↓
// Try to INSERT idempotency key
//    ↓
// Already exists?
//    ├── YES → duplicate request
//    └── NO  → continue transfer

// // REMEMBER - > Aditya + abc123 → already exists 
// Arnav  + abc123 → different combination → allowed 