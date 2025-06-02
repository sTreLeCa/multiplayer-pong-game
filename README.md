# Multiplayer Pong Game

A classic real-time multiplayer Pong game built with React, Node.js, TypeScript, and Socket.IO. This project demonstrates full-stack development principles, real-time communication, and server-authoritative game logic.

## Features

*   **Real-time Multiplayer:** Two players can connect and play against each other.
*   **Classic Pong Gameplay:** Control paddles to hit a ball, score points when the opponent misses.
*   **Server-Authoritative Logic:** All game mechanics (ball physics, collision detection, scoring) are handled by the server to ensure fairness and prevent cheating.
*   **Dynamic Ball Physics:** The ball bounces off paddles with an angle determined by the impact point on the paddle.
*   **"Play Again" Functionality:** Players can easily choose to start a new game after a match concludes.
*   **TypeScript:** Utilized across both frontend (React) and backend (Node.js) for type safety and improved code organization.
*   **Interactive UI:** A clean interface built with React to display the game area, paddles, ball, and scores.

## Technologies Used

*   **Frontend:**
    *   React (with Hooks)
    *   TypeScript
    *   Socket.IO Client
    *   HTML5 / CSS3
*   **Backend:**
    *   Node.js
    *   Express.js (for basic HTTP server and Socket.IO integration)
    *   TypeScript
    *   Socket.IO Server
*   **Development Tools:**
    *   `npm` for package management
    *   `nodemon` and `ts-node` for efficient backend development workflow

## Project Structure

The project is organized into two main top-level directories:

*   **`client/`**: Contains the frontend React application.
    *   `public/`: Holds static assets like `index.html`.
    *   `src/`: Contains the main React TypeScript source code.
        *   `components/`: Includes reusable React components (e.g., `Board.tsx`, `Paddle.tsx`).
        *   `App.tsx`: The main application component orchestrating the UI.
        *   `App.css`: Styles for the application.
    *   `package.json`: Manages frontend dependencies and scripts.
    *   `tsconfig.json`: TypeScript configuration for the client.

*   **`server/`**: Contains the backend Node.js application.
    *   `src/`: Contains the main server TypeScript source code.
        *   `server.ts`: The core server file handling Express setup, Socket.IO connections, game room management, and all game logic.
    *   `package.json`: Manages backend dependencies and scripts.
    *   `tsconfig.json`: TypeScript configuration for the server.

At the root of the project, you will also find:
*   `.gitignore`: Specifies files and folders for Git to ignore.
*   `README.md`: (This file) Provides an overview, setup, and usage instructions.
*   `specifications.md`: Outlines the initial project requirements.
*   `to_do.md`: Tracks development tasks and progress.

## Setup and Installation

### Prerequisites

*   Node.js (v16.x or later is recommended)
*   `npm` (v8.x or later is recommended, usually comes with Node.js)
    *   (You can also use `yarn` if you prefer, adjusting commands accordingly)

### Installation Steps

1.  **Clone the repository:**
    *(Replace `[Your GitHub Repository URL]` with the actual URL once you create the repository on GitHub.)*
    ```bash
    git clone [Your GitHub Repository URL]
    cd multiplayer-pong-game
    ```

2.  **Install Server Dependencies:**
    Navigate to the `server` directory and install its dependencies.
    ```bash
    cd server
    npm install
    ```

3.  **Install Client Dependencies:**
    Navigate to the `client` directory (from the project root, so `cd ../client` if you are in `server`, or `cd client` if in the root) and install its dependencies.
    ```bash
    cd ../client 
    # (or from project root: cd client)
    npm install
    ```

## Running the Application

To run the game, you need to start both the backend server and the frontend client. This typically requires two separate terminal windows or tabs.

1.  **Start the Backend Server:**
    *   Open a terminal and navigate to the `server` directory:
        ```bash
        cd path/to/your/project/multiplayer-pong-game/server
        ```
    *   Run the development server script:
        ```bash
        npm run dev
        ```
    *   The server will start, typically on `http://localhost:3001`. You should see a log message in the terminal confirming this (e.g., "Server is listening on http://localhost:3001").

2.  **Start the Frontend Client:**
    *   Open a second terminal and navigate to the `client` directory:
        ```bash
        cd path/to/your/project/multiplayer-pong-game/client
        ```
    *   Run the React development server script:
        ```bash
        npm start
        ```
    *   This command will usually open the application automatically in your default web browser, typically at `http://localhost:3000`. If it doesn't open automatically, manually navigate to this URL in your browser.

3.  **Play the Game:**
    *   To simulate two players, open `http://localhost:3000` in two separate browser windows or tabs.
    *   The first player to connect will see a "Waiting for an opponent..." message.
    *   Once the second player connects, the game will begin for both!

## How to Play

*   **Player 1 (Left Paddle):**
    *   Move Up: `W` key
    *   Move Down: `S` key
*   **Player 2 (Right Paddle):**
    *   Move Up: `ArrowUp` key (Up Arrow)
    *   Move Down: `ArrowDown` key (Down Arrow)
*   **Objective:** Be the first player to reach 5 points. A point is scored when your opponent fails to return the ball past their paddle.
*   **Play Again:** After a game ends (one player reaches 5 points), both players will see a "Play Again?" button. If both players click this button, a new game will start with scores reset.

## [Optional: Project Reflection / Known Issues / Future Enhancements]

*   The current room management is basic and pairs the first two available players. A future enhancement could be a lobby system with multiple named rooms or direct challenges.
*   Visuals are functional; further styling or animations could enhance the user experience.
*   Error handling can be made more granular for specific network or server issues.
