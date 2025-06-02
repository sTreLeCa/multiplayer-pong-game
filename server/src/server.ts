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

// --- Game Constants ---
const GAME_AREA_WIDTH = 800;
const GAME_AREA_HEIGHT = 600;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
const PADDLE_OFFSET_X = 50; // Distance from edge
const BALL_RADIUS = 10;
const GAME_LOOP_INTERVAL = 1000 / 60; // Target 60 FPS
const PADDLE_SPEED = 15;

// --- Game Types ---
interface Player {
  id: string;
  socket: Socket;
  playerNumber: 1 | 2; // Added player number here for convenience
}

interface PaddleState {
  x: number;
  y: number;
  width: number;
  height: number;
  // score will be part of GameState itself
}

interface BallState {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
}

interface GameState {
  player1Paddle: PaddleState;
  player2Paddle: PaddleState;
  ball: BallState;
  score: { player1: number; player2: number; };
  gameArea: { width: number; height: number; };
  status: 'waiting' | 'playing' | 'paused' | 'gameOver';
  // We might add 'lastUpdateTimestamp' for more advanced interpolation later
}

interface GameRoom {
  roomId: string;
  players: Player[]; // Can be 0, 1, or 2 players
  gameState?: GameState; // Optional until game starts
  gameLoopIntervalId?: NodeJS.Timeout;
}

// --- Server State ---
const activeRooms: Map<string, GameRoom> = new Map(); // roomId -> GameRoom

// Helper to create a unique room ID
function createRoomId(): string {
  return `room-${Math.random().toString(36).substring(2, 9)}`;
}

// Helper to initialize game state
function initializeGameState(): GameState {
  return {
    player1Paddle: {
      x: PADDLE_OFFSET_X,
      y: GAME_AREA_HEIGHT / 2 - PADDLE_HEIGHT / 2,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
    },
    player2Paddle: {
      x: GAME_AREA_WIDTH - PADDLE_OFFSET_X - PADDLE_WIDTH,
      y: GAME_AREA_HEIGHT / 2 - PADDLE_HEIGHT / 2,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
    },
    ball: {
      x: GAME_AREA_WIDTH / 2,
      y: GAME_AREA_HEIGHT / 2,
      radius: BALL_RADIUS,
      speedX: 5, // Initial speed
      speedY: 5, // Initial speed
    },
    score: { player1: 0, player2: 0 },
    gameArea: { width: GAME_AREA_WIDTH, height: GAME_AREA_HEIGHT },
    status: 'playing',
  };
}

