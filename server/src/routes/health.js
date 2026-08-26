const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

/**
 * GET /api/health
 * Returns server status and database connection state.
 *
 * Interview note: "Health checks let load balancers and monitoring tools
 * know if the service is ready to accept traffic."
 */
router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.json({
    success: true,
    data: {
      status: dbState === 1 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: dbStates[dbState] || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      llm: process.env.GEMINI_API_KEY ? 'gemini' : 'stub',
    },
  });
});

router.get('/llm-test', async (req, res) => {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const key = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';

  if (!key) {
    return res.json({ ok: false, message: 'No GEMINI_API_KEY set' });
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Say "OK" in one word.');
    const text = result.response.text();
    return res.json({ ok: true, reply: text.trim() });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message,
      keyPrefix: key.substring(0, 6) + '...',
      keyLength: key.length,
    });
  }
});

module.exports = router;
