import React, { useEffect, useState, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import './App.css'; // Assuming you have some basic styles here
import Board from './components/Board';
import Paddle from './components/Paddle';
import Ball from './components/Ball';
import Scoreboard from './components/Scoreboard';

const SERVER_URL = "http://localhost:3001";
const WINNING_SCORE = 5;

interface PaddleState { x: number; y: number; width: number; height: number; }
interface BallState { x: number; y: number; radius: number; }
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
  const [socket, setSocket] = useState<Socket | null>(null); // Keep for potential conditional rendering based on socket existence
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [gameStatusText, setGameStatusText] = useState<string>('Connecting...');
  const [serverMessage, setServerMessage] = useState<string>('');
  const [initialGameArea, setInitialGameArea] = useState<{width: number, height: number} | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // --- Effect for Socket Connection & Core Event Listeners ---
  useEffect(() => {
    const newSocket = io(SERVER_URL);
    socketRef.current = newSocket;
    setSocket(newSocket); // Set the socket in state as well

    newSocket.on('connect', () => {
      console.log('Connected to server! Socket ID:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server.');
      setIsConnected(false);
      setPlayerNumber(null);
      setRoomId(null);
      setGameState(null);
      setServerMessage('');
      setInitialGameArea(null);
    });

    newSocket.on('message', (data: string) => {
      console.log('Message from server:', data);
      setServerMessage(data);
    });

    newSocket.on('waitingForOpponent', () => {
      setGameState(null); // Clear full game state
      // initialGameArea might still be set if player was assigned then opponent left
    });

    newSocket.on('playerAssignment', (data: PlayerAssignmentData) => {
      console.log('Player assignment received:', data);
      setPlayerNumber(data.playerNumber);
      setRoomId(data.roomId);
      setInitialGameArea(data.gameArea); // Store gameArea for initial Board rendering
                                        // Full gameState comes with 'gameStart'
      setGameState(null); // Ensure any old full gameState is cleared until gameStart
    });

    newSocket.on('gameStart', (initialFullGameState: ClientGameState) => {
      console.log('GameStart event received:', initialFullGameState);
      setGameState(initialFullGameState);
      setInitialGameArea(initialFullGameState.gameArea); // Ensure this is also up-to-date
      setServerMessage('');
    });

    newSocket.on('gameStateUpdate', (newGameState: ClientGameState) => {
      setGameState(newGameState);
      // If initialGameArea wasn't set for some reason, try to get it from the first gameStateUpdate
      if (!initialGameArea && newGameState.gameArea) {
        setInitialGameArea(newGameState.gameArea);
      }
    });

    newSocket.on('gameOver', (data: GameOverData) => {
      console.log('GameOver event received:', data);
      // gameState.status will be updated by a gameStateUpdate from the server.
      // The gameStatusText effect will handle the display message.
    });

    newSocket.on('opponentDisconnected', (msg: string) => {
      console.log('Opponent disconnected:', msg);
      setServerMessage(msg);
      // Server should send a gameStateUpdate with status 'paused' or 'gameOver'.
    });

    return () => {
      console.log('Cleaning up socket connection:', newSocket.id);
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null); // Clear socket from state on unmount
    };
  }, []); // <<< CRITICAL: Empty dependency array for STABILITY

  // --- Effect for Managing Game Status Text ---
  useEffect(() => {
    if (!isConnected) {
      setGameStatusText('Disconnected. Please refresh.');
      return;
    }
    if (!playerNumber || !initialGameArea) { // We need at least playerNumber and initialGameArea to know we're in a "game context"
      setGameStatusText('Connected. Waiting for player assignment...');
      return;
    }
    // If we have initialGameArea & playerNumber, but no full gameState, we are assigned but waiting for gameStart
    if (!gameState) {
        setGameStatusText(`You are Player ${playerNumber}. Waiting for game to start...`);
        return;
    }
    // From here, we assume gameState is available
    switch (gameState.status) {
      case 'waiting': // This status might be brief on server if game starts immediately
        setGameStatusText(`You are Player ${playerNumber}. Waiting for an opponent or game to start...`);
        break;
      case 'playing':
        setGameStatusText(`Game in progress. You are Player ${playerNumber}.`);
        break;
      case 'paused':
        setGameStatusText('Game Paused. Opponent disconnected.');
        break;
      case 'gameOver':
        let winnerDetails = "";
        if (gameState.score.player1 >= WINNING_SCORE) winnerDetails = `Player 1 wins!`;
        else if (gameState.score.player2 >= WINNING_SCORE) winnerDetails = `Player 2 wins!`;
        else winnerDetails = "Game Over."; // Handles disconnects or other non-score based game overs
        setGameStatusText(`${winnerDetails} Final Score: P1 ${gameState.score.player1} - P2 ${gameState.score.player2}`);
        break;
      default: setGameStatusText('Unknown game state.');
    }
  }, [isConnected, playerNumber, gameState, initialGameArea]);

  // --- Paddle Movement Input Handling ---
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!socketRef.current || !playerNumber || !gameState || gameState.status !== 'playing') {
      return;
    }
    let direction: 'up' | 'down' | null = null;
    const key = event.key.toLowerCase();
    if (playerNumber === 1) {
      if (key === 'w') direction = 'up';
      else if (key === 's') direction = 'down';
    } else if (playerNumber === 2) {
      if (key === 'arrowup') direction = 'up';
      else if (key === 'arrowdown') direction = 'down';
    }
    if (key === 'w' || key === 's' || key === 'arrowup' || key === 'arrowdown') {
      event.preventDefault();
    }
    if (direction) {
      socketRef.current.emit('paddleMove', { direction });
    }
  }, [playerNumber, gameState]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // --- Render Logic ---
  const renderGameArea = () => {
    const gameAreaToRender = gameState?.gameArea || initialGameArea;

    if (!gameAreaToRender || !playerNumber) {
      // If no game area info or not assigned a player number, don't render game specifics
      return null;
    }

    // If we have gameArea but not the full gameState, render the board as a placeholder
    if (!gameState) {
        return (
            <Board width={gameAreaToRender.width} height={gameAreaToRender.height}>
                {/* Optional: Could show static placeholder paddles based on gameAreaToRender if desired */}
            </Board>
        );
    }

    // Full gameState is available, render everything
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
      </header>
    </div>
  );
}

export default App;