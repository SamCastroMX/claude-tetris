'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#64b5f6', // J - pale blue
  '#ffb74d', // L - orange
  '#f06292', // + (plus) pentomino - pink
  '#4db6ac', // U pentomino - teal
  '#ff8a65', // Y pentomino - peach
  '#fff176', // single block - gold (Tetris reward)
  '#90a4ae', // hollow 3x3 - blue-grey (challenge)
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[0,8,0],[8,8,8],[0,8,0]],                  // + pentomino
  [[9,0,9],[9,9,9]],                           // U pentomino
  [[0,10],[10,10],[0,10],[0,10]],             // Y pentomino
  [[11]],                                      // single block (Tetris reward)
  [[12,12,12],[12,0,12],[12,12,12]],          // hollow 3x3 (challenge)
];

// Regular tetrominoes make up most of the sequence; these occasionally
// appear instead. The single block is never drawn at random - it is only
// awarded via SINGLE_TYPE right after a Tetris (see clearLines/spawn).
const NORMAL_TYPE_COUNT = 7;
const SPECIAL_TYPES = [8, 9, 10, 12];
const SPECIAL_CHANCE = 0.12;
const SINGLE_TYPE = 11;

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const overlayStats = document.getElementById('overlay-stats');
const overlayScoreTable = document.getElementById('overlay-score-table');
const overlaySaveForm = document.getElementById('overlay-save-form');
const nameInput = document.getElementById('name-input');
const saveScoreBtn = document.getElementById('save-score-btn');
const startScreen = document.getElementById('start-screen');
const startScoreTable = document.getElementById('start-score-table');
const startBestStats = document.getElementById('start-best-stats');
const playBtn = document.getElementById('play-btn');
const resetScoresStartBtn = document.getElementById('reset-scores-start');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, rewardPending;
let bestCombo;

const SCORES_KEY = 'tetrisScores';
const BEST_COMBO_KEY = 'tetrisBestCombo';
const BEST_LINES_KEY = 'tetrisBestLines';
const MAX_SCORES = 5;

function applyTheme(theme) {
  document.body.classList.toggle('light-theme', theme === 'light');
  themeToggleBtn.textContent = theme === 'light' ? '☀' : '🌙';
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  applyTheme(document.body.classList.contains('light-theme') ? 'dark' : 'light');
}

function loadScores() {
  try {
    const raw = JSON.parse(localStorage.getItem(SCORES_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveScore(name, scoreValue, extra) {
  const scores = loadScores();
  scores.push({
    name: (name || 'AAA').trim().slice(0, 10) || 'AAA',
    score: scoreValue,
    lines: (extra && extra.lines) || 0,
    bestCombo: (extra && extra.bestCombo) || 0,
  });
  scores.sort((a, b) => b.score - a.score);
  scores.length = Math.min(scores.length, MAX_SCORES);
  localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
  return scores;
}

function resetScores() {
  localStorage.removeItem(SCORES_KEY);
  localStorage.removeItem(BEST_COMBO_KEY);
  localStorage.removeItem(BEST_LINES_KEY);
}

function qualifiesForTopScores(scoreValue) {
  if (scoreValue <= 0) return false;
  const scores = loadScores();
  return scores.length < MAX_SCORES || scoreValue > scores[scores.length - 1].score;
}

function getBestEver() {
  return {
    bestCombo: parseInt(localStorage.getItem(BEST_COMBO_KEY), 10) || 0,
    bestLines: parseInt(localStorage.getItem(BEST_LINES_KEY), 10) || 0,
  };
}

function updateBestEver(comboValue, linesValue) {
  const best = getBestEver();
  if (comboValue > best.bestCombo) localStorage.setItem(BEST_COMBO_KEY, String(comboValue));
  if (linesValue > best.bestLines) localStorage.setItem(BEST_LINES_KEY, String(linesValue));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderScoreTable(container, highlightScore) {
  const scores = loadScores();
  if (!scores.length) {
    container.innerHTML = '<p class="no-scores">Sin récords aún</p>';
    return;
  }
  let html = '<table class="score-table"><thead><tr>'
    + '<th>#</th><th>Nombre</th><th>Puntos</th><th>Líneas</th><th>Combo</th>'
    + '</tr></thead><tbody>';
  let highlighted = false;
  scores.forEach((entry, i) => {
    const doHighlight = !highlighted && highlightScore != null && entry.score === highlightScore;
    if (doHighlight) highlighted = true;
    html += `<tr class="${doHighlight ? 'highlight' : ''}"><td>${i + 1}</td><td>${escapeHtml(entry.name)}</td>`
      + `<td>${entry.score.toLocaleString()}</td><td>${entry.lines}</td><td>${entry.bestCombo}</td></tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

function showStartScreen() {
  renderScoreTable(startScoreTable, null);
  const best = getBestEver();
  startBestStats.textContent = `Mejor combo: ${best.bestCombo} líneas · Líneas máximas: ${best.bestLines}`;
  startScreen.classList.remove('hidden');
}

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece(forcedType) {
  let type;
  if (forcedType) {
    type = forcedType;
  } else if (Math.random() < SPECIAL_CHANCE) {
    type = SPECIAL_TYPES[Math.floor(Math.random() * SPECIAL_TYPES.length)];
  } else {
    type = Math.floor(Math.random() * NORMAL_TYPE_COUNT) + 1;
  }
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    if (cleared > bestCombo) bestCombo = cleared;
    if (cleared === 4) rewardPending = true;
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece(rewardPending ? SINGLE_TYPE : undefined);
  rewardPending = false;
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--grid-color').trim();
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlayStats.textContent = `Mejor combo: ${bestCombo} líneas · Líneas: ${lines}`;
  updateBestEver(bestCombo, lines);

  if (qualifiesForTopScores(score)) {
    overlaySaveForm.classList.remove('hidden');
    nameInput.value = '';
    renderScoreTable(overlayScoreTable, null);
  } else {
    overlaySaveForm.classList.add('hidden');
    renderScoreTable(overlayScoreTable, score);
  }
  overlay.classList.remove('hidden');
}

function handleSaveScore() {
  const name = nameInput.value;
  saveScore(name, score, { lines, bestCombo });
  overlaySaveForm.classList.add('hidden');
  renderScoreTable(overlayScoreTable, score);
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlayStats.textContent = '';
    overlayScoreTable.innerHTML = '';
    overlaySaveForm.classList.add('hidden');
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  if (gameOver) return;
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  rewardPending = false;
  bestCombo = 0;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);
themeToggleBtn.addEventListener('click', toggleTheme);
saveScoreBtn.addEventListener('click', handleSaveScore);
playBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  init();
});
resetScoresStartBtn.addEventListener('click', () => {
  resetScores();
  showStartScreen();
});

// NOTE: bootstrap — do NOT auto-call init() on page load. The game only
// starts when the player clicks "Jugar" on the start screen (or clicks
// "Reiniciar" from the game-over overlay, which calls init() directly).
applyTheme(localStorage.getItem('theme') || 'dark');
showStartScreen();
