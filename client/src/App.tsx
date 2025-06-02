// client/src/App.tsx
import React, { useEffect, useState, useRef } from 'react'; // Added useRef
import io, { Socket } from 'socket.io-client';
import './App.css';
import Board from './components/Board';
import Paddle from './components/Paddle';
import Ball from './components/Ball';
import Scoreboard from './components/Scoreboard';

const SERVER_URL = "http://localhost:3001";

// --- Client-side Game State Types (mirroring server) ---
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
  // speedX and speedY are not strictly needed on client for rendering, but good to have if debugging
}

interface ClientGameState {
  player1Paddle: PaddleState;
  player2Paddle: PaddleState;
  ball: BallState;
  score: { player1: number; player2: number; };
  gameArea: { width: number; height: number; };
  status: 'waiting' | 'playing' | 'paused' | 'gameOver';
}

interface PlayerAssignmentData {
  playerNumber: 1 | 2;
  roomId: string;
  gameArea: { width: number; height: number; }; // Keep this for initial setup
}


function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [message, setMessage] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameStatusText, setGameStatusText] = useState<string>('Connecting...'); // Renamed for clarity

  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const socketRef = useRef<Socket | null>(null); // To access socket in event handlers if needed


  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('Connected to server! Socket ID:', newSocket.id);
      setIsConnected(true);
      setGameStatusText('Connected. Waiting for assignment...');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server.');
      setIsConnected(false);
      setPlayerNumber(null);
      setRoomId(null);
      setGameState(null);
      setGameStatusText('Disconnected. Please refresh.');
      setMessage('');
    });

    newSocket.on('message', (data: string) => {
      console.log('Message from server:', data);
      setMessage(data);
    });

    newSocket.on('waitingForOpponent', () => {
      setGameStatusText('Waiting for an opponent...');
      setGameState(null); // Clear any previous game state
    });

    newSocket.on('playerAssignment', (data: PlayerAssignmentData) => {
      console.log('Player assignment received:', data);
      setPlayerNumber(data.playerNumber);
      setRoomId(data.roomId);
      // Don't set gameStatusText here yet, wait for gameStart or first gameStateUpdate
      // Initialize a very basic game state for the Board component dimensions
      // The actual game objects will come from gameStateUpdate or gameStart
      if (!gameState) { // Only if not already set by gameStart
        setGameState({
            player1Paddle: { x: 0, y: 0, width: 10, height: 100 }, // Placeholder
            player2Paddle: { x: 0, y: 0, width: 10, height: 100 }, // Placeholder
            ball: { x: 0, y: 0, radius: 10 }, // Placeholder
            score: { player1: 0, player2: 0 },
            gameArea: data.gameArea,
            status: 'waiting',
        });
      }
    });

    newSocket.on('gameStart', (initialGameState: ClientGameState) => {
      console.log('GameStart event received:', initialGameState);
      setGameState(initialGameState);
      setGameStatusText(`Game started! You are Player ${playerNumber}.`);
      setMessage(''); // Clear previous messages
    });

    newSocket.on('gameStateUpdate', (newGameState: ClientGameState) => {
      // console.log('GameStateUpdate received:', newGameState); // Can be very verbose
      setGameState(newGameState);
      if (newGameState.status === 'playing' && gameStatusText.startsWith('Waiting')) {
        setGameStatusText(`Game in progress. You are Player ${playerNumber}.`);
      } else if (newGameState.status === 'gameOver') {
        setGameStatusText(`Game Over! Final Score: P1 ${newGameState.score.player1} - P2 ${newGameState.score.player2}`);
      }
    });

    newSocket.on('opponentDisconnected', (msg: string) => {
      console.log('Opponent disconnected:', msg);
      setGameStatusText(msg + (gameState ? ` Final Score: P1 ${gameState.score.player1} - P2 ${gameState.score.player2}` : ' Game Over.'));
      setMessage(msg);
      // Server now sends gameStateUpdate with status 'gameOver', so client doesn't need to nullify gameState
    });

    return () => {
      newSocket.disconnect();
    };
  }, []); // playerNumber dependency removed as it's set within this effect or from server

  const renderGameContent = () => {
    if (!gameState) {
      return <p>{gameStatusText}</p>;
    }

    // Destructure for cleaner access
    const { player1Paddle, player2Paddle, ball, score, gameArea } = gameState;

    return (
      <>
        <Scoreboard score1={score.player1} score2={score.player2} />
        <Board width={gameArea.width} height={gameArea.height}>
          <Paddle {...player1Paddle} />
          <Paddle {...player2Paddle} />
          <Ball {...ball} />
        </Board>
        <p>Game Status: {gameStatusText}</p>
        {message && <p>Server Message: {message}</p>}
      </>
    );
  };


  return (
    <div className="App">
      <header className="App-header">
        <h1>Multiplayer Pong</h1>
        <p>Connection: {isConnected ? 'Connected' : 'Disconnected'} {playerNumber && `(Player ${playerNumber} in Room ${roomId})`}</p>
        {renderGameContent()}
      </header>
    </div>
  );
}

export default App;