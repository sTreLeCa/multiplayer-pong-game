import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "http://localhost:3000", // Your React client's URL
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// --- Game Constants ---
const GAME_AREA_WIDTH = 800;
const GAME_AREA_HEIGHT = 600;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
const PADDLE_OFFSET_X = 50; // Distance from edge for paddle initial position
const BALL_RADIUS = 10;
const INITIAL_BALL_SPEED = 5; // Magnitude for X and Y speed
const PADDLE_SPEED = 15;      // How many pixels the paddle moves per client update
const GAME_LOOP_INTERVAL = 1000 / 60; // Target 60 FPS for game loop
const WINNING_SCORE = 5;

// Constants for refined bounce physics
const MAX_BALL_SPEED_Y = 7; // Max vertical speed component of the ball
const PADDLE_BOUNCE_ANGLE_FACTOR = 0.30; // Determines how much paddle hit location affects ball's Y speed

// --- Game Types ---
interface Player {
  id: string;
  socket: Socket;
  playerNumber: 1 | 2;
}

interface PaddleState {
  x: number;
  y: number;
  width: number;
  height: number;
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
}

interface GameRoom {
  roomId: string;
  players: Player[];
  gameState?: GameState;
  gameLoopIntervalId?: NodeJS.Timeout;
}

// --- Server State ---
const activeRooms: Map<string, GameRoom> = new Map(); // roomId -> GameRoom

// --- Helper Functions ---
function createRoomId(): string {
  return `room-${Math.random().toString(36).substring(2, 9)}`;
}

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
      speedX: Math.random() > 0.5 ? INITIAL_BALL_SPEED : -INITIAL_BALL_SPEED, // Random initial X direction
      speedY: Math.random() > 0.5 ? INITIAL_BALL_SPEED : -INITIAL_BALL_SPEED, // Random initial Y direction
    },
    score: { player1: 0, player2: 0 },
    gameArea: { width: GAME_AREA_WIDTH, height: GAME_AREA_HEIGHT },
    status: 'playing', // Initial status when game state is created for a game
  };
}

function resetBall(gameState: GameState, lastScorer: 1 | 2) {
  gameState.ball.x = GAME_AREA_WIDTH / 2;
  gameState.ball.y = GAME_AREA_HEIGHT / 2;
  // Ball moves towards the player who was scored upon
  gameState.ball.speedX = lastScorer === 1 ? -INITIAL_BALL_SPEED : INITIAL_BALL_SPEED;
  // Randomize Y direction slightly, but less extreme than initial serve
  gameState.ball.speedY = (Math.random() * INITIAL_BALL_SPEED * 0.6 + INITIAL_BALL_SPEED * 0.2) * (Math.random() > 0.5 ? 1 : -1);
}

