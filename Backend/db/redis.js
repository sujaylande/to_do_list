const { createClient } = require("redis");
require("dotenv").config();

// General Redis Client (For GEOADD, GET, SET, etc.)
const client = createClient({
  username: "default",
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

// Publisher Client (For PUBLISH commands)
const redisPublisher = createClient({
  username: "default",
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

// Subscriber Client (For SUBSCRIBE commands)
const redisSubscriber = createClient({
  username: "default",
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

client.on("error", (err) => console.log("Redis Client Error", err));
redisPublisher.on("error", (err) => console.log("Redis Publisher Error", err));
redisSubscriber.on("error", (err) => console.log("Redis Subscriber Error", err));

const connectRedis = async () => {
  try {
    await client.connect();
    await redisPublisher.connect();
    await redisSubscriber.connect();
    console.log("Connected to Redis...");
  } catch (err) {
    console.error("Redis connection failed:", err);
  }
};

module.exports = { client, redisPublisher, redisSubscriber, connectRedis };
