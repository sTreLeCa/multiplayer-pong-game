# Project To-Do: Multiplayer Pong Game

## Phase 0: Project Setup & Basic Structure

*   [ ] **Backend:** Initialize Node.js project (`npm init`).
*   [ ] **Backend:** Setup TypeScript (`tsc --init`, install `typescript`, `@types/node`, `ts-node`, `nodemon`).
*   [ ] **Backend:** Install dependencies: `express`, `socket.io`, `@types/express`, `@types/socket.io`.
*   [ ] **Backend:** Create basic Express server structure (`src/server.ts`).
*   [ ] **Frontend:** Initialize React project with TypeScript (`npx create-react-app pong-client --template typescript`).
*   [ ] **Frontend:** Install dependencies: `socket.io-client`.
*   [ ] **Project:** Setup `gitignore`.
*   [ ] **Project:** Define basic folder structure for both frontend and backend (e.g., `server/src`, `client/src`).
*   [ ] **Types:** (Optional) Create a shared `types` directory/package or define initial types for game state and events.

## Phase 1: Backend - Server & Socket.IO Setup

*   [ ] **Backend:** Implement basic Socket.IO server setup.
    *   [ ] Listen for `connection` events.
    *   [ ] Handle `disconnect` events.
*   [ ] **Backend:** Implement basic Room/Session Management:
    *   [ ] Logic to pair the first two connecting clients into a "room".
    *   [ ] Assign Player 1 / Player 2 roles.
    *   [ ] Emit `playerAssignment` event to clients.
    *   [ ] Emit `waitingForOpponent` if only one player.
    *   [ ] Emit `gameStart` when two players are ready.
*   [ ] **Backend:** Define data structures for game state (ball, paddles, score).
    *   `interface Paddle { x: number; y: number; width: number; height: number; score: number; }`
    *   `interface Ball { x: number; y: number; radius: number; speedX: number; speedY: number; }`
    *   `interface GameState { player1: Paddle; player2: Paddle; ball: Ball; gameAreaWidth: number; gameAreaHeight: number; }`

## Phase 2: Frontend - Basic Rendering & Socket.IO Client

*   [ ] **Frontend:** Setup Socket.IO client to connect to the server.
*   [ ] **Frontend:** Create basic React components:
    *   [ ] `Game.tsx` (main container)
    *   [ ] `Board.tsx` (game area)
    *   [ ] `Paddle.tsx`
    *   [ ] `Ball.tsx`
    *   [ ] `Scoreboard.tsx`
*   [ ] **Frontend:** Listen for `playerAssignment` and store player role.
*   [ ] **Frontend:** Listen for `gameStateUpdate` from the server.
*   [ ] **Frontend:** Render initial static paddles and ball based on mock/default state.
*   [ ] **Frontend:** Dynamically update paddle and ball positions based on `gameStateUpdate`.
*   [ ] **Frontend:** Display scores from `gameStateUpdate`.
*   [ ] **Frontend:** Display "Waiting for opponent..." or "Game starting..." messages.

## Phase 3: Backend - Core Game Logic

*   [ ] **Backend:** Implement paddle movement logic:
    *   [ ] Listen for `paddleMove` event from clients.
    *   [ ] Update server-side paddle position (ensure paddle stays within bounds).
*   [ ] **Backend:** Implement ball movement logic:
    *   [ ] Update ball position based on its `speedX` and `speedY`.
    *   [ ] Create a server-side game loop (e.g., using `setInterval`) to update and broadcast state.
*   [ ] **Backend:** Implement collision detection:
    *   [ ] Ball with top/bottom walls (reverse `speedY`).
    *   [ ] Ball with paddles (reverse `speedX`, potentially adjust `speedY` based on impact point).
*   [ ] **Backend:** Implement scoring logic:
    *   [ ] Detect when ball goes past a paddle (left/right edges).
    *   [ ] Increment opponent's score.
    *   [ ] Reset ball position and direction.
*   [ ] **Backend:** Broadcast `gameStateUpdate` regularly from the game loop.
*   [ ] **Backend:** Implement game win condition (e.g., first to 5 points).
*   [ ] **Backend:** Emit `gameOver` event with winner information.
*   [ ] **Backend:** Handle player disconnection during a game (e.g., forfeit, notify opponent).

## Phase 4: Frontend - Player Input & Interaction

*   [ ] **Frontend:** Capture keyboard input for paddle movement (e.g., 'W'/'S' or Up/Down arrows).
*   [ ] **Frontend:** Send `paddleMove` event to the server with new intended position or direction.
    *   *Consider sending desired direction rather than absolute position to let server be authoritative.*
*   [ ] **Frontend:** Display game over messages and winner.
*   [ ] **Frontend:** (Optional) Add a "Play Again" button or similar functionality after `gameOver`.
*   [ ] **Frontend:** Handle `opponentDisconnected` event.

## Phase 5: Integration, Testing & Refinement

*   [ ] **Integration:** Ensure client and server communicate effectively.
*   [ ] **Testing:** Thoroughly test with two browser windows/clients:
    *   [ ] Connection and pairing.
    *   [ ] Paddle movement synchronization.
    *   [ ] Ball movement and bounces.
    *   [ ] Scoring.
    *   [ ] Game over condition.
    *   [ ] Player disconnection handling.
*   [ ] **Refinement:** Adjust game speed, ball physics, paddle sensitivity for better playability.
*   [ ] **TypeScript:** Ensure strong typing is used throughout; run type checks.
*   [ ] **Code Quality:** Review code for clarity, organization, and comments.
*   [ ] **Responsiveness:** Test basic UI responsiveness on different screen sizes.
*   [ ] **Error Handling:** Implement basic error handling (e.g., server connection issues).

## Phase 6: Documentation & Submission

*   [ ] **Documentation:** Create/update `README.md` with:
    *   [ ] Project description.
    *   [ ] How to install dependencies (frontend & backend).
    *   [ ] How to run the project (frontend & backend).
*   [ ] **Documentation:** Finalize `specifications.md`.
*   [ ] **Documentation:** Ensure this `to_do.md` is up-to-date with completed tasks.
*   [ ] **Submission:** Prepare project files for submission.

## Bonus / Stretch Goals (Optional)

*   [ ] **Advanced Room System:** Allow creating/joining named rooms.
*   [ ] **Player Names:** Allow players to enter names.
*   [ ] **Spectator Mode:** Allow users to watch ongoing games.
*   [ ] **Improved UI/UX:** Better graphics, animations, sound effects.
*   [ ] **Configurable Game Settings:** Ball speed, winning score, paddle size.
*   [ ] **Deployment:** Deploy the application to a platform like Heroku, Vercel, or Netlify.