const express = require('express');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { generateResponse, generateStreamingResponse } = require('../services/llm');
const { chatValidation, handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

// ─── POST /api/chat ───────────────────────────────────────────────────
// Main chat endpoint. Creates or continues a conversation.
//
// Body: { message: string, persona: string, conversationId?: string }
// Returns: { success, data: { conversationId, reply } }
//
// Interview note: "conversationId is in the request body, not in a server
// session. This keeps the API stateless — any server instance can handle
// any request, which is essential for horizontal scaling."
router.post(
  '/',
  chatValidation,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { message, persona, conversationId } = req.body;

      // 1. Find or create the conversation
      let conversation;
      if (conversationId) {
        conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          const err = new Error('Conversation not found');
          err.statusCode = 404;
          throw err;
        }
      } else {
        // New conversation — use first few words as title
        const title =
          message.length > 50 ? message.substring(0, 50) + '…' : message;
        conversation = await Conversation.create({ title, persona });
      }

      // 2. Save the user's message
      await Message.create({
        conversationId: conversation._id,
        role: 'user',
        content: message,
      });

      // 3. Fetch conversation history for context
      const history = await Message.find({ conversationId: conversation._id })
        .sort({ timestamp: 1 })
        .lean();

      // 4. Generate LLM response
      const reply = await generateResponse(message, persona, history);

      // 5. Save the assistant's reply
      await Message.create({
        conversationId: conversation._id,
        role: 'assistant',
        content: reply,
      });

      // 5b. Bump updatedAt so the sidebar sorts this conversation to the top.
      // Empty update + { timestamps: true } lets Mongoose handle updatedAt —
      // passing a manual value can be silently overridden by the timestamps plugin.
      await Conversation.findByIdAndUpdate(conversation._id, {}, { timestamps: true });

      // 6. Return the response
      res.status(200).json({
        success: true,
        data: {
          conversationId: conversation._id,
          reply,
        },
      });
    } catch (err) {
      next(err); // Forward to central error handler
    }
  }
);

// ─── POST /api/chat/stream ────────────────────────────────────────────
// Streaming chat endpoint using Server-Sent Events (SSE).
// The response is sent token-by-token as the LLM generates it.
//
// Interview note: "SSE is simpler than WebSockets for unidirectional
// server-to-client streaming. The client sends a POST, and the server
// keeps the connection open, flushing chunks as `data:` events."
router.post(
  '/stream',
  chatValidation,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { message, persona, conversationId } = req.body;

      // 1. Find or create conversation (same as non-streaming)
      let conversation;
      if (conversationId) {
        conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          const err = new Error('Conversation not found');
          err.statusCode = 404;
          throw err;
        }
      } else {
        const title =
          message.length > 50 ? message.substring(0, 50) + '…' : message;
        conversation = await Conversation.create({ title, persona });
      }

      // 2. Save the user's message
      await Message.create({
        conversationId: conversation._id,
        role: 'user',
        content: message,
      });

      // 3. Fetch history
      const history = await Message.find({ conversationId: conversation._id })
        .sort({ timestamp: 1 })
        .lean();

      // 4. Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      res.flushHeaders();

      // Send the conversationId first so the client knows it immediately
      res.write(
        `data: ${JSON.stringify({ type: 'meta', conversationId: conversation._id })}\n\n`
      );

      // 5. Stream the LLM response
      const fullResponse = await generateStreamingResponse(
        message,
        persona,
        history,
        (chunk) => {
          // Each SSE event is: "data: <json>\n\n"
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        }
      );

      // 6. Save the full assembled response
      await Message.create({
        conversationId: conversation._id,
        role: 'assistant',
        content: fullResponse,
      });

      // 6b. Bump updatedAt so the sidebar sorts this conversation to the top.
      // Empty update + { timestamps: true } — same pattern as the non-streaming route.
      await Conversation.findByIdAndUpdate(conversation._id, {}, { timestamps: true });

      // 7. Signal stream completion
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (err) {
      // If headers already sent (stream started), we can't use the error handler
      if (res.headersSent) {
        res.write(
          `data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`
        );
        res.end();
      } else {
        next(err);
      }
    }
  }
);

// ─── GET /api/chat/conversations ──────────────────────────────────────
// List all conversations, sorted by most recent first.
router.get('/conversations', async (req, res, next) => {
  try {
    const conversations = await Conversation.find()
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, data: conversations });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/chat/conversations/:id ─────────────────────────────────
// Get a single conversation with all its messages.
router.get('/conversations/:id', async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id).lean();
    if (!conversation) {
      const err = new Error('Conversation not found');
      err.statusCode = 404;
      throw err;
    }

    const messages = await Message.find({ conversationId: req.params.id })
      .sort({ timestamp: 1 })
      .lean();

    res.json({
      success: true,
      data: { ...conversation, messages },
    });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/chat/conversations/:id ──────────────────────────────
// Delete a conversation and all its messages.
router.delete('/conversations/:id', async (req, res, next) => {
  try {
    const conversation = await Conversation.findByIdAndDelete(req.params.id);
    if (!conversation) {
      const err = new Error('Conversation not found');
      err.statusCode = 404;
      throw err;
    }

    // Delete all associated messages
    await Message.deleteMany({ conversationId: req.params.id });

    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/chat/conversations/:id/title ───────────────────────────
// Rename a conversation.
router.put('/conversations/:id/title', async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      const err = new Error('Title is required');
      err.statusCode = 400;
      throw err;
    }

    const conversation = await Conversation.findByIdAndUpdate(
      req.params.id,
      { title: title.trim() },
      { new: true } // Return the updated document
    );

    if (!conversation) {
      const err = new Error('Conversation not found');
      err.statusCode = 404;
      throw err;
    }

    res.json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
