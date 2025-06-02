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
const PADDLE_OFFSET_X = 50;
const BALL_RADIUS = 10;
const INITIAL_BALL_SPEED = 5;
const PADDLE_SPEED = 15;
const GAME_LOOP_INTERVAL = 1000 / 60;
const WINNING_SCORE = 5;
const MAX_BALL_SPEED_Y = 7;
const PADDLE_BOUNCE_ANGLE_FACTOR = 0.30;

// --- Game Types ---
interface Player { id: string; socket: Socket; playerNumber: 1 | 2; }
interface PaddleState { x: number; y: number; width: number; height: number; }
interface BallState { x: number; y: number; radius: number; speedX: number; speedY: number; }
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
  playAgainRequests: Set<string>;
}

// --- Server State ---
const activeRooms: Map<string, GameRoom> = new Map();

// --- Helper Functions ---
function createRoomId(): string { return `room-${Math.random().toString(36).substring(2, 9)}`; }

function initializeGameState(): GameState {
  return {
    player1Paddle: { x: PADDLE_OFFSET_X, y: GAME_AREA_HEIGHT / 2 - PADDLE_HEIGHT / 2, width: PADDLE_WIDTH, height: PADDLE_HEIGHT },
    player2Paddle: { x: GAME_AREA_WIDTH - PADDLE_OFFSET_X - PADDLE_WIDTH, y: GAME_AREA_HEIGHT / 2 - PADDLE_HEIGHT / 2, width: PADDLE_WIDTH, height: PADDLE_HEIGHT },
    ball: { x: GAME_AREA_WIDTH / 2, y: GAME_AREA_HEIGHT / 2, radius: BALL_RADIUS, speedX: Math.random() > 0.5 ? INITIAL_BALL_SPEED : -INITIAL_BALL_SPEED, speedY: Math.random() > 0.5 ? INITIAL_BALL_SPEED : -INITIAL_BALL_SPEED },
    score: { player1: 0, player2: 0 },
    gameArea: { width: GAME_AREA_WIDTH, height: GAME_AREA_HEIGHT },
    status: 'playing',
  };
}

function resetBall(gameState: GameState, lastScorer: 1 | 2) {
  gameState.ball.x = GAME_AREA_WIDTH / 2;
  gameState.ball.y = GAME_AREA_HEIGHT / 2;
  gameState.ball.speedX = lastScorer === 1 ? -INITIAL_BALL_SPEED : INITIAL_BALL_SPEED;
  gameState.ball.speedY = (Math.random() * INITIAL_BALL_SPEED * 0.6 + INITIAL_BALL_SPEED * 0.2) * (Math.random() > 0.5 ? 1 : -1);
}

