import React, { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client'; // This Socket should now come from socket.io-client v4's bundled types
import './App.css';

const SERVER_URL = "http://localhost:3001";

function App() {
  const [socket, setSocket] = useState<Socket | null>(null); // Using the imported Socket type
  const [message, setMessage] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server! Socket ID:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server.');
      setIsConnected(false);
    });

    newSocket.on('message', (data: string) => {
      console.log('Message from server:', data);
      setMessage(data);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Multiplayer Pong</h1>
        <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
        {message && <p>Server message: {message}</p>}
      </header>
    </div>
  );
}

export default App;