import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = ''; // Force stub mode for deterministic testing

let mongoServer;
let app;

describe('GeniusBot API Integration Tests', () => {
  beforeAll(async () => {
    // Spin up an in-memory MongoDB instance for testing
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri;

    await mongoose.connect(uri);

    // Import the Express app after MONGODB_URI and test env are set
    const module = await import('../src/index.js');
    app = module.default;
  }, 30000);

  afterEach(async () => {
    // Clear collections between tests for isolation
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // ─── Health Endpoint ──────────────────────────────────────────────

  it('GET /api/health — returns server status and connected DB state', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('status');
    expect(res.body.data.database).toBe('connected');
    expect(res.body.data.llm).toBe('stub');
  });

  // ─── POST /api/chat ───────────────────────────────────────────────

  it('POST /api/chat — creates a new conversation, saves user & assistant messages, returns reply', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({
        message: 'What is breach of contract?',
        persona: 'Legal Expert',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('conversationId');
    expect(res.body.data).toHaveProperty('reply');
    expect(typeof res.body.data.reply).toBe('string');
    expect(res.body.data.reply.length).toBeGreaterThan(0);
  });

  it('POST /api/chat — continues an existing conversation when conversationId is supplied', async () => {
    // Create conversation
    const firstRes = await request(app)
      .post('/api/chat')
      .send({
        message: 'Explain gravity',
        persona: 'Education Tutor',
      });

    const convId = firstRes.body.data.conversationId;

    // Follow up in same conversation
    const secondRes = await request(app)
      .post('/api/chat')
      .send({
        message: 'Give me a real-world example',
        persona: 'Education Tutor',
        conversationId: convId,
      });

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data.conversationId).toBe(convId);

    // Verify messages persisted
    const getRes = await request(app).get(`/api/chat/conversations/${convId}`);
    expect(getRes.body.data.messages).toHaveLength(4); // 2 user + 2 assistant
  });

  it('POST /api/chat — returns 400 validation error when message is missing or empty', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({
        persona: 'Legal Expert',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Validation failed');
  });

  it('POST /api/chat — returns 400 validation error when persona is invalid', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({
        message: 'Hello',
        persona: 'Unknown Persona',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ─── POST /api/chat/stream ────────────────────────────────────────

  it('POST /api/chat/stream — returns text/event-stream chunks (SSE)', async () => {
    const res = await request(app)
      .post('/api/chat/stream')
      .send({
        message: 'I have a mild fever and cough',
        persona: 'Medical Consultant',
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toContain('data: {"type":"meta"');
    expect(res.text).toContain('data: {"type":"chunk"');
    expect(res.text).toContain('data: {"type":"done"}');
  });

  // ─── GET /api/chat/conversations ──────────────────────────────────

  it('GET /api/chat/conversations — returns list of recent conversations', async () => {
    await request(app)
      .post('/api/chat')
      .send({ message: 'Legal question 1', persona: 'Legal Expert' });

    const res = await request(app).get('/api/chat/conversations');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].persona).toBe('Legal Expert');
  });

  it('GET /api/chat/conversations — bumps conversation to top when new message is posted', async () => {
    // 1. Create first conversation (older)
    const firstChat = await request(app)
      .post('/api/chat')
      .send({ message: 'First conversation topic', persona: 'Legal Expert' });
    const firstId = firstChat.body.data.conversationId;

    // Small delay to ensure timestamp separation
    await new Promise((r) => setTimeout(r, 20));

    // 2. Create second conversation (newer)
    const secondChat = await request(app)
      .post('/api/chat')
      .send({ message: 'Second conversation topic', persona: 'Education Tutor' });
    const secondId = secondChat.body.data.conversationId;

    // Verify second is at the top
    let listRes = await request(app).get('/api/chat/conversations');
    expect(listRes.body.data[0]._id).toBe(secondId);

    // Small delay
    await new Promise((r) => setTimeout(r, 20));

    // 3. Post a new message to first (older) conversation
    await request(app)
      .post('/api/chat')
      .send({
        message: 'Follow-up question on first topic',
        persona: 'Legal Expert',
        conversationId: firstId,
      });

    // 4. Verify first is now bumped to the top
    listRes = await request(app).get('/api/chat/conversations');
    expect(listRes.body.data[0]._id).toBe(firstId);
    expect(listRes.body.data[1]._id).toBe(secondId);
  });

  // ─── GET /api/chat/conversations/:id ──────────────────────────────

  it('GET /api/chat/conversations/:id — returns 404 for nonexistent conversation', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/chat/conversations/${fakeId}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ─── PUT /api/chat/conversations/:id/title ────────────────────────

  it('PUT /api/chat/conversations/:id/title — renames a conversation', async () => {
    const chatRes = await request(app)
      .post('/api/chat')
      .send({ message: 'Initial question', persona: 'Education Tutor' });

    const convId = chatRes.body.data.conversationId;

    const renameRes = await request(app)
      .put(`/api/chat/conversations/${convId}/title`)
      .send({ title: 'Physics Fundamentals' });

    expect(renameRes.status).toBe(200);
    expect(renameRes.body.success).toBe(true);
    expect(renameRes.body.data.title).toBe('Physics Fundamentals');
  });

  // ─── DELETE /api/chat/conversations/:id ───────────────────────────

  it('DELETE /api/chat/conversations/:id — deletes conversation and associated messages', async () => {
    const chatRes = await request(app)
      .post('/api/chat')
      .send({ message: 'To be deleted', persona: 'Legal Expert' });

    const convId = chatRes.body.data.conversationId;

    const delRes = await request(app).delete(`/api/chat/conversations/${convId}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const getRes = await request(app).get(`/api/chat/conversations/${convId}`);
    expect(getRes.status).toBe(404);
  });

  // ─── 404 Handler ──────────────────────────────────────────────────

  it('handles unknown routes with 404 JSON response', async () => {
    const res = await request(app).get('/api/unsupported-endpoint');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('not found');
  });
});
