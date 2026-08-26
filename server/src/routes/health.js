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
    let text = null;
    for (const modelName of ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Say "OK" in one word.');
        text = result.response.text();
        if (text) break;
      } catch {
        // try next
      }
    }
    throw new Error('All test models failed');
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message,
      keyPrefix: key.substring(0, 6) + '...',
      keyLength: key.length,
    });
  }
});

router.get('/list-models', async (req, res) => {
  const key = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
  if (!key) return res.json({ ok: false, message: 'No GEMINI_API_KEY set' });

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