function updateGame(room: GameRoom) {
  if (!room.gameState || (room.gameState.status !== 'playing' && room.gameState.status !== 'paused')) return;
  if (room.gameState.status === 'paused') {
    io.to(room.roomId).emit('gameStateUpdate', room.gameState);
    return;
  }

  const { ball, player1Paddle, player2Paddle, gameArea, score } = room.gameState;

  ball.x += ball.speedX;
  ball.y += ball.speedY;

  // P1 Paddle Collision
  if (ball.x - ball.radius < player1Paddle.x + player1Paddle.width && ball.x + ball.radius > player1Paddle.x && ball.y - ball.radius < player1Paddle.y + player1Paddle.height && ball.y + ball.radius > player1Paddle.y && ball.speedX < 0) {
    ball.speedX *= -1;
    let deltaY = ball.y - (player1Paddle.y + player1Paddle.height / 2);
    ball.speedY = deltaY * PADDLE_BOUNCE_ANGLE_FACTOR;
    if (Math.abs(ball.speedY) > MAX_BALL_SPEED_Y) ball.speedY = MAX_BALL_SPEED_Y * Math.sign(ball.speedY);
    ball.x = player1Paddle.x + player1Paddle.width + ball.radius;
  }

  // P2 Paddle Collision
  if (ball.x + ball.radius > player2Paddle.x && ball.x - ball.radius < player2Paddle.x + player2Paddle.width && ball.y - ball.radius < player2Paddle.y + player2Paddle.height && ball.y + ball.radius > player2Paddle.y && ball.speedX > 0) {
    ball.speedX *= -1;
    let deltaY = ball.y - (player2Paddle.y + player2Paddle.height / 2);
    ball.speedY = deltaY * PADDLE_BOUNCE_ANGLE_FACTOR;
    if (Math.abs(ball.speedY) > MAX_BALL_SPEED_Y) ball.speedY = MAX_BALL_SPEED_Y * Math.sign(ball.speedY);
    ball.x = player2Paddle.x - ball.radius;
  }

  // Wall Bouncing
  if (ball.y - ball.radius < 0 || ball.y + ball.radius > gameArea.height) {
    ball.speedY *= -1;
    if (ball.y - ball.radius < 0) ball.y = ball.radius;
    if (ball.y + ball.radius > gameArea.height) ball.y = gameArea.height - ball.radius;
  }

  // Scoring
  let justScored = false;
  if (ball.x + ball.radius < 0) { score.player2++; resetBall(room.gameState, 2); justScored = true; }
  else if (ball.x - ball.radius > gameArea.width) { score.player1++; resetBall(room.gameState, 1); justScored = true; }

  // Game Over
  if (room.gameState.status === 'playing' && (score.player1 >= WINNING_SCORE || score.player2 >= WINNING_SCORE)) {
    room.gameState.status = 'gameOver';
    io.to(room.roomId).emit('gameOver', { winner: score.player1 >= WINNING_SCORE ? 1 : 2, score: room.gameState.score });
    if (room.gameLoopIntervalId) { clearInterval(room.gameLoopIntervalId); room.gameLoopIntervalId = undefined; }
    console.log(`Game over in room ${room.roomId}. Winner: P${score.player1 >= WINNING_SCORE ? 1 : 2}`);
    io.to(room.roomId).emit('gameStateUpdate', room.gameState);
    return;
  }

  if (room.gameState.status === 'playing' || justScored) {
    io.to(room.roomId).emit('gameStateUpdate', room.gameState);
  }
}

function startGame(room: GameRoom) {
  if (room.players.length !== 2) { console.error(`startGame: Room ${room.roomId} != 2 players.`); return; }
  room.players.sort((a, b) => a.playerNumber - b.playerNumber); // Ensure P1 is [0], P2 is [1]

  room.gameState = initializeGameState();
  room.gameState.status = 'playing';
  room.playAgainRequests.clear();

  io.to(room.roomId).emit('gameStart', room.gameState);
  console.log(`Game started/restarted in room ${room.roomId}`);

  if (room.gameLoopIntervalId) clearInterval(room.gameLoopIntervalId);
  room.gameLoopIntervalId = setInterval(() => { updateGame(room); }, GAME_LOOP_INTERVAL);
}

// --- Express Route ---
app.get('/', (req, res) => { res.send('Pong Server is Active!'); });

