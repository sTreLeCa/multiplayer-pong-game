# Project: Multiplayer Pong Game

## 1. Overview

This project involves building a real-time, interactive multiplayer Pong game. Two players will connect to a central server, control paddles on their respective screens, and compete to score points. The game state (paddle positions, ball position, score) must be synchronized across both players' browsers in real-time.

## 2. Core Gameplay

*   **Players:** The game supports two players.
*   **Objective:** Players control paddles to hit a ball back and forth. A player scores a point when their opponent fails to return the ball.
*   **Controls:** Each player controls one paddle. Player 1 typically controls the left paddle, and Player 2 controls the right paddle. Paddle movement is restricted to the vertical axis.
*   **Ball Mechanics:**
    *   The ball moves across the game area.
    *   The ball bounces off the top and bottom walls.
    *   The ball bounces off players' paddles.
    *   If the ball goes past a player's paddle and off the side of the screen (left or right edge), the opposing player scores a point. After a score, the ball should reset (e.g., to the center, moving towards the player who was scored upon).
*   **Scoring:**
    *   The score for each player is displayed.
    *   The first player to reach a predefined score (e.g., 5 or 10 points) wins the game.
*   **Game State Synchronization:** All game elements (paddles, ball, score) must be updated and displayed consistently for both players in real-time.

## 3. Technical Specifications

### 3.1. Backend (Node.js with TypeScript)

*   **Server:** Node.js server using Express.js (or similar minimal framework).
*   **Language:** TypeScript.
*   **Real-Time Communication:** Socket.IO for WebSocket communication.
*   **Authoritative Server:** The server is the single source of truth for all game logic and state.
    *   **Game Logic:**
        *   Ball movement calculations.
        *   Collision detection (ball-paddle, ball-wall).
        *   Scoring logic.
        *   Game state updates (paddle positions, ball position, scores).
    *   **Session/Room Management:**
        *   Basic functionality to pair two connecting players into a game room.
        *   A simple "waiting for opponent" state if only one player is connected.
        *   Handle player disconnections (e.g., end game, notify other player).
*   **Game Rules Enforcement:** All game rules (e.g., ball bounces, scoring) are enforced by the server.

### 3.2. Frontend (React with TypeScript)

*   **Framework/Library:** React.
*   **Language:** TypeScript.
*   **Real-Time Communication:** Socket.IO client library.
*   **User Interface (UI):**
    *   **Game Area:** A defined rectangular area where the game is played.
    *   **Paddles:** Two paddles, one for each player, visually distinct or positioned (e.g., left vs. right).
    *   **Ball:** A visual representation of the ball.
    *   **Score Display:** Clearly visible scores for both players.
    *   **Game Status Messages:** (Optional, but recommended) Messages like "Waiting for opponent...", "Player X wins!", "Connecting...".
*   **User Input:**
    *   Capture keyboard events (e.g., 'W'/'S' for Player 1, Up/Down Arrow for Player 2, or configurable) for paddle movement.
    *   Send paddle movement intentions to the server.
*   **Rendering:**
    *   Dynamically render the game state (paddles, ball, scores) based on data received from the server.
    *   The rendering should be smooth and responsive.
*   **Responsiveness:** The game interface should be reasonably responsive to different screen sizes (basic viewport considerations).

### 3.3. Communication (Socket.IO Events)

The following custom events (minimum) should be defined for client-server communication:

*   **Server -> Client:**
    *   `gameStateUpdate`: Sends the current positions of paddles, ball, and current scores.
    *   `playerAssignment`: Informs a client which player they are (e.g., Player 1 or Player 2) and potentially their paddle side.
    *   `gameStart`: Signals that two players are connected and the game is starting.
    *   `scoreUpdate`: (Can be part of `gameStateUpdate`) Sent when a point is scored.
    *   `gameOver`: Signals that the game has ended and declares a winner.
    *   `opponentDisconnected`: Informs the player that their opponent has disconnected.
    *   `waitingForOpponent`: Informs a connected player they are waiting for another.
*   **Client -> Server:**
    *   `paddleMove`: Sent when a player moves their paddle, including the direction or new position.
    *   `ready`: (Optional) Client signals it's loaded and ready to join/start a game.

### 3.4. TypeScript & Full-Stack Integration

*   **Type Safety:** Utilize TypeScript across both frontend and backend for improved code quality, maintainability, and type safety.
*   **Shared Types:** (Optional, but good practice) Define shared data structures (e.g., for game state, event payloads) in a common types directory/package accessible by both client and server if using a monorepo, or duplicated with clear definitions if separate.
*   **Cohesive Application:** The frontend and backend must integrate seamlessly to provide a playable multiplayer game.
*   **Data Flow:** Demonstrate a clear understanding and implementation of data flow: client input -> server processing -> server broadcast -> client UI update.

## 4. Game Flow

1.  **Connection:** A player opens the game in their browser. The client attempts to connect to the server via Socket.IO.
2.  **Pairing:**
    *   If no other player is waiting, the player is put into a "waiting" state.
    *   If another player is waiting, or a second player connects, they are paired into a game room. Both clients are notified.
3.  **Game Start:**
    *   The server initializes the game state (ball position/velocity, paddle positions, scores at 0-0).
    *   The server sends the initial `gameStateUpdate` and `gameStart` events.
4.  **Gameplay Loop:**
    *   Clients capture paddle movement input and send `paddleMove` events to the server.
    *   The server updates its internal game state based on player inputs and game physics (ball movement, collisions).
    *   The server regularly broadcasts `gameStateUpdate` events to all clients in the room.
    *   Clients receive `gameStateUpdate` and re-render the UI.
5.  **Scoring:**
    *   When a player misses the ball, the server updates the score and resets the ball.
    *   The server sends a `scoreUpdate` (or includes it in `gameStateUpdate`).
6.  **Game Over:**
    *   When a player reaches the winning score, the server declares a winner and sends a `gameOver` event.
    *   Gameplay may pause or offer a "Play Again" option.
7.  **Disconnection:**
    *   If a player disconnects, the server notifies the other player via `opponentDisconnected`. The game might end.

## 5. Deliverables

*   Source code for the Node.js backend (TypeScript).
*   Source code for the React frontend (TypeScript).
*   This `specifications.md` file.
*   A `to_do.md` file outlining tasks.
*   (Implied) A `README.md` with instructions on how to set up and run the project.

## 6. Non-Functional Requirements

*   **Performance:** Real-time updates should feel smooth with minimal noticeable lag under typical conditions.
*   **Code Quality:** Code should be well-organized, readable, and maintainable, leveraging TypeScript's features effectively.
*   **Usability:** The game should be simple and intuitive to play.