function updateGame(room: GameRoom) {
  if (!room.gameState || (room.gameState.status !== 'playing' && room.gameState.status !== 'paused')) return; // Allow update if paused for some reason, but mostly for 'playing'
  if (room.gameState.status === 'paused') { // If paused, just send current state, don't update physics
    io.to(room.roomId).emit('gameStateUpdate', room.gameState);
    return;
  }


  const { ball, player1Paddle, player2Paddle, gameArea, score } = room.gameState;

  // --- Ball Movement ---
  ball.x += ball.speedX;
  ball.y += ball.speedY;

  // --- Paddle-Ball Collision Detection ---
  // Player 1 (Left Paddle)
  if (
    ball.x - ball.radius < player1Paddle.x + player1Paddle.width &&
    ball.x + ball.radius > player1Paddle.x &&
    ball.y - ball.radius < player1Paddle.y + player1Paddle.height &&
    ball.y + ball.radius > player1Paddle.y &&
    ball.speedX < 0 // Ball is moving towards player 1
  ) {
    ball.speedX *= -1;
    let deltaY = ball.y - (player1Paddle.y + player1Paddle.height / 2);
    ball.speedY = deltaY * PADDLE_BOUNCE_ANGLE_FACTOR;
    if (Math.abs(ball.speedY) > MAX_BALL_SPEED_Y) {
      ball.speedY = MAX_BALL_SPEED_Y * Math.sign(ball.speedY);
    }
    ball.x = player1Paddle.x + player1Paddle.width + ball.radius; // Prevent sticking
  }

  // Player 2 (Right Paddle)
  if (
    ball.x + ball.radius > player2Paddle.x &&
    ball.x - ball.radius < player2Paddle.x + player2Paddle.width &&
    ball.y - ball.radius < player2Paddle.y + player2Paddle.height &&
    ball.y + ball.radius > player2Paddle.y &&
    ball.speedX > 0 // Ball is moving towards player 2
  ) {
    ball.speedX *= -1;
    let deltaY = ball.y - (player2Paddle.y + player2Paddle.height / 2);
    ball.speedY = deltaY * PADDLE_BOUNCE_ANGLE_FACTOR;
    if (Math.abs(ball.speedY) > MAX_BALL_SPEED_Y) {
      ball.speedY = MAX_BALL_SPEED_Y * Math.sign(ball.speedY);
    }
    ball.x = player2Paddle.x - ball.radius; // Prevent sticking
  }

  // --- Wall Bouncing (Top/Bottom) ---
  if (ball.y - ball.radius < 0 || ball.y + ball.radius > gameArea.height) {
    ball.speedY *= -1;
    if (ball.y - ball.radius < 0) ball.y = ball.radius; // Clamp to prevent going out
    if (ball.y + ball.radius > gameArea.height) ball.y = gameArea.height - ball.radius; // Clamp
  }

  // --- Scoring ---
  let justScored = false;
  if (ball.x + ball.radius < 0) { // Ball passed left paddle - Player 2 scores
    score.player2++;
    resetBall(room.gameState, 2); // Player 2 scored, ball goes to Player 1
    justScored = true;
  } else if (ball.x - ball.radius > gameArea.width) { // Ball passed right paddle - Player 1 scores
    score.player1++;
    resetBall(room.gameState, 1); // Player 1 scored, ball goes to Player 2
    justScored = true;
  }

  // --- Game Over Condition ---
  if (room.gameState.status === 'playing' && (score.player1 >= WINNING_SCORE || score.player2 >= WINNING_SCORE)) {
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
    // Send one final state update for game over
    io.to(room.roomId).emit('gameStateUpdate', room.gameState);
    return; // Stop further processing in this tick if game just ended
  }

  // Broadcast the updated game state if still playing or just scored
  if (room.gameState.status === 'playing' || justScored) {
    io.to(room.roomId).emit('gameStateUpdate', room.gameState);
  }
}

function startGame(room: GameRoom) {
  if (room.players.length !== 2) {
    console.error(`Attempted to start game in room ${room.roomId} with ${room.players.length} players.`);
    return;
  }

  room.gameState = initializeGameState();
  io.to(room.roomId).emit('gameStart', room.gameState); // Send initial state
  console.log(`Game started in room ${room.roomId}`);

  if (room.gameLoopIntervalId) { // Clear any old interval
    clearInterval(room.gameLoopIntervalId);
  }
  room.gameLoopIntervalId = setInterval(() => {
    updateGame(room);
  }, GAME_LOOP_INTERVAL);
}

// --- Express Route (Optional: for health check or info) ---
app.get('/', (req, res) => {
  res.send('Pong Server is Active!');
});