// --- Socket.IO Connection Handling ---
io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);
  let playerRoomId: string | null = null;
  let playerInRoomObject: Player | undefined;

  let roomToJoin: GameRoom | undefined;
  for (const currentRoom of activeRooms.values()) {
    if (currentRoom.players.length === 1) {
      roomToJoin = currentRoom;
      break;
    }
  }

  if (roomToJoin) { // Join existing room
    const existingPlayer = roomToJoin.players[0];
    const newPlayerNumber = existingPlayer.playerNumber === 1 ? 2 : 1;

    playerInRoomObject = { id: socket.id, socket, playerNumber: newPlayerNumber };
    roomToJoin.players.push(playerInRoomObject);
    roomToJoin.players.sort((a, b) => a.playerNumber - b.playerNumber); // Keep P1 then P2

    socket.join(roomToJoin.roomId);
    playerRoomId = roomToJoin.roomId;

    const gameAreaPayload = { width: GAME_AREA_WIDTH, height: GAME_AREA_HEIGHT };
    roomToJoin.players.forEach(p => { // Re-emit assignment to both
        p.socket.emit('playerAssignment', {
            playerNumber: p.playerNumber,
            roomId: roomToJoin!.roomId,
            gameArea: gameAreaPayload
        });
    });

    console.log(`P${newPlayerNumber} (${socket.id}) joined room ${roomToJoin.roomId} with P${existingPlayer.playerNumber}. Starting game.`);
    io.to(roomToJoin.roomId).emit('message', 'Opponent found! Game is starting...');
    startGame(roomToJoin);
  } else { // Create new room
    const newRoomId = createRoomId();
    const playerNumber = 1;
    playerInRoomObject = { id: socket.id, socket, playerNumber };
    const newRoom: GameRoom = {
      roomId: newRoomId,
      players: [playerInRoomObject],
      playAgainRequests: new Set<string>()
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
    socket.emit('message', 'Welcome! Waiting for an opponent...');
    console.log(`P${playerNumber} (${socket.id}) created room ${newRoomId}. Waiting.`);
  }

    socket.on('requestPlayAgain', () => {
    if (!playerRoomId || !playerInRoomObject) return;
    const room = activeRooms.get(playerRoomId);

    if (!room || room.players.length !== 2 || !room.gameState || room.gameState.status !== 'gameOver') {
      socket.emit('message', 'Cannot request play again now.'); return;
    }

    const gameEndedByScore = room.gameState.score.player1 >= WINNING_SCORE || room.gameState.score.player2 >= WINNING_SCORE;
    if (!gameEndedByScore) {
      socket.emit('message', 'Game did not end by score. Cannot play again.'); return;
    }

    room.playAgainRequests.add(playerInRoomObject.id);
    console.log(`P${playerInRoomObject.playerNumber} (${playerInRoomObject.id}) requested play again in room ${room.roomId}. Total: ${room.playAgainRequests.size}`);

    const otherPlayer = room.players.find(p => p.id !== playerInRoomObject?.id);
    if (otherPlayer) otherPlayer.socket.emit('message', `Player ${playerInRoomObject.playerNumber} wants to play again!`);

    if (room.playAgainRequests.size === 2) {
      console.log(`Both players in room ${room.roomId} want to play again. Resetting.`);
      startGame(room);
    } else {
      socket.emit('message', 'Request sent. Waiting for opponent...');
    }
  });

  socket.on('paddleMove', (data: { direction: 'up' | 'down' }) => {
    if (!playerRoomId || !playerInRoomObject) return;
    const room = activeRooms.get(playerRoomId);
    if (!room || !room.gameState || room.gameState.status !== 'playing') return;

    const paddleToMove = playerInRoomObject.playerNumber === 1 ? room.gameState.player1Paddle : room.gameState.player2Paddle;
    if (data.direction === 'up') paddleToMove.y -= PADDLE_SPEED;
    else if (data.direction === 'down') paddleToMove.y += PADDLE_SPEED;
    paddleToMove.y = Math.max(0, Math.min(paddleToMove.y, GAME_AREA_HEIGHT - paddleToMove.height));
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    if (playerRoomId) {
      const room = activeRooms.get(playerRoomId);
      if (room) {
        const disconnectedPlayerObject = room.players.find(p => p.id === socket.id);
        if (disconnectedPlayerObject) room.playAgainRequests.delete(disconnectedPlayerObject.id);

        room.players = room.players.filter(p => p.id !== socket.id);
        console.log(`P${disconnectedPlayerObject?.playerNumber || 'N/A'} (${socket.id}) removed from room ${playerRoomId}. Left: ${room.players.length}`);

        if (room.gameLoopIntervalId && room.players.length < 2) {
            clearInterval(room.gameLoopIntervalId);
            room.gameLoopIntervalId = undefined;
            if (room.gameState) room.gameState.status = 'gameOver'; // Game ends
            console.log(`Game in room ${playerRoomId} ended due to disconnect. Status: ${room.gameState?.status}`);
        }

        if (room.players.length === 1) { // One player remains
            const remainingPlayer = room.players[0];
            remainingPlayer.socket.emit('opponentDisconnected', 'Opponent disconnected. Game ended.');
            if (room.gameState) {
                if (room.gameState.status !== 'gameOver') room.gameState.status = 'gameOver'; // Ensure game is marked over
                remainingPlayer.socket.emit('message', 'Play again not possible with previous opponent.');
                io.to(room.roomId).emit('gameStateUpdate', room.gameState);
            }
            room.playAgainRequests.clear();
            remainingPlayer.socket.emit('waitingForOpponent'); // Let remaining player wait for new opponent
        } else if (room.players.length === 0) { // Room empty
            if (room.gameLoopIntervalId) clearInterval(room.gameLoopIntervalId);
            activeRooms.delete(playerRoomId);
            console.log(`Room ${playerRoomId} closed (empty).`);
        }
      }
    }
  });
});

// --- Start Server ---
httpServer.listen(PORT, () => { console.log(`Server is listening on http://localhost:${PORT}`); });