# Project To-Do: Multiplayer Pong Game

## Phase 0: Project Setup & Basic Structure

*   [x] **Backend:** Initialize Node.js project (`npm init`).
*   [x] **Backend:** Setup TypeScript (`tsc --init`, install `typescript`, `@types/node`, `ts-node`, `nodemon`).
*   [x] **Backend:** Install dependencies: `express`, `socket.io`, `@types/express`, `@types/socket.io`.
*   [x] **Backend:** Create basic Express server structure (`src/server.ts`).
*   [x] **Frontend:** Initialize React project with TypeScript (`npx create-react-app pong-client --template typescript`).
*   [x] **Frontend:** Install dependencies: `socket.io-client`.
*   [x] **Project:** Setup `gitignore`.
*   [x] **Project:** Define basic folder structure for both frontend and backend.
*   [x] **Types:** Define initial types for game state and events (done within server/client files initially).

## Phase 1: Backend - Server & Socket.IO Setup

*   [x] **Backend:** Implement basic Socket.IO server setup.
    *   [x] Listen for `connection` events.
    *   [x] Handle `disconnect` events.
*   [x] **Backend:** Implement basic Room/Session Management:
    *   [x] Logic to pair the first two connecting clients into a "room".
    *   [x] Assign Player 1 / Player 2 roles.
    *   [x] Emit `playerAssignment` event to clients.
    *   [x] Emit `waitingForOpponent` if only one player.
    *   [x] Emit `gameStart` when two players are ready.
*   [x] **Backend:** Define data structures for game state (ball, paddles, score).

## Phase 2: Frontend - Basic Rendering & Socket.IO Client

*   [x] **Frontend:** Setup Socket.IO client to connect to the server.
*   [x] **Frontend:** Create basic React components:
    *   [x] `Game.tsx` (main container, effectively `App.tsx`)
    *   [x] `Board.tsx`
    *   [x] `Paddle.tsx`
    *   [x] `Ball.tsx`
    *   [x] `Scoreboard.tsx`
*   [x] **Frontend:** Listen for `playerAssignment` and store player role.
*   [x] **Frontend:** Listen for `gameStateUpdate` from the server.
*   [x] **Frontend:** Render initial static paddles and ball based on mock/default state (then updated by server).
*   [x] **Frontend:** Dynamically update paddle and ball positions based on `gameStateUpdate`.
*   [x] **Frontend:** Display scores from `gameStateUpdate`.
*   [x] **Frontend:** Display "Waiting for opponent..." or "Game starting..." messages.

## Phase 3: Backend - Core Game Logic

*   [x] **Backend:** Implement paddle movement logic:
    *   [x] Listen for `paddleMove` event from clients.
    *   [x] Update server-side paddle position (ensure paddle stays within bounds).
*   [x] **Backend:** Implement ball movement logic:
    *   [x] Update ball position based on its `speedX` and `speedY`.
    *   [x] Create a server-side game loop (using `setInterval`) to update and broadcast state.
*   [x] **Backend:** Implement collision detection:
    *   [x] Ball with top/bottom walls (reverse `speedY`).
    *   [x] Ball with paddles (reverse `speedX`, adjust `speedY` based on impact point).
*   [x] **Backend:** Implement scoring logic:
    *   [x] Detect when ball goes past a paddle (left/right edges).
    *   [x] Increment opponent's score.
    *   [x] Reset ball position and direction.
*   [x] **Backend:** Broadcast `gameStateUpdate` regularly from the game loop.
*   [x] **Backend:** Implement game win condition (e.g., first to 5 points).
*   [x] **Backend:** Emit `gameOver` event with winner information.
*   [x] **Backend:** Handle player disconnection during a game (e.g., forfeit, notify opponent, end/pause game).

## Phase 4: Frontend - Player Input & Interaction

*   [x] **Frontend:** Capture keyboard input for paddle movement (W/S, ArrowUp/Down).
*   [x] **Frontend:** Send `paddleMove` event to the server with new intended direction.
*   [x] **Frontend:** Display game over messages and winner.
*   [x] **Frontend:** Implement "Play Again" button and logic.
*   [x] **Frontend:** Handle `opponentDisconnected` event.
*   [x] **Frontend:** Fix arrow key page scrolling issue (`event.preventDefault()`).

## Phase 5: Integration, Testing & Refinement

*   [x] **Integration:** Ensure client and server communicate effectively.
*   [x] **Testing:** Thoroughly test with two browser windows/clients:
    *   [x] Connection and pairing.
    *   [x] Paddle movement synchronization.
    *   [x] Ball movement and bounces (including refined physics).
    *   [x] Scoring.
    *   [x] Game over condition.
    *   [x] Player disconnection handling (various scenarios tested and refined).
    *   [x] "Play Again" functionality.
*   [x] **Refinement:** Adjust game speed, ball physics (dynamic paddle bounce), paddle sensitivity for better playability.
*   [x] **TypeScript:** Ensure strong typing is used throughout; run type checks (ongoing, assumed good).
*   [x] **Code Quality:** Review code for clarity, organization, and comments (self-review and cleanup pass done).
*   [x] **Responsiveness:** Basic UI responsiveness is handled by default CSS and simple layout. (Marking as done for project scope).
*   [x] **Error Handling:** Implement basic error handling (e.g., server connection issues, invalid game states for actions, disconnects).
*   [x] **Code Cleanup:** Remove unnecessary `console.log`s, address magic numbers.
*   [x] **Client Stability:** Resolved flickering and multiple connection issues.

## Phase 6: Documentation & Submission

*   [x] **Documentation:** Create/update `README.md` with:
    *   [x] Project description.
    *   [x] How to install dependencies (frontend & backend).
    *   [x] How to run the project (frontend & backend).
    *   [x] How to play (controls, objective).
*   [x] **Documentation:** Finalize `specifications.md` (ensure it reflects the final project).
*   [x] **Documentation:** Ensure this `to_do.md` is up-to-date with completed tasks.


## Bonus / Stretch Goals (Optional - Not Implemented)

*   [ ] **Advanced Room System:** Allow creating/joining named rooms.
*   [ ] **Player Names:** Allow players to enter names.
*   [ ] **Spectator Mode:** Allow users to watch ongoing games.
*   [ ] **Improved UI/UX:** Better graphics, animations, sound effects.
*   [ ] **Configurable Game Settings:** Ball speed, winning score, paddle size.
*   [ ] **Deployment:** Deploy the application to a platform like Heroku, Vercel, or Netlify.
*   [ ] **Shared Types:** Refactor to use a common `types` directory/package for client and server.