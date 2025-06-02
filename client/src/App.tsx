import React, { useEffect, useState, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import './App.css'; // Make sure you have this file, even if empty, or remove import
import Board from './components/Board';
import Paddle from './components/Paddle';
import Ball from './components/Ball';
import Scoreboard from './components/Scoreboard';

const SERVER_URL = "http://localhost:3001";
const WINNING_SCORE = 5; // Should match server's WINNING_SCORE for consistent UI

// --- Client-side Type Definitions ---
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

interface GameOverData { // Payload for 'gameOver' event from server
  winner: 1 | 2;
  score: { player1: number; player2: number; };
}

function App() {
  // --- State Variables ---
  const [socket, setSocket] = useState<Socket | null>(null); // The socket instance
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [gameStatusText, setGameStatusText] = useState<string>('Connecting...');
  const [serverMessage, setServerMessage] = useState<string>(''); // For general messages from server
  const [initialGameArea, setInitialGameArea] = useState<{width: number, height: number} | null>(null);
  const [hasRequestedPlayAgain, setHasRequestedPlayAgain] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null); // Ref for stable socket access in callbacks

  // --- Effect for Socket Connection & Core Event Listeners (Runs Once) ---
  useEffect(() => {
    const newSocket = io(SERVER_URL);
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server! Socket ID:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server.');
      setIsConnected(false);
      // Reset all game-related states on disconnect
      setPlayerNumber(null);
      setRoomId(null);
      setGameState(null);
      setServerMessage('');
      setInitialGameArea(null);
      setHasRequestedPlayAgain(false);
    });

    newSocket.on('message', (data: string) => {
      console.log('Message from server:', data);
      setServerMessage(data);
      // If server indicates play again is void, reset client's request state
      if (data.includes("Play again option is now void") || data.includes("Waiting for a new opponent...")) {
        setHasRequestedPlayAgain(false);
      }
    });

    newSocket.on('waitingForOpponent', () => {
      setGameState(null); // Clear full game state, initialGameArea might persist
    });

    newSocket.on('playerAssignment', (data: PlayerAssignmentData) => {
      console.log('Player assignment received:', data);
      setPlayerNumber(data.playerNumber);
      setRoomId(data.roomId);
      setInitialGameArea(data.gameArea); // Store gameArea for initial Board rendering
      setGameState(null); // Clear any old full gameState until 'gameStart'
      setHasRequestedPlayAgain(false); // Reset play again status on new assignment
    });

    newSocket.on('gameStart', (initialFullGameState: ClientGameState) => {
      console.log('GameStart event received (new game/restart):', initialFullGameState);
      setGameState(initialFullGameState);
      setInitialGameArea(initialFullGameState.gameArea); // Ensure this is also up-to-date
      setServerMessage(''); // Clear previous messages like "Waiting..."
      setHasRequestedPlayAgain(false); // Reset play again status when a new game truly starts
    });

    newSocket.on('gameStateUpdate', (newGameState: ClientGameState) => {
      setGameState(newGameState);
      // Fallback: if initialGameArea wasn't set somehow, get it from first gameStateUpdate
      if (!initialGameArea && newGameState.gameArea) {
        setInitialGameArea(newGameState.gameArea);
      }
    });

    newSocket.on('gameOver', (data: GameOverData) => {
      // The actual 'gameOver' status is set via 'gameStateUpdate'.
      // This event is more of a signal, but the UI mainly reacts to gameState.status.
      console.log('Server signalled GameOver:', data);
    });

    newSocket.on('opponentDisconnected', (msg: string) => {
      console.log('Opponent disconnected:', msg);
      setServerMessage(msg);
      setHasRequestedPlayAgain(false); // Opponent left, so play again with them is void
      // The server will send a gameStateUpdate with status 'paused' or 'gameOver'.
    });

    // Cleanup on component unmount
    return () => {
      console.log('Cleaning up socket connection:', newSocket.id);
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, []); // Empty dependency array: runs once on mount, cleans up on unmount.

  // --- Effect for Managing Game Status Text ---
  useEffect(() => {
    if (!isConnected) {
      setGameStatusText('Disconnected. Please refresh.');
      return;
    }
    if (!playerNumber || !initialGameArea) {
      setGameStatusText('Connected. Waiting for player assignment...');
      return;
    }
    if (!gameState) {
      // We have player number and game area, but no full game state (e.g. waiting for gameStart)
      setGameStatusText(`You are Player ${playerNumber}. Waiting for game to start...`);
      return;
    }

    // From here, gameState is assumed to be available
    switch (gameState.status) {
      case 'waiting': // Server might briefly set this, or client default
        setGameStatusText(`You are Player ${playerNumber}. Waiting for opponent or game to start...`);
        break;
      case 'playing':
        setGameStatusText(`Game in progress. You are Player ${playerNumber}.`);
        break;
      case 'paused':
        setGameStatusText('Game Paused. Opponent disconnected.');
        break;
      case 'gameOver':
        let winnerText = "";
        if (gameState.score.player1 >= WINNING_SCORE) winnerText = `Player 1 wins!`;
        else if (gameState.score.player2 >= WINNING_SCORE) winnerText = `Player 2 wins!`;
        else winnerText = "Game Over."; // For disconnects or other non-score based endings

        let statusMessage = `${winnerText} Final Score: P1 ${gameState.score.player1} - P2 ${gameState.score.player2}`;
        if (hasRequestedPlayAgain && roomId) { // Check roomId to ensure we are in a game context for play again
            statusMessage += " (Waiting for opponent to play again...)";
        }
        setGameStatusText(statusMessage);
        break;
      default:
        setGameStatusText('Unknown game state.');
    }
  }, [isConnected, playerNumber, gameState, initialGameArea, hasRequestedPlayAgain, roomId]);

  // --- Handle "Play Again" Button Click ---
  const handlePlayAgain = () => {
    if (socketRef.current && gameState?.status === 'gameOver' && !hasRequestedPlayAgain && roomId) {
      socketRef.current.emit('requestPlayAgain');
      setHasRequestedPlayAgain(true);
      setServerMessage("Requesting to play again..."); // Immediate feedback
    }
  };

  // --- Paddle Movement Input Handling ---
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!socketRef.current || !playerNumber || !gameState || gameState.status !== 'playing') {
      return;
    }
    let direction: 'up' | 'down' | null = null;
    const key = event.key.toLowerCase(); // Normalize key (e.g., "ArrowUp" -> "arrowup")

    if (playerNumber === 1) {
      if (key === 'w') direction = 'up';
      else if (key === 's') direction = 'down';
    } else if (playerNumber === 2) {
      if (key === 'arrowup') direction = 'up';
      else if (key === 'arrowdown') direction = 'down';
    }

    // Prevent default browser action for game control keys
    if (['w', 's', 'arrowup', 'arrowdown'].includes(key)) {
      event.preventDefault();
    }

    if (direction) {
      socketRef.current.emit('paddleMove', { direction });
    }
  }, [playerNumber, gameState]); // Dependencies for useCallback

  // Effect for adding/removing keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]); // Re-bind if handleKeyDown (and its dependencies) changes

  // --- Render Logic ---
  const renderGameControls = () => {
    // Show "Play Again" button only if game is over, player is in a room, and hasn't already requested
    if (gameState?.status === 'gameOver' && roomId && !hasRequestedPlayAgain) {
      return (
        <div>
          <button onClick={handlePlayAgain} className="play-again-button">
            Play Again?
          </button>
        </div>
      );
    }
    // The "Waiting for opponent..." message is part of gameStatusText
    return null;
  };

  const renderGameArea = () => {
    const gameAreaToRender = gameState?.gameArea || initialGameArea;

    if (!gameAreaToRender || !playerNumber) {
      // Not enough info to render game area (e.g., before player assignment)
      return null;
    }

    // If we have gameArea but not the full gameState (e.g., waiting for gameStart after assignment)
    // render the board as a placeholder.
    if (!gameState) {
        return (
            <Board width={gameAreaToRender.width} height={gameAreaToRender.height}>
                {/* Optional: Could show static placeholder paddles here based on gameAreaToRender */}
            </Board>
        );
    }

    // Full gameState is available, render paddles, ball, score.
    const { player1Paddle, player2Paddle, ball, score } = gameState;
    return (
      <>
        <Scoreboard score1={score.player1} score2={score.player2} />
        <Board width={gameAreaToRender.width} height={gameAreaToRender.height}>
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
        {renderGameControls()} {/* Render Play Again button etc. below game area */}
      </header>
    </div>
  );
}

export default App;