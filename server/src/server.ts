// server/src/server.ts
import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// --- Game Types ---
interface Player {
  id: string;
  socket: Socket;
  // We might add more player-specific data later (e.g., paddle controlled by this player)
}

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  // score will be part of GameState or associated with a player in a room
}

interface Ball {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
}

interface GameRoom {
  roomId: string;
  players: [Player, Player]; // Exactly two players
  // We'll add gameState here later
  // gameState: GameState;
}

const gameArea = { width: 800, height: 600 }; // Example dimensions

// --- Server State ---
let waitingPlayer: Player | null = null;
const activeRooms: Map<string, GameRoom> = new Map(); // roomId -> GameRoom

app.get('/', (req, res) => {
  res.send('Pong Server is running!');
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  if (waitingPlayer) {
    // --- Start a new game ---
    const player1 = waitingPlayer;
    const player2: Player = { id: socket.id, socket };
    waitingPlayer = null; // Clear the waiting player

    const roomId = `room-${player1.id}-${player2.id}`;
    const newRoom: GameRoom = {
      roomId,
      players: [player1, player2],
      // gameState: initializeGameState() // We'll add this later
    };
    activeRooms.set(roomId, newRoom);

    // Join both players to the Socket.IO room
    player1.socket.join(roomId);
    player2.socket.join(roomId);

    // Notify players they are paired and which player they are
    player1.socket.emit('playerAssignment', { playerNumber: 1, roomId, gameArea });
    player2.socket.emit('playerAssignment', { playerNumber: 2, roomId, gameArea });

    console.log(`Game room ${roomId} created for ${player1.id} and ${player2.id}`);
    io.to(roomId).emit('message', 'Opponent found! Game is starting...');
    // Later we'll emit 'gameStart' or initial 'gameStateUpdate'
  } else {
    // --- Add player to waiting queue ---
    waitingPlayer = { id: socket.id, socket };
    socket.emit('message', 'Welcome to Pong! Waiting for an opponent...');
    socket.emit('waitingForOpponent');
    console.log(`User ${socket.id} is waiting for an opponent.`);
  }

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
      console.log('Waiting player disconnected.');
    } else {
      // Handle disconnection if player was in a room
      activeRooms.forEach((room, roomId) => {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          const opponent = room.players[1 - playerIndex]; // Get the other player
          if (opponent) {
            opponent.socket.emit('opponentDisconnected', 'Your opponent has disconnected.');
            opponent.socket.leave(roomId); // Make opponent leave the socket.io room
          }
          activeRooms.delete(roomId);
          console.log(`Room ${roomId} closed due to player disconnection.`);
          // If waitingPlayer is now null, and opponent wants to play again, they'd become the waiting player
          // For now, we just end the game for the room.
        }
      });
    }
  });

  // More game-specific event handlers will go here
});

httpServer.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});