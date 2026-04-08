// Load env first — before any other imports
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { ExpressPeerServer } = require('peer'); // Only import what we use
const cors = require('cors');

// ─── App & Server Setup ────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

const ALLOWED_ORIGIN = process.env.CLIENT_URL || 'http://localhost:3000';

app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));
app.use(express.json({ limit: '50kb' })); // Limit payload size

// Health check — required by Render to detect the service is alive fast
app.get('/health', (_req, res) => res.status(200).send('OK'));

// ─── Socket.io Setup ──────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGIN, methods: ['GET', 'POST'], credentials: true },
  transports: ['websocket', 'polling'], // websocket first = faster handshake
  pingTimeout: 20000,
  pingInterval: 10000,
  upgradeTimeout: 5000,
});

// ─── PeerJS Signaling ─────────────────────────────────────────────────────
const peerServer = ExpressPeerServer(server, {
  debug: false,        // Was true — this was flooding logs and slowing boot
  path: '/peerjs',
  proxied: true,
  allow_discovery: false, // Disable network peer scanning on startup
});
app.use('/peerjs', peerServer);

// ─── Lazy OpenAI Init (only created on first AI request) ─────────────────
let openaiClient = null;
function getOpenAI() {
  if (!openaiClient) {
    const OpenAI = require('openai');
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_KEY?.startsWith('sk-or-')
        ? 'https://openrouter.ai/api/v1'
        : undefined,
    });
  }
  return openaiClient;
}

// ─── Room Store ───────────────────────────────────────────────────────────
const rooms = new Map(); // Use Map for O(1) lookups vs plain object

// ─── Socket Events ────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId, username }) => {
    socket.join(roomId);
    if (!rooms.has(roomId)) rooms.set(roomId, []);
    const users = rooms.get(roomId);
    users.push({ id: socket.id, name: username, isAI: false });
    io.to(roomId).emit('room-users', users);
    socket.to(roomId).emit('user-joined', { userId: socket.id, username });
  });

  socket.on('ask-ai', async ({ roomId, message }) => {
    io.to(roomId).emit('ai-status', 'thinking');
    try {
      const model = process.env.OPENAI_API_KEY?.startsWith('sk-or-')
        ? 'openai/gpt-4o-mini'
        : 'gpt-4o-mini';
      const completion = await getOpenAI().chat.completions.create({
        model,
        messages: [{ role: 'user', content: message }],
        max_tokens: 300, // Cap tokens to speed up AI response
      });
      const text = completion.choices[0].message.content;
      io.to(roomId).emit('ai-response', { text });
    } catch (err) {
      console.error('AI Error:', err.message);
    } finally {
      io.to(roomId).emit('ai-status', 'listening');
    }
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (rooms.has(roomId)) {
        const updated = rooms.get(roomId).filter(u => u.id !== socket.id);
        if (updated.length === 0) {
          rooms.delete(roomId); // Clean up empty rooms from memory
        } else {
          rooms.set(roomId, updated);
        }
        io.to(roomId).emit('room-users', updated);
      }
    }
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    if (rooms.has(roomId)) {
      const updated = rooms.get(roomId).filter(u => u.id !== socket.id);
      rooms.set(roomId, updated);
      io.to(roomId).emit('room-users', updated);
    }
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Synapse server ready on port ${PORT}`);
});

// Graceful shutdown (important for Render/cloud platforms)
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
