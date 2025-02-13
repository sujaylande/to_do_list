const { createClient } = require('redis');
require('dotenv').config();

const client = createClient({
  username: 'default',
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});


client.on('error', (err) => console.log('Redis Client Error', err));

const connectRedis = async () => {
  try {
    await client.connect();
    console.log('Connected to Redis...');
  } catch (err) {
    console.error('Redis connection failed:', err);
  }
};

module.exports = { client, connectRedis };

