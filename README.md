# 🤖 GeniusBot — Full-Stack AI Chat App

> **React + Node.js/Express + MongoDB + Gemini LLM**
> A production-grade AI chat application with domain-expert personas, streaming responses (SSE), and persistent conversation history.

---

## 🏗️ Architecture

```
┌─────────────────────────────┐
│   React + Vite (Client)     │
│   Components, Hooks, State  │
│   Streaming SSE consumer    │
└─────────────┬───────────────┘
              │ HTTP / SSE
┌─────────────▼───────────────┐
│   Node.js + Express (API)   │
│   Middleware Chain:          │
│   Helmet → CORS → Morgan    │
│   → Rate Limit → Routes     │
│   → Error Handler           │
└─────────────┬───────────────┘
              │ Mongoose ODM
┌─────────────▼───────────────┐
│   MongoDB                    │
│   conversations, messages    │
└──────────────────────────────┘
              │ HTTPS
┌─────────────▼───────────────┐
│   Google Gemini API          │
│   (or stub mode)             │
└──────────────────────────────┘
```

## ✨ Features

- **3 AI Personas**: Legal Expert ⚖️, Medical Consultant 🩺, Education Tutor 🎓
- **Streaming Responses (SSE)**: Tokens stream in real-time as the LLM generates them
- **Conversation Persistence**: Full chat history stored in MongoDB with CRUD operations
- **Stateless API Design**: `conversationId` lives in the request — no server sessions
- **Graceful Degradation**: Works without an API key using intelligent stub responses
- **Custom React Hooks**: `useChat` and `useConversations` encapsulate all async logic
- **Central Error Handling**: Express error middleware for consistent JSON error responses
- **Input Validation**: express-validator middleware with descriptive error messages
- **Security**: Helmet headers, CORS, rate limiting, body size limits
- **Dark Theme UI**: Premium glassmorphism design with per-persona accent colors

## 🛠️ Tech Stack

| Layer       | Technology                                    |
|-------------|-----------------------------------------------|
| Frontend    | React 18, Vite, Axios, react-markdown         |
| Backend     | Node.js, Express 4, Mongoose                  |
| Database    | MongoDB (local or Atlas)                       |
| LLM         | Google Gemini 2.0 Flash (via @google/generative-ai) |
| Testing     | Vitest, Supertest                              |
| Security    | Helmet, express-rate-limit, CORS               |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local via `mongod` or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)

### 1. Clone & Setup Server

```bash
cd server
npm install
cp .env.example .env
# Edit .env: set MONGODB_URI (and optionally GEMINI_API_KEY)
npm run dev
```

The server starts at **http://localhost:3001**.
Without a `GEMINI_API_KEY`, it returns stub responses — fully functional for development.

### 2. Setup Client

```bash
cd client
npm install
npm run dev
```

The client opens at **http://localhost:5173** with API requests proxied to the server.

### 3. Get a Gemini API Key (Optional)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a free API key
3. Add it to `server/.env` as `GEMINI_API_KEY=your-key-here`
4. Restart the server

## 📡 API Endpoints

| Method | Endpoint                              | Description                        |
|--------|---------------------------------------|------------------------------------|
| POST   | `/api/chat`                           | Send a message, get a response     |
| POST   | `/api/chat/stream`                    | Send a message, stream response (SSE) |
| GET    | `/api/chat/conversations`             | List all conversations             |
| GET    | `/api/chat/conversations/:id`         | Get conversation with messages     |
| DELETE | `/api/chat/conversations/:id`         | Delete a conversation              |
| PUT    | `/api/chat/conversations/:id/title`   | Rename a conversation              |
| GET    | `/api/health`                         | Server health check                |

### Example Request

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is a contract?", "persona": "Legal Expert"}'
```

### Example Response

```json
{
  "success": true,
  "data": {
    "conversationId": "6651a2b3c4d5e6f7a8b9c0d1",
    "reply": "⚖️ **Legal Analysis**\n\nA contract is a legally binding agreement..."
  }
}
```

## 🧪 Running Tests

```bash
cd server
npm test
```

Tests use Supertest against real Express routes with a test database and stub LLM responses.

## 📁 Project Structure

```
genius-bot/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   │   ├── ChatView.jsx       # Main chat interface
│   │   │   ├── MessageBubble.jsx  # Message rendering + markdown
│   │   │   ├── Sidebar.jsx        # History + persona selector
│   │   │   ├── PersonaSelector.jsx
│   │   │   ├── TypingIndicator.jsx
│   │   │   └── WelcomeScreen.jsx
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useChat.js         # Chat logic + SSE streaming
│   │   │   └── useConversations.js
│   │   ├── services/
│   │   │   └── api.js             # Axios + SSE fetch client
│   │   ├── App.jsx                # Root component, state lifting
│   │   ├── main.jsx
│   │   └── index.css              # Design system
│   └── package.json
├── server/                    # Express backend
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # MongoDB connection
│   │   ├── middleware/
│   │   │   ├── errorHandler.js    # Central error handling
│   │   │   └── validate.js        # Request validation
│   │   ├── models/
│   │   │   ├── Conversation.js    # Mongoose schema
│   │   │   └── Message.js         # Indexed on conversationId
│   │   ├── routes/
│   │   │   ├── chat.js            # Chat + streaming endpoints
│   │   │   └── health.js          # Health check
│   │   ├── services/
│   │   │   └── llm.js             # Gemini + stub fallback
│   │   └── index.js               # Entry point, middleware chain
│   ├── tests/
│   │   └── chat.test.js           # Supertest integration tests
│   └── package.json
└── README.md
```

## 🎯 Interview Talking Points

| Topic | File | Key Insight |
|-------|------|-------------|
| **Middleware chain** | `server/src/index.js` | Order matters: security → CORS → logging → parsing → rate limit → routes → error handler |
| **Stateless API** | `POST /api/chat` | `conversationId` in request body, not sessions → horizontally scalable |
| **SSE Streaming** | `routes/chat.js` + `useChat.js` | Simpler than WebSockets for server→client; `text/event-stream` Content-Type; `res.write()` flushes chunks |
| **DB Indexing** | `models/Message.js` | Indexed `conversationId` — it's the primary query pattern |
| **Custom Hooks** | `hooks/useChat.js` | Encapsulates streaming + fallback + error state; component stays clean |
| **Error handling** | `middleware/errorHandler.js` | 4-param signature tells Express it's an error handler; routes just call `next(err)` |
| **Validation** | `middleware/validate.js` | express-validator runs before the route handler — fail fast |
| **Graceful degradation** | `services/llm.js` | No API key → stub mode; API error → fallback response. App never crashes. |

## 👤 Author

**Mohammed Abdul Rahman Khan**
Full-Stack Developer — React, Node.js, Express, MongoDB, Python
