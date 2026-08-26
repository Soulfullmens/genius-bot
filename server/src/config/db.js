const mongoose = require('mongoose');

/**
 * Connect to MongoDB with automatic dev fallback.
 *
 * In production (or when Atlas/local MongoDB is reachable), connects to MONGODB_URI.
 * In development, if local MongoDB is not running, it automatically spins up
 * an in-memory MongoDB instance so you can develop & test with zero setup!
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/geniusbot';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500, // Quick timeout to fallback if local mongod is down
    });
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️  Local MongoDB not detected — starting embedded in-memory MongoDB...');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const memoryServer = await MongoMemoryServer.create();
        const memUri = memoryServer.getUri();
        await mongoose.connect(memUri);
        console.log(`✅ Embedded in-memory MongoDB running at: ${memUri}`);
        return;
      } catch (memErr) {
        console.error('❌ Failed to start embedded MongoDB:', memErr.message);
      }
    }

    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err.message);
  });
}

module.exports = connectDB;
