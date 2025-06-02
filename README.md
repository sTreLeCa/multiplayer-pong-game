# Multiplayer Pong Game

A classic real-time multiplayer Pong game built with React, Node.js, TypeScript, and Socket.IO. This project demonstrates full-stack development principles, real-time communication, and server-authoritative game logic.

## Features

*   **Real-time Multiplayer:** Two players can connect and play against each other.
*   **Classic Pong Gameplay:** Control paddles to hit a ball, score points when opponent misses.
*   **Server-Authoritative Logic:** All game mechanics (ball physics, collision, scoring) are handled by the server to ensure fairness and prevent cheating.
*   **Dynamic Ball Physics:** Ball bounces off paddles with an angle determined by the impact point.
*   **"Play Again" Functionality:** Players can easily start a new game after a match concludes.
*   **TypeScript:** Type safety and improved code organization across both frontend and backend.
*   **Responsive UI:** Basic responsive design for the game interface.

## Technologies Used

*   **Frontend:**
    *   React
    *   TypeScript
    *   Socket.IO Client
    *   HTML5 / CSS3
*   **Backend:**
    *   Node.js
    *   Express.js (or a minimal HTTP server setup)
    *   TypeScript
    *   Socket.IO Server
*   **Development Tools:**
    *   `npm` (or `yarn`) for package management
    *   `nodemon` and `ts-node` for backend development workflow

## Project Structure

multiplayer-pong-game/
├── client/ # React frontend application
│ ├── public/
│ ├── src/
│ │ ├── components/ # Reusable React components (Board, Paddle, Ball, etc.)
│ │ ├── App.tsx # Main application component
│ │ ├── App.css # Styles for App component
│ │ └── ... # Other client files
│ ├── package.json
│ └── tsconfig.json
├── server/ # Node.js backend application
│ ├── src/
│ │ └── server.ts # Main server logic
│ ├── package.json
│ └── tsconfig.json
├── .gitignore
├── README.md # This file
├── specifications.md # Project requirements
└── to_do.md # Task tracking


## Setup and Installation

### Prerequisites

*   Node.js (v16.x or later recommended)
*   npm (v8.x or later recommended) or yarn

### Installation Steps

1.  **Clone the repository:**
    ```bash
    git clone [Your GitHub Repository URL when you create it]
    cd multiplayer-pong-game
    ```

2.  **Install Server Dependencies:**
    ```bash
    cd server
    npm install
    ```

3.  **Install Client Dependencies:**
    ```bash
    cd ../client 
    # (or from root: cd client)
    npm install
    ```

## Running the Application

You will need two separate terminal windows to run the backend server and the frontend client simultaneously.

1.  **Start the Backend Server:**
    *   Navigate to the `server` directory:
        ```bash
        cd path/to/your/project/multiplayer-pong-game/server
        ```
    *   Run the development server:
        ```bash
        npm run dev
        ```
    *   The server will typically start on `http://localhost:3001`. You should see a log message confirming this.

2.  **Start the Frontend Client:**
    *   Navigate to the `client` directory:
        ```bash
        cd path/to/your/project/multiplayer-pong-game/client
        ```
    *   Run the React development server:
        ```bash
        npm start
        ```
    *   This will usually open the application automatically in your default web browser at `http://localhost:3000`. If not, open it manually.

3.  **Play the Game:**
    *   Open `http://localhost:3000` in two separate browser windows or tabs to simulate two players.
    *   The first player will wait for an opponent.
    *   Once the second player connects, the game will begin!

## How to Play

*   **Player 1 (Left Paddle):**
    *   Move Up: `W` key
    *   Move Down: `S` key
*   **Player 2 (Right Paddle):**
    *   Move Up: `ArrowUp` key
    *   Move Down: `ArrowDown` key
*   **Objective:** Be the first player to reach 5 points. A point is scored when your opponent fails to return the ball.
*   **Play Again:** After a game ends, both players will see a "Play Again?" button. If both players click it, a new game will start.

## [Optional: Project Reflection / Known Issues / Future Enhancements]

*   [Example: The current room management is basic and pairs the first two available players. A future enhancement could be a lobby system with named rooms.]
*   [Example: No advanced sound effects or visual polish beyond core gameplay.]

---