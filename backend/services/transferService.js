const pool = require("../config/db");

const transferMoneyService = async({
    senderUserId ,
    receiverWalletId,
    amount , 
    idempotencyKey}) => {
    let client;
    try{
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

            throw new Error("Duplicate Request");
        }

        const senderResult = await client.query(
            `SELECT id, balance
            FROM wallets
            WHERE user_id = $1`,
            [senderUserId]
        );

        if(senderResult.rows.length === 0){
            await client.query("ROLLBACK");

            throw new Error("Sender wallet not found");
        }

        const senderWallet = senderResult.rows[0]; // this row has arnav's id and balance
        
        const receiverResult = await client.query(
            `SELECT id, balance FROM wallets WHERE id = $1`,
            [receiverWalletId]
        );

        if(receiverResult.rows.length === 0){
            await client.query("ROLLBACK");

            throw new Error("Receiver wallet not found");
        }
        const receiverWallet = receiverResult.rows[0]; // has rahuls id and balance


        // Edge case :
        if (senderWallet.id === receiverWallet.id) { // edge case
            await client.query("ROLLBACK");

            throw new Error("Sender and receiver cannot be the same wallet");
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

            throw new Error("Insufficient balance");

        } 

        // update wallets
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
        // Ledger :
        const ledger = await client.query(
            `INSERT INTO ledger
            (sender_wallet_id, receiver_wallet_id, amount, transaction_type, status)
            VALUES ($1, $2, $3, $4, $5)`,
            [senderWallet.id, receiverWallet.id, amount, "TRANSFER", "SUCCESS"]
        )

        await client.query("COMMIT"); // "Everything in this transaction succeeded. Permanently save all of it."

        return {
            message: "Money transferred successfully!"
        };

    }catch (error) {
        console.log(error);

        if (client) {
            await client.query("ROLLBACK");
        }

        throw error;

    } finally {
        if (client) {
            client.release();
        }
    }   
    
}

module.exports = transferMoneyService;