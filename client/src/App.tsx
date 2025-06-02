import React, { useEffect, useState, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import './App.css';
import Board from './components/Board';
import Paddle from './components/Paddle';
import Ball from './components/Ball';
import Scoreboard from './components/Scoreboard';

const SERVER_URL = "http://localhost:3001";
const WINNING_SCORE = 5;

// --- Client-side Type Definitions ---
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
interface PlayerAssignmentData { playerNumber: 1 | 2; roomId: string; gameArea: { width: number; height: number; }; }
interface GameOverData { winner: 1 | 2; score: { player1: number; player2: number; }; }

function App() {
  // --- State Variables ---
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [gameStatusText, setGameStatusText] = useState<string>('Connecting...');
  const [serverMessage, setServerMessage] = useState<string>('');
  const [initialGameArea, setInitialGameArea] = useState<{width: number, height: number} | null>(null);
  const [hasRequestedPlayAgain, setHasRequestedPlayAgain] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
    // --- Effect for Socket Connection & Core Event Listeners (Runs Once) ---
  useEffect(() => {
    const newSocket = io(SERVER_URL);
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => { setIsConnected(true); console.log('Socket connected:', newSocket.id); });
    newSocket.on('disconnect', () => {
      setIsConnected(false); setPlayerNumber(null); setRoomId(null);
      setGameState(null); setServerMessage(''); setInitialGameArea(null);
      setHasRequestedPlayAgain(false); console.log('Socket disconnected');
    });

    newSocket.on('message', (data: string) => {
      setServerMessage(data);
      if (data.includes("Play again option") || data.includes("Waiting for a new opponent")) {
        setHasRequestedPlayAgain(false);
      }
    });

    newSocket.on('waitingForOpponent', () => {
        setGameState(null); // Clear full game state, ready for new pairing
        // setHasRequestedPlayAgain(false); // If they were in a play again flow, it's void
    });

    newSocket.on('playerAssignment', (data: PlayerAssignmentData) => {
      setPlayerNumber(data.playerNumber); setRoomId(data.roomId);
      setInitialGameArea(data.gameArea); setGameState(null);
      setHasRequestedPlayAgain(false);
    });

    newSocket.on('gameStart', (initialFullGameState: ClientGameState) => {
      setGameState(initialFullGameState);
      setInitialGameArea(initialFullGameState.gameArea);
      setServerMessage(''); setHasRequestedPlayAgain(false);
    });

    newSocket.on('gameStateUpdate', (newGameState: ClientGameState) => {
      setGameState(newGameState);
      if (!initialGameArea && newGameState.gameArea) setInitialGameArea(newGameState.gameArea);
    });

    newSocket.on('gameOver', (data: GameOverData) => { /* UI reacts to gameState.status */ });
    
    newSocket.on('opponentDisconnected', (msg: string) => {
        setServerMessage(msg);
        setHasRequestedPlayAgain(false); // Can't play again with disconnected opponent
    });

    return () => { newSocket.disconnect(); socketRef.current = null; setSocket(null); console.log('Socket cleanup'); };
  }, []); // Empty: runs once on mount, cleans on unmount
    // --- Effect for Managing Game Status Text ---
  useEffect(() => {
    if (!isConnected) { setGameStatusText('Disconnected. Please refresh.'); return; }
    if (!playerNumber || !initialGameArea) { setGameStatusText('Connected. Waiting for player assignment...'); return; }
    if (!gameState) { setGameStatusText(`P${playerNumber}. Waiting for game to start...`); return; }

    switch (gameState.status) {
      case 'waiting': setGameStatusText(`P${playerNumber}. Waiting for opponent or game to start...`); break;
      case 'playing': setGameStatusText(`Game on! You are Player ${playerNumber}.`); break;
      case 'paused': setGameStatusText('Game Paused. Opponent disconnected.'); break;
      case 'gameOver':
        let winnerMsg = "";
        if (gameState.score.player1 >= WINNING_SCORE) winnerMsg = `Player 1 wins!`;
        else if (gameState.score.player2 >= WINNING_SCORE) winnerMsg = `Player 2 wins!`;
        else winnerMsg = "Game Over."; // e.g. if ended by disconnect

        let status = `${winnerMsg} Score: P1 ${gameState.score.player1} - P2 ${gameState.score.player2}`;
        // Only show "waiting for opponent to play again" if this client requested and it's a valid game over context
        const gameReallyEndedByScore = gameState.score.player1 >= WINNING_SCORE || gameState.score.player2 >= WINNING_SCORE;
        if (hasRequestedPlayAgain && roomId && gameReallyEndedByScore) {
            status += " (Waiting for opponent...)";
        }
        setGameStatusText(status);
        break;
      default: setGameStatusText('Unknown game state.');
    }
  }, [isConnected, playerNumber, gameState, initialGameArea, hasRequestedPlayAgain, roomId]);

  const handlePlayAgain = () => {
    if (socketRef.current && gameState?.status === 'gameOver' && !hasRequestedPlayAgain && roomId) {
      // Check if game ended by score before allowing play again request
      const gameEndedByScore = gameState.score.player1 >= WINNING_SCORE || gameState.score.player2 >= WINNING_SCORE;
      if (gameEndedByScore) {
        socketRef.current.emit('requestPlayAgain');
        setHasRequestedPlayAgain(true);
        setServerMessage("Requesting to play again...");
      } else {
        setServerMessage("Cannot play again, game did not end normally.");
      }
    }
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!socketRef.current || !playerNumber || !gameState || gameState.status !== 'playing') return;
    let direction: 'up' | 'down' | null = null; const key = event.key.toLowerCase();
    if (playerNumber === 1) { if (key === 'w') direction = 'up'; else if (key === 's') direction = 'down'; }
    else if (playerNumber === 2) { if (key === 'arrowup') direction = 'up'; else if (key === 'arrowdown') direction = 'down'; }
    if (['w', 's', 'arrowup', 'arrowdown'].includes(key)) event.preventDefault();
    if (direction) socketRef.current.emit('paddleMove', { direction });
  }, [playerNumber, gameState]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
    // --- Render Logic ---
  const renderGameControls = () => {
    if (gameState?.status === 'gameOver' && roomId && !hasRequestedPlayAgain) {
      const gameEndedByScore = gameState.score.player1 >= WINNING_SCORE || gameState.score.player2 >= WINNING_SCORE;
      if (gameEndedByScore) { // Only show button if game ended by score
        return (
          <div>
            <button onClick={handlePlayAgain} className="play-again-button">Play Again?</button>
          </div>
        );
      }
    }
    return null;
  };

  const renderGameArea = () => {
    const gameAreaToRender = gameState?.gameArea || initialGameArea;
    if (!gameAreaToRender || !playerNumber) return null;
    if (!gameState) return <Board width={gameAreaToRender.width} height={gameAreaToRender.height} />;

    const { player1Paddle, player2Paddle, ball, score } = gameState;
    return (
      <>
        <Scoreboard score1={score.player1} score2={score.player2} />
        <Board width={gameAreaToRender.width} height={gameAreaToRender.height}>
          <Paddle {...player1Paddle} /> <Paddle {...player2Paddle} /> <Ball {...ball} />
        </Board>
        {gameState.status === 'playing' && <p className="controls-text">Controls: P1 (W/S), P2 (Arrows)</p>}
      </>
    );
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Multiplayer Pong</h1>
        <p className="connection-status">Connection: {isConnected ? 'Connected' : 'Disconnected'}
          {playerNumber && roomId && ` (P${playerNumber} Room: ${roomId.substring(0,5)}...)`}</p>
        <p className="game-status">{gameStatusText}</p>
        {serverMessage && <p className="server-message">Server: {serverMessage}</p>}
        
        {renderGameArea()}
        {renderGameControls()}
      </header>
    </div>
  );
}

export default App;