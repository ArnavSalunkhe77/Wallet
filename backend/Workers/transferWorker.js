const { Worker } = require("bullmq");
const transferMoneyService = require("../services/transferService");

const transferWorker = new Worker("transferQueue" , async(job) => { // were telling BullMQ : "Create a worker that listens to the transferQueue." 
    const result = await transferMoneyService({ // Here the worker is calling the service and giving it the job data.
        senderUserId : job.data.senderUserId,
        receiverWalletId: job.data.receiverWalletId,
        amount: job.data.amount,
        idempotencyKey: job.data.idempotencyKey
    });
    console.log(result);
} , {
    connection : {
        host : "localhost",
        port : 6379
    }
})

// INshort i will conclude that , worker is getting job and then it is asking service :
// hey service i have a job to do , pls perform it and give me the result
// instead of worker himself performing the service 


// Callback to know what result will give :
transferWorker.on("completed" , async(job) =>{ // if result has something
    console.log(`Job is ${job.id} completed successfully`);
});

transferWorker.on("failed" , async(job,error) => { // if result that means service has given us error from catch part so we give that service message
    console.log(`Job ${job.id} failed`);
    console.log(error.message);
})