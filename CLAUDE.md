# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A classic Tetris implementation in vanilla JavaScript, HTML5 Canvas, and CSS — no dependencies, no build step, no package manager. The entire game logic lives in a single file, `game.js`.

## Running the game

There is no build/lint/test tooling. Open `index.html` directly in a browser, or serve it locally:

```bash
python3 -m http.server 8000   # or: npx serve .
```

Then visit `http://localhost:8000`. There are no automated tests; verify changes manually by playing the game in a browser (movement, rotation, line clears, scoring, pause, game over/restart).

## Architecture

Three files, ~300 lines total:

- `index.html` — DOM structure: the main `#board` canvas (300×600), a `#next-canvas` preview (120×120), HUD spans (`#score`, `#lines`, `#level`), and the pause/game-over `#overlay`.
- `style.css` — dark/retro arcade visual theme.
- `game.js` — all game logic, structured around a small set of global `let` state variables (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropAccum`, `dropInterval`, `animId`) mutated by the functions below. There is no module system or class hierarchy — everything is top-level functions operating on shared state.

Key mechanics and where they live in `game.js`:

- **Board model**: `ROWS × COLS` matrix (`board`); each cell is `0` (empty) or a color index `1–7` identifying the piece that placed it.
- **Pieces**: the 7 standard tetrominoes defined as square matrices in `PIECES`; rotation is a transpose + row-reverse (`rotateCW`), not a lookup table of rotation states.
- **Collision** (`collide`): checks board bounds and overlap with locked cells.
- **Wall kicks** (`tryRotate`): after rotating, tries offsets `[0, -1, 1, -2, 2]` columns before giving up on the rotation.
- **Game loop** (`loop`): driven by `requestAnimationFrame`; accumulates elapsed time in `dropAccum` and drops the piece one row once `dropInterval` is exceeded.
- **Line clearing** (`clearLines`): scans bottom-to-top, splices out full rows and unshifts empty rows at the top.
- **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` × current `level`; hard drop adds 2 pts/row dropped, soft drop adds 1 pt/row.
- **Leveling/speed**: level increments every 10 lines; `dropInterval = max(100, 1000 - (level - 1) * 90)` ms.
- **Ghost piece** (`ghostY`): projects the current piece straight down to its landing row, drawn at `globalAlpha = 0.2`.
- **Spawn/game over**: `spawn()` promotes `next` to `current` and generates a new `next`; if the new `current` immediately collides, `endGame()` fires and shows the Game Over overlay.

Tunable constants at the top of `game.js`: `COLS`, `ROWS`, `BLOCK` (cell pixel size), `COLORS`, `LINE_SCORES`, and the initial `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, update the `#board` canvas `width`/`height` in `index.html` to match (`COLS × BLOCK` and `ROWS × BLOCK`).

## Controls (for manual testing)

`←`/`→` move, `↑` or `X` rotate, `↓` soft drop, `Space` hard drop, `P` pause/resume.