// --- Socket.IO Connection Handling ---
io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);
  let playerRoomId: string | null = null;
  let playerInRoomObject: Player | undefined;

  // Try to find a room with a waiting player or create a new one
  let roomToJoin: GameRoom | undefined;
  for (const room of activeRooms.values()) {
    if (room.players.length === 1) {
      roomToJoin = room;
      break;
    }
  }

  if (roomToJoin) {
    const playerNumber = 2;
    playerInRoomObject = { id: socket.id, socket, playerNumber };
    roomToJoin.players.push(playerInRoomObject);
    socket.join(roomToJoin.roomId);
    playerRoomId = roomToJoin.roomId;

    // Notify both players of their assignment
    roomToJoin.players[0].socket.emit('playerAssignment', {
      playerNumber: roomToJoin.players[0].playerNumber,
      roomId: roomToJoin.roomId,
      gameArea: { width: GAME_AREA_WIDTH, height: GAME_AREA_HEIGHT }
    });
    playerInRoomObject.socket.emit('playerAssignment', {
      playerNumber: playerInRoomObject.playerNumber,
      roomId: roomToJoin.roomId,
      gameArea: { width: GAME_AREA_WIDTH, height: GAME_AREA_HEIGHT }
    });

    console.log(`Player ${socket.id} (P${playerNumber}) joined room ${roomToJoin.roomId}. Starting game.`);
    io.to(roomToJoin.roomId).emit('message', 'Opponent found! Game is starting...');
    startGame(roomToJoin);

  } else {
    const newRoomId = createRoomId();
    const playerNumber = 1;
    playerInRoomObject = { id: socket.id, socket, playerNumber };
    const newRoom: GameRoom = {
      roomId: newRoomId,
      players: [playerInRoomObject],
    };
    activeRooms.set(newRoomId, newRoom);
    socket.join(newRoomId);
    playerRoomId = newRoomId;

    playerInRoomObject.socket.emit('playerAssignment', {
      playerNumber: playerInRoomObject.playerNumber,
      roomId: newRoomId,
      gameArea: { width: GAME_AREA_WIDTH, height: GAME_AREA_HEIGHT }
    });
    socket.emit('waitingForOpponent');
    socket.emit('message', 'Welcome to Pong! Waiting for an opponent...');
    console.log(`Player ${socket.id} (P${playerNumber}) created and joined room ${newRoomId}. Waiting for opponent.`);
  }

  socket.on('paddleMove', (data: { direction: 'up' | 'down' }) => {
    if (!playerRoomId || !playerInRoomObject) return;

    const room = activeRooms.get(playerRoomId);
    if (!room || !room.gameState || room.gameState.status !== 'playing') return;

    const paddleToMove = playerInRoomObject.playerNumber === 1
      ? room.gameState.player1Paddle
      : room.gameState.player2Paddle;

    if (data.direction === 'up') {
      paddleToMove.y -= PADDLE_SPEED;
    } else if (data.direction === 'down') {
      paddleToMove.y += PADDLE_SPEED;
    }

    // Keep paddle within game bounds
    paddleToMove.y = Math.max(0, Math.min(paddleToMove.y, GAME_AREA_HEIGHT - paddleToMove.height));
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    if (playerRoomId) {
      const room = activeRooms.get(playerRoomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        console.log(`Player ${socket.id} removed from room ${playerRoomId}. Players remaining: ${room.players.length}`);

        if (room.gameLoopIntervalId) { // If a game was in progress
          if (room.players.length < 2) { // Not enough players to continue
            clearInterval(room.gameLoopIntervalId);
            room.gameLoopIntervalId = undefined;
            if (room.gameState) {
              room.gameState.status = room.players.length === 1 ? 'paused' : 'gameOver'; // Paused if one remains, gameOver if empty
              console.log(`Game in room ${playerRoomId} ${room.gameState.status} due to player disconnect.`);
              // Notify remaining player
              if (room.players.length === 1) {
                room.players[0].socket.emit('opponentDisconnected', 'Your opponent has disconnected. Game paused.');
                io.to(room.roomId).emit('gameStateUpdate', room.gameState); // Send updated state
              }
            }
          }
        } else if (room.players.length === 1) { // Was waiting for opponent, now that one left
            console.log(`Player ${room.players[0].id} is now waiting alone in room ${playerRoomId}.`);
            room.players[0].socket.emit('message', 'Your opponent left. Waiting for a new opponent...');
            room.players[0].socket.emit('waitingForOpponent');
        }


        if (room.players.length === 0) {
          if (room.gameLoopIntervalId) clearInterval(room.gameLoopIntervalId); // Ensure loop is cleared
          activeRooms.delete(playerRoomId);
          console.log(`Room ${playerRoomId} closed as it's empty.`);
        }
      }
    }
  });
});

// --- Start Server ---
httpServer.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});