function updateGame(room: GameRoom) {
  if (!room.gameState || room.gameState.status !== 'playing') return;

  const { ball, player1Paddle, player2Paddle, gameArea, score } = room.gameState;

  // --- Ball Movement ---
  ball.x += ball.speedX;
  ball.y += ball.speedY;

  // --- Paddle-Ball Collision Detection ---
  // Player 1 (Left Paddle)
  if (
    ball.x - ball.radius < player1Paddle.x + player1Paddle.width && // Ball's left edge past paddle's right edge
    ball.x + ball.radius > player1Paddle.x && // Ball's right edge past paddle's left edge
    ball.y - ball.radius < player1Paddle.y + player1Paddle.height && // Ball's top edge past paddle's bottom edge
    ball.y + ball.radius > player1Paddle.y && // Ball's bottom edge past paddle's top edge
    ball.speedX < 0 // Ball is moving towards player 1
  ) {
    ball.speedX *= -1;
    // Optional: Adjust ball.speedY based on where it hit the paddle
    // let deltaY = ball.y - (player1Paddle.y + player1Paddle.height / 2);
    // ball.speedY = deltaY * 0.35; // Example factor, tune this
    ball.x = player1Paddle.x + player1Paddle.width + ball.radius; // Prevent sticking
  }

  // Player 2 (Right Paddle)
  if (
    ball.x + ball.radius > player2Paddle.x && // Ball's right edge past paddle's left edge
    ball.x - ball.radius < player2Paddle.x + player2Paddle.width && // Ball's left edge past paddle's right edge
    ball.y - ball.radius < player2Paddle.y + player2Paddle.height && // Ball's top edge past paddle's bottom edge
    ball.y + ball.radius > player2Paddle.y && // Ball's bottom edge past paddle's top edge
    ball.speedX > 0 // Ball is moving towards player 2
  ) {
    ball.speedX *= -1;
    // Optional: Adjust ball.speedY based on where it hit the paddle
    // let deltaY = ball.y - (player2Paddle.y + player2Paddle.height / 2);
    // ball.speedY = deltaY * 0.35; // Example factor, tune this
    ball.x = player2Paddle.x - ball.radius; // Prevent sticking
  }


  // --- Wall Bouncing (Top/Bottom) ---
  if (ball.y - ball.radius < 0 || ball.y + ball.radius > gameArea.height) {
    ball.speedY *= -1;
    if (ball.y - ball.radius < 0) ball.y = ball.radius;
    if (ball.y + ball.radius > gameArea.height) ball.y = gameArea.height - ball.radius;
  }

  // --- Scoring ---
  let scored = false;
  if (ball.x - ball.radius < 0) { // Player 2 scores
    score.player2++;
    resetBall(room.gameState, 2);
    scored = true;
  } else if (ball.x + ball.radius > gameArea.width) { // Player 1 scores
    score.player1++;
    resetBall(room.gameState, 1);
    scored = true;
  }

  const WINNING_SCORE = 5;
  if (!scored && (score.player1 >= WINNING_SCORE || score.player2 >= WINNING_SCORE)) {
    room.gameState.status = 'gameOver';
    io.to(room.roomId).emit('gameOver', {
        winner: score.player1 >= WINNING_SCORE ? 1 : 2,
        score: room.gameState.score
    });
    if (room.gameLoopIntervalId) {
        clearInterval(room.gameLoopIntervalId);
        room.gameLoopIntervalId = undefined;
    }
    console.log(`Game over in room ${room.roomId}. Winner: Player ${score.player1 >= WINNING_SCORE ? 1 : 2}`);
  }


  // Broadcast the updated game state
  io.to(room.roomId).emit('gameStateUpdate', room.gameState);
}

function resetBall(gameState: GameState, lastScorer: 1 | 2) {
    gameState.ball.x = GAME_AREA_WIDTH / 2;
    gameState.ball.y = GAME_AREA_HEIGHT / 2;
    // Ball moves towards the player who was scored upon
    gameState.ball.speedX = lastScorer === 1 ? -5 : 5;
    gameState.ball.speedY = Math.random() > 0.5 ? 5 : -5; // Randomize Y direction
}


function startGame(room: GameRoom) {
  if (room.players.length !== 2) return; // Should not happen if logic is correct

  room.gameState = initializeGameState();
  io.to(room.roomId).emit('gameStart', room.gameState); // Send initial state
  console.log(`Game started in room ${room.roomId}`);

  // Clear any existing interval before starting a new one
  if (room.gameLoopIntervalId) {
    clearInterval(room.gameLoopIntervalId);
  }
  room.gameLoopIntervalId = setInterval(() => {
    updateGame(room);
  }, GAME_LOOP_INTERVAL);
}

