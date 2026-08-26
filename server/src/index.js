/**
 * Genius Bot — Express Server Entry Point
 *
 * Middleware execution order matters:
 * 1. helmet    — sets security headers (X-Content-Type-Options, etc.)
 * 2. cors      — allows cross-origin requests from the React dev server
 * 3. morgan    — logs every request (method, path, status, time)
 * 4. express.json — parses JSON request bodies
 * 5. rate limiter — prevents abuse (100 req/15min per IP)
 * 6. routes    — our API logic
 * 7. errorHandler — catches all errors from routes
 *
 * Interview note: "The order is intentional — security headers go first
 * so even error responses have them, logging is before routes so we log
 * everything, and the error handler is last because Express calls error
 * middleware in registration order."
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const chatRoutes = require('./routes/chat');
const healthRoutes = require('./routes/health');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware Chain ─────────────────────────────────────────────────

// 1. Security headers
app.use(helmet());

// 2. CORS — allow React frontend (handles '*', specific URL, or comma-separated URLs)
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN === '*'
    ? true
    : process.env.CORS_ORIGIN.includes(',')
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
    : process.env.CORS_ORIGIN
  : true;

app.use(
  cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
  })
);

// 3. Request logging (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 4. Parse JSON request bodies (limit size to prevent abuse)
app.use(express.json({ limit: '10kb' }));

// 5. Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many requests. Please try again later.' },
  },
});
app.use('/api/', limiter);

// ─── Routes ───────────────────────────────────────────────────────────

app.use('/api/health', healthRoutes);
app.use('/api/chat', chatRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: `Route ${req.method} ${req.path} not found` },
  });
});

// ─── Central Error Handler (must be last) ─────────────────────────────

app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────

async function start() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\n🚀 Genius Bot API running on http://localhost:${PORT}`);
    console.log(`   Health:  http://localhost:${PORT}/api/health`);
    console.log(
      `   LLM:    ${process.env.GEMINI_API_KEY ? 'Gemini' : 'Stub mode (no API key)'}`
    );
    console.log(`   Env:    ${process.env.NODE_ENV || 'development'}\n`);
  });
}

// Only start the server if this file is run directly (not imported by tests)
if (require.main === module) {
  start();
}

// Export app for testing with Supertest
module.exports = app;
