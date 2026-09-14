'use strict';

require('dotenv').config();
const IORedis = require('ioredis');

let redisClient = null;

if (process.env.REDIS_URL) {
  try {
    redisClient = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('⚠️  Redis: Max retries reached. Disabling Redis.');
          return null; // stop retrying
        }
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on('connect', () => console.log('✅ Redis connected.'));
    redisClient.on('error', (err) => {
      console.warn('⚠️  Redis error (non-fatal):', err.message);
    });

    redisClient.connect().catch((err) => {
      console.warn('⚠️  Redis connect failed (non-fatal):', err.message);
      redisClient = null;
    });
  } catch (err) {
    console.warn('⚠️  Redis initialization failed (non-fatal):', err.message);
    redisClient = null;
  }
} else {
  console.warn('⚠️  REDIS_URL not set. Redis features will be disabled.');
}

module.exports = redisClient;