app.get('/', (req, res) => {
  res.send('Pong Server is running!');
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  let playerRoomId: string | null = null;
  let playerInRoom: Player | undefined;

  // Try to find a room with a waiting player or create a new one
  let roomToJoin: GameRoom | undefined;
  for (const room of activeRooms.values()) {
    if (room.players.length === 1) {
      roomToJoin = room;
      break;
    }
  }
  if (roomToJoin) {
    // Join existing room with one player
    const playerNumber = 2; // The new player is player 2
    const newPlayer: Player = { id: socket.id, socket, playerNumber };
    roomToJoin.players.push(newPlayer);
    socket.join(roomToJoin.roomId);
    playerRoomId = roomToJoin.roomId;
    playerInRoom = newPlayer;

    // Notify players
    roomToJoin.players[0].socket.emit('playerAssignment', {
      playerNumber: roomToJoin.players[0].playerNumber,
      roomId: roomToJoin.roomId,
      gameArea: { width: GAME_AREA_WIDTH, height: GAME_AREA_HEIGHT }
    });
    newPlayer.socket.emit('playerAssignment', {
      playerNumber: newPlayer.playerNumber,
      roomId: roomToJoin.roomId,
      gameArea: { width: GAME_AREA_WIDTH, height: GAME_AREA_HEIGHT }
    });

    console.log(`Player ${socket.id} (P${playerNumber}) joined room ${roomToJoin.roomId}. Starting game.`);
    io.to(roomToJoin.roomId).emit('message', 'Opponent found! Game is starting...');
    startGame(roomToJoin);

  } else {
    // Create a new room
    const newRoomId = createRoomId();
    const playerNumber = 1;
    const newPlayer: Player = { id: socket.id, socket, playerNumber };
    const newRoom: GameRoom = {
      roomId: newRoomId,
      players: [newPlayer],
      // gameState will be initialized when the second player joins
    };
    activeRooms.set(newRoomId, newRoom);
    socket.join(newRoomId);
    playerRoomId = newRoomId;
    playerInRoom = newPlayer;

    socket.emit('playerAssignment', { // Notify even the first player immediately
      playerNumber: newPlayer.playerNumber,
      roomId: newRoomId,
      gameArea: { width: GAME_AREA_WIDTH, height: GAME_AREA_HEIGHT }
    });
    socket.emit('waitingForOpponent');
    socket.emit('message', 'Welcome to Pong! Waiting for an opponent...');
    console.log(`Player ${socket.id} (P${playerNumber}) created and joined room ${newRoomId}. Waiting for opponent.`);
  }

  // --- Handle Paddle Movement ---
  socket.on('paddleMove', (data: { direction: 'up' | 'down' }) => {
    if (!playerRoomId || !playerInRoom) return; // Player not in a room or not identified

    const room = activeRooms.get(playerRoomId);
    if (!room || !room.gameState || room.gameState.status !== 'playing') return;

    const paddleToMove = playerInRoom.playerNumber === 1
      ? room.gameState.player1Paddle
      : room.gameState.player2Paddle;

    if (data.direction === 'up') {
      paddleToMove.y -= PADDLE_SPEED;
    } else if (data.direction === 'down') {
      paddleToMove.y += PADDLE_SPEED;
    }

    // Keep paddle within game bounds
    const gameHeight = room.gameState.gameArea.height;
    if (paddleToMove.y < 0) {
      paddleToMove.y = 0;
    }
    if (paddleToMove.y + paddleToMove.height > gameHeight) {
      paddleToMove.y = gameHeight - paddleToMove.height;
    }

    // No need to emit gameStateUpdate here immediately,
    // the game loop will pick up the new paddle position and broadcast.
  });


  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    if (playerRoomId) {
      const room = activeRooms.get(playerRoomId);
      if (room) {
        // Remove player from room
        room.players = room.players.filter(p => p.id !== socket.id);
        console.log(`Player ${socket.id} removed from room ${playerRoomId}. Players remaining: ${room.players.length}`);

        if (room.gameLoopIntervalId) {
          clearInterval(room.gameLoopIntervalId);
          room.gameLoopIntervalId = undefined;
        }

        if (room.players.length > 0) {
          // Notify remaining player(s)
          room.players.forEach(p => {
            p.socket.emit('opponentDisconnected', 'Your opponent has disconnected.');
          });
          // If only one player remains, they might need to go back to a waiting state or the room ends.
          // For simplicity, we'll currently just end the game for this room.
          // Consider putting the remaining player back into a "waiting" state for a new opponent.
          if (room.gameState) room.gameState.status = 'gameOver'; // Mark game as over
          io.to(room.roomId).emit('gameStateUpdate', room.gameState); // Send final state if exists
        }

        // If no players left or game ended, delete the room
        if (room.players.length === 0) {
          activeRooms.delete(playerRoomId);
          console.log(`Room ${playerRoomId} closed as it's empty.`);
        } else if (room.players.length === 1 && room.gameState) {
            // If one player remains, the game is over. We might clean up the room
            // or allow the player to wait for another. For now, let's just log it.
            console.log(`Room ${playerRoomId} has one player remaining. Game over for this session.`);
        }
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});