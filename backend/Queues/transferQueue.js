// Transfer request
//       ↓
// transferQueue
//       ↓
// Worker picks it up
//       ↓
// PostgreSQL transaction

const {Queue} = require("bullmq");

const transferQueue = new Queue("transferQueue" , {  //BullMQ, create a queue named transferQueue.
    connection : {
        host : "localhost", 
        port : 6379 // The Redis server that this queue should use is running on my computer at port 6379."
    }
});

// now we add our first job in this queue
transferQueue.add("transferMoney" , {
    // job data
    senderUserId: 5,
    receiverWalletId: 4,
    amount: 100,
    idempotencyKey: "worker-test-001"
}); // nothing has been transfrered yet we have only put the job in  the queue , the actual transfer will happen when we will create our worker 
// through which we will do our job

// The job does NOT contain the service. The worker already knows/imports the service. The job only carries the data needed by the service.