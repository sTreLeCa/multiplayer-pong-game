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
const PADDLE_OFFSET_X = 50;
const BALL_RADIUS = 10;
const INITIAL_BALL_SPEED = 5;
const PADDLE_SPEED = 15;
const GAME_LOOP_INTERVAL = 1000 / 60;
const WINNING_SCORE = 5;
const MAX_BALL_SPEED_Y = 7;
const PADDLE_BOUNCE_ANGLE_FACTOR = 0.30;

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
  playAgainRequests: Set<string>; // Player IDs who requested to play again
}

// --- Server State ---
const activeRooms: Map<string, GameRoom> = new Map();

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
      speedX: Math.random() > 0.5 ? INITIAL_BALL_SPEED : -INITIAL_BALL_SPEED,
      speedY: Math.random() > 0.5 ? INITIAL_BALL_SPEED : -INITIAL_BALL_SPEED,
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
  // Randomize Y direction slightly
  gameState.ball.speedY = (Math.random() * INITIAL_BALL_SPEED * 0.6 + INITIAL_BALL_SPEED * 0.2) * (Math.random() > 0.5 ? 1 : -1);
}

function updateGame(room: GameRoom) {
  if (!room.gameState || (room.gameState.status !== 'playing' && room.gameState.status !== 'paused')) return;

  // If paused, just send current state, don't update physics (e.g., if one player disconnected)
  if (room.gameState.status === 'paused') {
    io.to(room.roomId).emit('gameStateUpdate', room.gameState);
    return;
  }

  const { ball, player1Paddle, player2Paddle, gameArea, score } = room.gameState;

  // Ball Movement
  ball.x += ball.speedX;
  ball.y += ball.speedY;

  // Paddle-Ball Collision Detection - Player 1 (Left Paddle)
  if (
    ball.x - ball.radius < player1Paddle.x + player1Paddle.width &&
    ball.x + ball.radius > player1Paddle.x &&
    ball.y - ball.radius < player1Paddle.y + player1Paddle.height &&
    ball.y + ball.radius > player1Paddle.y &&
    ball.speedX < 0
  ) {
    ball.speedX *= -1;
    let deltaY = ball.y - (player1Paddle.y + player1Paddle.height / 2);
    ball.speedY = deltaY * PADDLE_BOUNCE_ANGLE_FACTOR;
    if (Math.abs(ball.speedY) > MAX_BALL_SPEED_Y) ball.speedY = MAX_BALL_SPEED_Y * Math.sign(ball.speedY);
    ball.x = player1Paddle.x + player1Paddle.width + ball.radius; // Prevent sticking
  }

  // Paddle-Ball Collision Detection - Player 2 (Right Paddle)
  if (
    ball.x + ball.radius > player2Paddle.x &&
    ball.x - ball.radius < player2Paddle.x + player2Paddle.width &&
    ball.y - ball.radius < player2Paddle.y + player2Paddle.height &&
    ball.y + ball.radius > player2Paddle.y &&
    ball.speedX > 0
  ) {
    ball.speedX *= -1;
    let deltaY = ball.y - (player2Paddle.y + player2Paddle.height / 2);
    ball.speedY = deltaY * PADDLE_BOUNCE_ANGLE_FACTOR;
    if (Math.abs(ball.speedY) > MAX_BALL_SPEED_Y) ball.speedY = MAX_BALL_SPEED_Y * Math.sign(ball.speedY);
    ball.x = player2Paddle.x - ball.radius; // Prevent sticking
  }

  // Wall Bouncing (Top/Bottom)
  if (ball.y - ball.radius < 0 || ball.y + ball.radius > gameArea.height) {
    ball.speedY *= -1;
    if (ball.y - ball.radius < 0) ball.y = ball.radius;
    if (ball.y + ball.radius > gameArea.height) ball.y = gameArea.height - ball.radius;
  }

  // Scoring
  let justScored = false;
  if (ball.x + ball.radius < 0) { // Ball passed left paddle - Player 2 scores
    score.player2++;
    resetBall(room.gameState, 2);
    justScored = true;
  } else if (ball.x - ball.radius > gameArea.width) { // Ball passed right paddle - Player 1 scores
    score.player1++;
    resetBall(room.gameState, 1);
    justScored = true;
  }

  // Game Over Condition
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
    io.to(room.roomId).emit('gameStateUpdate', room.gameState); // Send final game over state
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
  room.gameState = initializeGameState(); // Resets scores, positions, etc.
  room.gameState.status = 'playing';      // Ensure status is 'playing'
  room.playAgainRequests.clear();         // Clear any previous play again requests for the new game

  io.to(room.roomId).emit('gameStart', room.gameState);
  console.log(`Game started/restarted in room ${room.roomId}`);

  if (room.gameLoopIntervalId) { // Clear any old interval before starting a new one
    clearInterval(room.gameLoopIntervalId);
  }
  room.gameLoopIntervalId = setInterval(() => {
    updateGame(room);
  }, GAME_LOOP_INTERVAL);
}

