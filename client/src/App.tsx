import React, { useEffect, useState, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import './App.css'; // Assuming you have some basic styles here
import Board from './components/Board';
import Paddle from './components/Paddle';
import Ball from './components/Ball';
import Scoreboard from './components/Scoreboard';

const SERVER_URL = "http://localhost:3001";
const WINNING_SCORE = 5; // Define winning score on client too for display logic

// --- Client-side Type Definitions (mirroring server, ideally from a shared package) ---
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
  gameArea: { width: number; height: number; };
}

interface GameOverData {
  winner: 1 | 2;
  score: { player1: number; player2: number; };
}

function App() {
  // --- State Variables ---
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [gameStatusText, setGameStatusText] = useState<string>('Connecting...');
  const [serverMessage, setServerMessage] = useState<string>(''); // For general messages from server

  const socketRef = useRef<Socket | null>(null);

  // --- Effect for Socket Connection & Core Event Listeners ---
  useEffect(() => {
    const newSocket = io(SERVER_URL);
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('Connected to server! Socket ID:', newSocket.id);
      setIsConnected(true);
      // gameStatusText will be updated by its own effect based on isConnected & playerNumber
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server.');
      setIsConnected(false);
      setPlayerNumber(null);
      setRoomId(null);
      setGameState(null);
      setServerMessage('');
      // gameStatusText will be updated by its own effect
    });

    newSocket.on('message', (data: string) => {
      console.log('Message from server:', data);
      setServerMessage(data);
    });

    newSocket.on('waitingForOpponent', () => {
      // gameState will be null, gameStatusText effect will handle "Waiting..."
      setGameState(null); // Ensure any previous game state is cleared
    });

    newSocket.on('playerAssignment', (data: PlayerAssignmentData) => {
      console.log('Player assignment received:', data);
      setPlayerNumber(data.playerNumber);
      setRoomId(data.roomId);
      // Initialize a basic game state structure for Board dimensions if no gameState yet
      // Actual game objects will come from gameStart or gameStateUpdate
      if (!gameState) {
        setGameState({
          player1Paddle: { x: 50, y: data.gameArea.height / 2 - 50, width: 10, height: 100 }, // Initial rough guess
          player2Paddle: { x: data.gameArea.width - 60, y: data.gameArea.height / 2 - 50, width: 10, height: 100 }, // Initial rough guess
          ball: { x: data.gameArea.width / 2, y: data.gameArea.height / 2, radius: 10 },
          score: { player1: 0, player2: 0 },
          gameArea: data.gameArea,
          status: 'waiting', // Or 'assigned' if you prefer
        });
      }
    });

    newSocket.on('gameStart', (initialGameState: ClientGameState) => {
      console.log('GameStart event received:', initialGameState);
      setGameState(initialGameState);
      setServerMessage(''); // Clear any "waiting" messages
    });

    newSocket.on('gameStateUpdate', (newGameState: ClientGameState) => {
      // console.log('GameStateUpdate received:', newGameState); // Can be very verbose
      setGameState(newGameState);
    });

    newSocket.on('gameOver', (data: GameOverData) => {
      // The gameState.status will be 'gameOver' from a gameStateUpdate.
      // The gameStatusText effect will construct the detailed "Game Over" message.
      console.log('GameOver event received:', data);
      // Optionally, set a specific server message if needed, but gameStatusText handles main display
      // setServerMessage(`Player ${data.winner} wins!`);
    });

    newSocket.on('opponentDisconnected', (msg: string) => {
      console.log('Opponent disconnected:', msg);
      setServerMessage(msg); // Display this direct message
      // Server will likely send a gameStateUpdate with status 'paused' or 'gameOver'.
      // gameStatusText will update accordingly.
    });

    // Cleanup on component unmount
    return () => {
      console.log('Cleaning up socket connection:', newSocket.id);
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, []); // Empty dependency array: runs once on mount, cleans up on unmount.

  // --- Effect for Managing Game Status Text ---
  useEffect(() => {
    if (!isConnected) {
      setGameStatusText('Disconnected. Please refresh.');
      return;
    }

    if (!playerNumber) {
      setGameStatusText('Connected. Waiting for player assignment...');
      return;
    }

    if (!gameState || gameState.status === 'waiting') {
      setGameStatusText(`You are Player ${playerNumber}. Waiting for an opponent...`);
      return;
    }

    switch (gameState.status) {
      case 'playing':
        setGameStatusText(`Game in progress. You are Player ${playerNumber}.`);
        break;
      case 'paused':
        setGameStatusText('Game Paused. Opponent disconnected.');
        break;
      case 'gameOver':
        let winnerDetails = "";
        if (gameState.score.player1 >= WINNING_SCORE) {
          winnerDetails = `Player 1 wins!`;
        } else if (gameState.score.player2 >= WINNING_SCORE) {
          winnerDetails = `Player 2 wins!`;
        } else {
          winnerDetails = "Game Over."; // Fallback if score condition isn't met but status is gameOver (e.g. disconnect)
        }
        setGameStatusText(
          `${winnerDetails} Final Score: P1 ${gameState.score.player1} - P2 ${gameState.score.player2}`
        );
        break;
      default:
        setGameStatusText('Unknown game state.');
    }
  }, [isConnected, playerNumber, gameState]); // Dependencies that influence the game status text

  // --- Paddle Movement Input Handling ---
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!socketRef.current || !playerNumber || !gameState || gameState.status !== 'playing') {
      return;
    }

    let direction: 'up' | 'down' | null = null;
    const key = event.key.toLowerCase(); // Normalize key

    if (playerNumber === 1) {
      if (key === 'w') direction = 'up';
      else if (key === 's') direction = 'down';
    } else if (playerNumber === 2) {
      if (key === 'arrowup') direction = 'up';
      else if (key === 'arrowdown') direction = 'down';
    }

    if (direction) {
      socketRef.current.emit('paddleMove', { direction });
    }
  }, [playerNumber, gameState]); // gameState is needed to check gameState.status

  // Effect for adding/removing keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]); // Re-bind if handleKeyDown changes (due to its own dependencies)

  // --- Render Logic ---
  const renderGameArea = () => {
    if (!gameState || !playerNumber) { // Need playerNumber to know if we should even try to render a game for this client
      return null; // Or some placeholder like <p>Waiting to join game...</p>
    }

    const { player1Paddle, player2Paddle, ball, score, gameArea } = gameState;

    return (
      <>
        <Scoreboard score1={score.player1} score2={score.player2} />
        <Board width={gameArea.width} height={gameArea.height}>
          <Paddle {...player1Paddle} />
          <Paddle {...player2Paddle} />
          <Ball {...ball} />
        </Board>
        {gameState.status === 'playing' && (
          <p className="controls-text">Controls: Player 1 (W/S), Player 2 (Arrow Up/Down)</p>
        )}
      </>
    );
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Multiplayer Pong</h1>
        <p className="connection-status">
          Connection: {isConnected ? 'Connected' : 'Disconnected'}
          {playerNumber && roomId && ` (Player ${playerNumber} in Room: ${roomId.substring(0,10)}...)`}
        </p>
        <p className="game-status">{gameStatusText}</p>
        {serverMessage && <p className="server-message">Server: {serverMessage}</p>}

        {renderGameArea()}
      </header>
    </div>
  );
}

export default App;