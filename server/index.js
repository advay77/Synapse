const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { PeerServer } = require('peer');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// PeerServer for WebRTC signaling (Integrated with main server)
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/peerjs'
});
app.use('/peerjs', peerServer);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-key-here',
  baseURL: process.env.OPENAI_BASE_URL || (process.env.OPENAI_API_KEY?.startsWith('sk-or-') ? "https://openrouter.ai/api/v1" : undefined),
});

// Store user data in memory (since no DB as per constraints)
const rooms = {}; // roomID -> Array of users { id, name, isAI: false }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, username }) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = [];
    const newUser = { id: socket.id, name: username, isAI: false };
    rooms[roomId].push(newUser);
    io.to(roomId).emit('room-users', rooms[roomId]);
    socket.to(roomId).emit('user-joined', { userId: socket.id, username });
    console.log(`${username} joined room: ${roomId}`);
  });

  socket.on('ask-ai', async ({ roomId, message }) => {
    // Basic text fallback for the feed if Vapi is not active or for text queries
    io.to(roomId).emit('ai-status', 'thinking');
    try {
      const model = process.env.OPENAI_API_KEY?.startsWith('sk-or-') ? "openai/gpt-4o-mini" : "gpt-4o-mini";
      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: message }],
        model: model,
      });
      io.to(roomId).emit('ai-response', { text: completion.choices[0].message.content, audio: null });
      io.to(roomId).emit('ai-status', 'listening');
    } catch (err) {
      console.error('AI Error:', err);
      io.to(roomId).emit('ai-status', 'listening');
    }
  });

  socket.on('disconnecting', () => {
    socket.rooms.forEach(roomId => {
      if (rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter(u => u.id !== socket.id);
        io.to(roomId).emit('room-users', rooms[roomId]);
      }
    });
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter(u => u.id !== socket.id);
      io.to(roomId).emit('room-users', rooms[roomId]);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