// --- Express Route ---
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
  for (const currentRoom of activeRooms.values()) {
    if (currentRoom.players.length === 1) {
      roomToJoin = currentRoom;
      break;
    }
  }

  if (roomToJoin) {
    const playerNumber = 2; // This new player will be Player 2
    playerInRoomObject = { id: socket.id, socket, playerNumber };
    roomToJoin.players.push(playerInRoomObject);
    socket.join(roomToJoin.roomId);
    playerRoomId = roomToJoin.roomId;

    // Notify Player 1 (already in room)
    roomToJoin.players[0].socket.emit('playerAssignment', {
      playerNumber: roomToJoin.players[0].playerNumber,
      roomId: roomToJoin.roomId,
      gameArea: { width: GAME_AREA_WIDTH, height: GAME_AREA_HEIGHT }
    });
    // Notify Player 2 (newly joined)
    playerInRoomObject.socket.emit('playerAssignment', {
      playerNumber: playerInRoomObject.playerNumber,
      roomId: roomToJoin.roomId,
      gameArea: { width: GAME_AREA_WIDTH, height: GAME_AREA_HEIGHT }
    });

    console.log(`Player ${socket.id} (P${playerNumber}) joined room ${roomToJoin.roomId}. Starting game.`);
    io.to(roomToJoin.roomId).emit('message', 'Opponent found! Game is starting...');
    startGame(roomToJoin); // startGame also clears playAgainRequests for the room
  } else {
    // Create a new room for this player (Player 1)
    const newRoomId = createRoomId();
    const playerNumber = 1;
    playerInRoomObject = { id: socket.id, socket, playerNumber };
    const newRoom: GameRoom = {
      roomId: newRoomId,
      players: [playerInRoomObject],
      playAgainRequests: new Set<string>(), // Initialize for the new room
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

  socket.on('requestPlayAgain', () => {
    if (!playerRoomId || !playerInRoomObject) return; // Should not happen if logic is correct
    const room = activeRooms.get(playerRoomId);

    if (!room || room.players.length !== 2 || !room.gameState || room.gameState.status !== 'gameOver') {
      console.log(`Player ${socket.id} sent requestPlayAgain in invalid state for room ${playerRoomId}. Status: ${room?.gameState?.status}, Players: ${room?.players.length}`);
      socket.emit('message', 'Cannot request play again at this time.'); // Inform player
      return;
    }

    room.playAgainRequests.add(playerInRoomObject.id);
    console.log(`Player ${playerInRoomObject.id} (P${playerInRoomObject.playerNumber}) requested to play again in room ${room.roomId}. Total requests: ${room.playAgainRequests.size}`);

    // Notify the other player (optional but good UX)
    const otherPlayer = room.players.find(p => p.id !== playerInRoomObject?.id);
    if (otherPlayer) {
        otherPlayer.socket.emit('message', `Player ${playerInRoomObject.playerNumber} wants to play again!`);
    }

    if (room.playAgainRequests.size === 2) {
      // Both players want to play again!
      console.log(`Both players in room ${room.roomId} want to play again. Resetting game.`);
      startGame(room); // This will reset game state, clear requests, and restart loop
    } else {
      // Notify requesting player they are waiting for opponent
      socket.emit('message', 'Request sent. Waiting for your opponent to play again...');
    }
  });

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
        // Clear this player's play again request if they had one
        if (playerInRoomObject) { // playerInRoomObject refers to the disconnected player's object
          room.playAgainRequests.delete(playerInRoomObject.id);
        }

        room.players = room.players.filter(p => p.id !== socket.id);
        console.log(`Player ${socket.id} removed from room ${playerRoomId}. Players remaining: ${room.players.length}`);

        if (room.gameLoopIntervalId && room.players.length < 2) {
            // If game was running and now not enough players, stop/pause it
            clearInterval(room.gameLoopIntervalId);
            room.gameLoopIntervalId = undefined;
            if (room.gameState) {
                room.gameState.status = 'paused'; // Or 'gameOver' if you prefer only one player can't continue
            }
            console.log(`Game in room ${playerRoomId} ${room.gameState?.status} due to player disconnect.`);
        }

        if (room.players.length === 1) { // One player remains
            const remainingPlayer = room.players[0];
            remainingPlayer.socket.emit('opponentDisconnected', 'Your opponent has disconnected.');
            if (room.gameState) { // If there was an active or paused game
                // If the game wasn't already over, mark it as paused (or game over)
                if (room.gameState.status !== 'gameOver') {
                    room.gameState.status = 'paused';
                }
                 // Inform remaining player that play again is void
                remainingPlayer.socket.emit('message', 'Play again option is now void.');
                io.to(room.roomId).emit('gameStateUpdate', room.gameState); // Send updated state
            }
            room.playAgainRequests.clear(); // Clear any pending play again requests for this room
        } else if (room.players.length === 0) { // Room is now empty
            if (room.gameLoopIntervalId) clearInterval(room.gameLoopIntervalId); // Ensure loop is stopped
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