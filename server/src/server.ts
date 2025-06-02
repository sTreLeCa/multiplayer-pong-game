import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "http://localhost:3000", // Allow your React client
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.send('Pong Server is running!');
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.emit('message', 'Welcome to Pong! You are connected.');

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });

  // More game-specific event handlers will go here
});

httpServer.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});