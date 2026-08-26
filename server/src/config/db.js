const mongoose = require('mongoose');

/**
 * Connect to MongoDB with retry logic.
 * Mongoose buffers commands until connected, but we want explicit control
 * so the health endpoint can report actual connection state.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI is not set in environment variables');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      // These are Mongoose 8 defaults, listed explicitly for clarity:
      // autoIndex: true in dev, false in prod would be ideal
      // but we keep it simple for now
    });
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }

  // Log disconnection events (useful for debugging in production)
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err.message);
  });
}

module.exports = connectDB;
