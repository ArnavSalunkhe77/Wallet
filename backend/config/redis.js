const { createClient } = require("redis");

const redisClient = createClient({ // We're creating our Redis client.
    url : "redis://localhost:6379"
});

redisClient.on("error" , (error) => { // This listens for Redis connection/client errors.It's similar to having an error handler:
    console.log("Redis Client Error:", error);
})

module.exports = redisClient;


// redis package
//      ↓
// createClient()
//      ↓
// creates a connection/client for Redis