// client/src/App.tsx
import React, { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import './App.css';
import Board from './components/Board';
import Paddle from './components/Paddle';
import Ball from './components/Ball';
import Scoreboard from './components/Scoreboard';

const SERVER_URL = "http://localhost:3001";

// --- Game State Types (mirrored from server for now, consider a shared types package later) ---
interface GameArea {
  width: number;
  height: number;
}

interface PlayerAssignmentData {
  playerNumber: 1 | 2;
  roomId: string;
  gameArea: GameArea;
}

// These will be expanded when we get full gameStateUpdate
interface ClientPaddleState {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ClientBallState {
  x: number;
  y: number;
  radius: number;
}

interface ClientGameState { // This will evolve
  player1Paddle: ClientPaddleState;
  player2Paddle: ClientPaddleState;
  ball: ClientBallState;
  score1: number;
  score2: number;
  gameArea: GameArea;
}


function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [message, setMessage] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<string>('Connecting...');

  // Placeholder game state for rendering - will be updated by server
  const [gameState, setGameState] = useState<ClientGameState | null>(null);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server! Socket ID:', newSocket.id);
      setIsConnected(true);
      setGameStatus('Connected. Waiting for opponent...');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server.');
      setIsConnected(false);
      setPlayerNumber(null);
      setRoomId(null);
      setGameState(null);
      setGameStatus('Disconnected. Please refresh.');
      setMessage('');
    });

    newSocket.on('message', (data: string) => {
      console.log('Message from server:', data);
      setMessage(data); // General messages
    });

    newSocket.on('waitingForOpponent', () => {
        setGameStatus('Waiting for an opponent...');
    });

    newSocket.on('playerAssignment', (data: PlayerAssignmentData) => {
      console.log('Player assignment received:', data);
      setPlayerNumber(data.playerNumber);
      setRoomId(data.roomId);
      setGameStatus(`You are Player ${data.playerNumber}. Game starting soon...`);
      // Initialize a basic game state view based on gameArea
      // Server will soon send the actual positions
      setGameState({
        gameArea: data.gameArea,
        player1Paddle: { x: 50, y: data.gameArea.height / 2 - 50, width: 10, height: 100 },
        player2Paddle: { x: data.gameArea.width - 50 - 10, y: data.gameArea.height / 2 - 50, width: 10, height: 100 },
        ball: { x: data.gameArea.width / 2, y: data.gameArea.height / 2, radius: 10 },
        score1: 0,
        score2: 0,
      });
    });

    newSocket.on('opponentDisconnected', (msg: string) => {
        console.log('Opponent disconnected:', msg);
        setGameStatus(msg + ' Game Over.');
        setMessage(msg);
        // Optionally reset parts of the state or prompt for new game
        // setPlayerNumber(null); // Keep player number for context if desired
        // setRoomId(null);
        // setGameState(null); // Or keep last known state
    });

    // Placeholder for gameStateUpdate
    // newSocket.on('gameStateUpdate', (newGameState: ClientGameState) => {
    //   setGameState(newGameState);
    // });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Multiplayer Pong</h1>
        <p>Status: {isConnected ? 'Connected' : 'Disconnected'} {playerNumber && `(Player ${playerNumber} in Room ${roomId})`}</p>
        <p>Game Status: {gameStatus}</p>
        {message && <p>Server Message: {message}</p>}

        {gameState && (
          <>
            <Scoreboard score1={gameState.score1} score2={gameState.score2} />
            <Board width={gameState.gameArea.width} height={gameState.gameArea.height}>
              <Paddle {...gameState.player1Paddle} />
              <Paddle {...gameState.player2Paddle} color="lightblue" /> {/* Differentiate P2 visually for now */}
              <Ball {...gameState.ball} />
            </Board>
          </>
        )}
      </header>
    </div>
  );
}

export default App;