const { createClient } = require('redis');

const redisClient = createClient({
  username: 'default',
  password: 'g4VG1ch4YawQqZgRsTXxRs8dKLXxhtvf',
  socket: {
    host: 'redis-12887.c89.us-east-1-3.ec2.redns.redis-cloud.com',
    port: 12887,
    reconnectStrategy: (retries) => {
      const delay = Math.min(retries * 100, 5000);
      console.log(`Redis reconnect attempt ${retries}, retrying in ${delay}ms`);
      return delay;
    },
  },
});

// Connection event logging
redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis client connected'));
redisClient.on('ready', () => console.log('Redis client ready'));
redisClient.on('reconnecting', () => console.log('Redis client reconnecting...'));
redisClient.on('end', () => console.log('Redis client disconnected'));

// Connection management
const connectRedis = async () => {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      console.log('Redis connected successfully');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }
};

const disconnectRedis = async () => {
  if (redisClient.isOpen) {
    try {
      await redisClient.quit();
      console.log('Redis disconnected gracefully');
    } catch (error) {
      console.error('Error disconnecting Redis:', error);
      throw error;
    }
  }
};

const checkRedisHealth = async () => {
  try {
    const pong = await redisClient.ping();
    return pong === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
};

module.exports = {
  redisClient,
  connectRedis,
  disconnectRedis,
  checkRedisHealth,
};
