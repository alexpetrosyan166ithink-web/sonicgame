// ============================================================
// SNAKE CLASSIC - Full Game
// ============================================================

// ============================================================
// SECTION 1: CONSTANTS
// ============================================================
const CANVAS_W = 800;
const CANVAS_H = 400;
const CELL = 20; // Grid cell size
const GRID_W = CANVAS_W / CELL; // 40 columns
const GRID_H = CANVAS_H / CELL; // 20 rows
const DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

// Food types
const FOOD = {
    NORMAL: 0,    // +1 length, +10 pts
    BONUS: 1,     // +1 length, +50 pts, timed
    GOLDEN: 2,    // +1 length, +100 pts, rare
    SHRINK: 3,    // -2 length, +20 pts
    SPEED_DOWN: 4 // slow speed for 5s, +10 pts
};

// Wall tile types for level design
const WALL = 1;
const EMPTY = 0;

// ============================================================
// SECTION 2: AUDIO SYSTEM
// ============================================================
let audioCtx = null;
let musicGain = null;
let sfxGain = null;
let musicPlaying = false;
let musicMuted = false;
let currentMusicInterval = null;

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = audioCtx.createGain();
    musicGain.connect(audioCtx.destination);
    musicGain.gain.value = 0.2;
    sfxGain = audioCtx.createGain();
    sfxGain.connect(audioCtx.destination);
    sfxGain.gain.value = 0.35;
}

function playNote(freq, start, dur, type, gain) {
    if (!audioCtx || musicMuted) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.25, start);
    g.gain.exponentialRampToValueAtTime(0.01, start + dur);
    osc.connect(g);
    g.connect(gain || musicGain);
    osc.start(start);
    osc.stop(start + dur);
}

function playSFX(type) {
    if (!audioCtx || musicMuted) return;
    const now = audioCtx.currentTime;
    switch (type) {
        case 'eat':
            playNote(880, now, 0.05, 'square', sfxGain);
            playNote(1100, now + 0.04, 0.08, 'square', sfxGain);
            break;
        case 'bonus':
            playNote(660, now, 0.06, 'square', sfxGain);
            playNote(880, now + 0.05, 0.06, 'square', sfxGain);
            playNote(1100, now + 0.1, 0.1, 'square', sfxGain);
            break;
        case 'golden':
            for (let i = 0; i < 5; i++) playNote(600 + i * 120, now + i * 0.04, 0.08, 'square', sfxGain);
            break;
        case 'die':
            playNote(400, now, 0.12, 'sawtooth', sfxGain);
            playNote(300, now + 0.1, 0.12, 'sawtooth', sfxGain);
            playNote(200, now + 0.2, 0.12, 'sawtooth', sfxGain);
            playNote(100, now + 0.3, 0.3, 'sawtooth', sfxGain);
            break;
        case 'levelup':
            for (let i = 0; i < 8; i++) playNote(400 + i * 80, now + i * 0.06, 0.1, 'square', sfxGain);
            break;
        case 'powerup':
            playNote(523, now, 0.06, 'square', sfxGain);
            playNote(659, now + 0.06, 0.06, 'square', sfxGain);
            playNote(784, now + 0.12, 0.1, 'square', sfxGain);
            break;
        case 'turn':
            playNote(600, now, 0.03, 'triangle', sfxGain);
            break;
        case 'shrink':
            playNote(600, now, 0.06, 'triangle', sfxGain);
            playNote(400, now + 0.06, 0.1, 'triangle', sfxGain);
            break;
        case 'shield':
            playNote(300, now, 0.08, 'square', sfxGain);
            playNote(500, now + 0.06, 0.1, 'square', sfxGain);
            break;
    }
}

function stopMusic() {
    musicPlaying = false;
    if (currentMusicInterval) { clearInterval(currentMusicInterval); currentMusicInterval = null; }
}

function playGameMusic() {
    if (!audioCtx) return;
    stopMusic();
    musicPlaying = true;
    // Simple Snake-style chiptune loop
    const melody = [
        330, 0, 392, 0, 440, 0, 392, 0, 330, 0, 294, 0, 262, 0, 294, 0,
        330, 0, 330, 0, 294, 0, 294, 0, 330, 0, 392, 0, 392, 0, 0, 0,
        330, 0, 392, 0, 440, 0, 392, 0, 330, 0, 294, 0, 262, 0, 294, 0,
        330, 0, 330, 0, 294, 0, 294, 0, 262, 0, 0, 0, 0, 0, 0, 0
    ];
    let i = 0;
    currentMusicInterval = setInterval(() => {
        if (!musicPlaying || musicMuted) return;
        if (melody[i] > 0) playNote(melody[i], audioCtx.currentTime, 0.12, 'triangle', musicGain);
        i = (i + 1) % melody.length;
    }, 140);
}

// ============================================================
// SECTION 3: GAME STATE
// ============================================================
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let gameState = 'MENU'; // MENU, PLAYING, PAUSED, LEVEL_COMPLETE, GAME_OVER, VICTORY, SHOP
let gameMode = 'classic'; // 'classic' or 'endless'
let snake = [];
let direction = DIR.RIGHT;
let nextDirection = DIR.RIGHT;
let foods = [];
let walls = []; // 2D grid for current level walls
let score = 0;
let foodEaten = 0;
let currentLevel = 0;
let highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
let moveTimer = 0;
let baseSpeed = 8; // frames per move (lower = faster)
let currentSpeed = 8;
let speedOverride = 0; // timed speed changes
let speedOverrideTimer = 0;
let paused = false;
let frameCount = 0;
let particles = [];
let floatingTexts = [];
let gridFlash = []; // cells to flash
let shieldActive = false;
let ghostActive = false;
let ghostTimer = 0;
let magnetActive = false;
let magnetTimer = 0;
let levelFoodTarget = 10; // food to eat to complete level
let powerupSpawnTimer = 0;

// ============================================================
// SECTION 4: SHOP & PERSISTENCE
// ============================================================
let coins = parseInt(localStorage.getItem('snakeCoins')) || 0;
let ownedSkins = JSON.parse(localStorage.getItem('snakeOwnedSkins')) || ['classic'];
let equippedSkin = localStorage.getItem('snakeEquippedSkin') || 'classic';
let ownedPowerups = JSON.parse(localStorage.getItem('snakeOwnedPowerups')) || { shield: 0, shrink: 0, magnet: 0, ghost: 0 };

const skins = {
    classic: { price: 0, color: '#00FF00', headColor: '#00CC00', scoreMod: 1, speedMod: 1, coinMod: 1 },
    fire: { price: 100, color: '#FF6600', headColor: '#FF4400', scoreMod: 1.1, speedMod: 1, coinMod: 1 },
    ice: { price: 150, color: '#00CCFF', headColor: '#0099CC', scoreMod: 1, speedMod: 0.85, coinMod: 1 },
    gold: { price: 200, color: '#FFD700', headColor: '#CC9900', scoreMod: 1, speedMod: 1, coinMod: 2 },
    rainbow: { price: 500, color: 'rainbow', headColor: '#FFFFFF', scoreMod: 1.1, speedMod: 0.9, coinMod: 2 }
};

const powerupPrices = { shield: 50, shrink: 75, magnet: 100, ghost: 125 };

function saveCoins() { localStorage.setItem('snakeCoins', coins); }
function saveHighScore() { localStorage.setItem('snakeHighScore', highScore); }

function updateCoinDisplay() {
    const el1 = document.getElementById('coin-amount');
    const el2 = document.getElementById('coin-amount-shop');
    if (el1) el1.textContent = coins;
    if (el2) el2.textContent = coins;
}

function updateShopUI() {
    document.querySelectorAll('.skin-card').forEach(card => {
        const id = card.getAttribute('data-skin');
        const btn = card.querySelector('.skin-btn');
        if (ownedSkins.includes(id)) {
            if (equippedSkin === id) {
                btn.textContent = 'EQUIPPED';
                btn.className = 'skin-btn equipped';
                btn.disabled = true;
            } else {
                btn.textContent = 'EQUIP';
                btn.className = 'skin-btn owned';
                btn.disabled = false;
            }
        } else {
            btn.textContent = 'BUY';
            btn.className = 'skin-btn';
            btn.disabled = coins < skins[id].price;
        }
    });
    document.querySelectorAll('.powerup-card').forEach(card => {
        const id = card.getAttribute('data-powerup');
        card.querySelector('.powerup-owned').textContent = ownedPowerups[id] || 0;
        card.querySelector('.powerup-btn').disabled = coins < powerupPrices[id];
    });
}

function initShopListeners() {
    document.querySelectorAll('.skin-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const card = e.target.closest('.skin-card');
            const id = card.getAttribute('data-skin');
            if (!ownedSkins.includes(id)) {
                if (coins >= skins[id].price) {
                    coins -= skins[id].price;
                    ownedSkins.push(id);
                    localStorage.setItem('snakeOwnedSkins', JSON.stringify(ownedSkins));
                    saveCoins();
                    equippedSkin = id;
                    localStorage.setItem('snakeEquippedSkin', id);
                    updateCoinDisplay();
                    updateShopUI();
                }
            } else if (equippedSkin !== id) {
                equippedSkin = id;
                localStorage.setItem('snakeEquippedSkin', id);
                updateShopUI();
            }
        });
    });
    document.querySelectorAll('.powerup-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const card = e.target.closest('.powerup-card');
            const id = card.getAttribute('data-powerup');
            if (coins >= powerupPrices[id]) {
                coins -= powerupPrices[id];
                ownedPowerups[id] = (ownedPowerups[id] || 0) + 1;
                localStorage.setItem('snakeOwnedPowerups', JSON.stringify(ownedPowerups));
                saveCoins();
                updateCoinDisplay();
                updateShopUI();
            }
        });
    });
}

// ============================================================
// SECTION 5: LEVEL DATA
// ============================================================
// Each level: walls grid, speed, food target, special rules
// Wall grids: 1 = wall, 0 = empty (40x20 grid)
function generateWalls(levelIdx) {
    // Initialize empty grid
    const grid = [];
    for (let r = 0; r < GRID_H; r++) {
        grid[r] = [];
        for (let c = 0; c < GRID_W; c++) {
            grid[r][c] = EMPTY;
        }
    }

    if (levelIdx === 0) {
        // Level 1: No walls (open field)
        // Just border awareness - snake wraps or dies at edge based on mode
    } else if (levelIdx === 1) {
        // Level 2: Border walls
        for (let c = 0; c < GRID_W; c++) { grid[0][c] = WALL; grid[GRID_H - 1][c] = WALL; }
        for (let r = 0; r < GRID_H; r++) { grid[r][0] = WALL; grid[r][GRID_W - 1] = WALL; }
    } else if (levelIdx === 2) {
        // Level 3: Center horizontal wall
        for (let c = 0; c < GRID_W; c++) { grid[0][c] = WALL; grid[GRID_H - 1][c] = WALL; }
        for (let r = 0; r < GRID_H; r++) { grid[r][0] = WALL; grid[r][GRID_W - 1] = WALL; }
        for (let c = 10; c < 30; c++) grid[10][c] = WALL;
    } else if (levelIdx === 3) {
        // Level 4: Center cross
        for (let c = 0; c < GRID_W; c++) { grid[0][c] = WALL; grid[GRID_H - 1][c] = WALL; }
        for (let r = 0; r < GRID_H; r++) { grid[r][0] = WALL; grid[r][GRID_W - 1] = WALL; }
        for (let c = 15; c < 25; c++) grid[10][c] = WALL;
        for (let r = 5; r < 15; r++) grid[r][20] = WALL;
    } else if (levelIdx === 4) {
        // Level 5: Four blocks
        for (let c = 0; c < GRID_W; c++) { grid[0][c] = WALL; grid[GRID_H - 1][c] = WALL; }
        for (let r = 0; r < GRID_H; r++) { grid[r][0] = WALL; grid[r][GRID_W - 1] = WALL; }
        for (let r = 4; r < 8; r++) for (let c = 8; c < 12; c++) grid[r][c] = WALL;
        for (let r = 4; r < 8; r++) for (let c = 28; c < 32; c++) grid[r][c] = WALL;
        for (let r = 12; r < 16; r++) for (let c = 8; c < 12; c++) grid[r][c] = WALL;
        for (let r = 12; r < 16; r++) for (let c = 28; c < 32; c++) grid[r][c] = WALL;
    } else if (levelIdx === 5) {
        // Level 6: Corridors
        for (let c = 0; c < GRID_W; c++) { grid[0][c] = WALL; grid[GRID_H - 1][c] = WALL; }
        for (let r = 0; r < GRID_H; r++) { grid[r][0] = WALL; grid[r][GRID_W - 1] = WALL; }
        for (let c = 0; c < 30; c++) grid[6][c] = WALL;
        for (let c = 10; c < GRID_W; c++) grid[13][c] = WALL;
    } else if (levelIdx === 6) {
        // Level 7: Spiral-ish
        for (let c = 0; c < GRID_W; c++) { grid[0][c] = WALL; grid[GRID_H - 1][c] = WALL; }
        for (let r = 0; r < GRID_H; r++) { grid[r][0] = WALL; grid[r][GRID_W - 1] = WALL; }
        for (let c = 5; c < 35; c++) grid[5][c] = WALL;
        for (let r = 5; r < 15; r++) grid[r][35] = WALL;
        for (let c = 10; c < 36; c++) grid[14][c] = WALL;
        for (let r = 8; r < 15; r++) grid[r][10] = WALL;
    } else if (levelIdx === 7) {
        // Level 8: Checkerboard pillars
        for (let c = 0; c < GRID_W; c++) { grid[0][c] = WALL; grid[GRID_H - 1][c] = WALL; }
        for (let r = 0; r < GRID_H; r++) { grid[r][0] = WALL; grid[r][GRID_W - 1] = WALL; }
        for (let r = 3; r < GRID_H - 3; r += 5) {
            for (let c = 5; c < GRID_W - 5; c += 7) {
                if (r < GRID_H && c < GRID_W) {
                    grid[r][c] = WALL;
                    if (r + 1 < GRID_H) grid[r + 1][c] = WALL;
                    if (c + 1 < GRID_W) grid[r][c + 1] = WALL;
                    if (r + 1 < GRID_H && c + 1 < GRID_W) grid[r + 1][c + 1] = WALL;
                }
            }
        }
    } else if (levelIdx === 8) {
        // Level 9: Maze-like
        for (let c = 0; c < GRID_W; c++) { grid[0][c] = WALL; grid[GRID_H - 1][c] = WALL; }
        for (let r = 0; r < GRID_H; r++) { grid[r][0] = WALL; grid[r][GRID_W - 1] = WALL; }
        for (let c = 0; c < 15; c++) grid[5][c] = WALL;
        for (let c = 25; c < GRID_W; c++) grid[5][c] = WALL;
        for (let r = 5; r < 12; r++) grid[r][15] = WALL;
        for (let r = 5; r < 12; r++) grid[r][25] = WALL;
        for (let c = 5; c < 20; c++) grid[14][c] = WALL;
        for (let c = 22; c < 35; c++) grid[14][c] = WALL;
        for (let r = 8; r < 14; r++) grid[r][5] = WALL;
        for (let r = 8; r < 14; r++) grid[r][34] = WALL;
    } else {
        // Level 10: The gauntlet
        for (let c = 0; c < GRID_W; c++) { grid[0][c] = WALL; grid[GRID_H - 1][c] = WALL; }
        for (let r = 0; r < GRID_H; r++) { grid[r][0] = WALL; grid[r][GRID_W - 1] = WALL; }
        // Dense obstacles
        for (let c = 8; c < 32; c++) grid[4][c] = WALL;
        for (let c = 8; c < 32; c++) grid[15][c] = WALL;
        for (let r = 4; r < 10; r++) grid[r][8] = WALL;
        for (let r = 10; r < 16; r++) grid[r][31] = WALL;
        for (let r = 7; r < 13; r++) grid[r][20] = WALL;
        for (let c = 14; c < 26; c++) grid[10][c] = WALL;
    }

    return grid;
}

const LEVEL_SPEEDS = [8, 7, 7, 6, 6, 5, 5, 4, 4, 3];
const LEVEL_FOOD_TARGETS = [8, 10, 10, 12, 12, 14, 14, 16, 16, 20];
const LEVEL_NAMES = [
    'OPEN FIELD', 'WALLED IN', 'THE DIVIDE', 'CROSSROADS',
    'FOUR CORNERS', 'CORRIDORS', 'THE SPIRAL', 'PILLARS',
    'THE MAZE', 'THE GAUNTLET'
];

// ============================================================
// SECTION 6: CORE GAME LOGIC
// ============================================================
function resetSnake() {
    // Find a safe spawn point (not on a wall)
    let startX = 5, startY = Math.floor(GRID_H / 2);
    // Make sure spawn area is clear
    while (walls[startY] && walls[startY][startX] === WALL && startX < GRID_W - 5) startX++;
    snake = [
        { x: startX, y: startY },
        { x: startX - 1, y: startY },
        { x: startX - 2, y: startY }
    ];
    direction = DIR.RIGHT;
    nextDirection = DIR.RIGHT;
}

function spawnFood() {
    // Clear expired foods
    foods = foods.filter(f => !f.expired);

    // Ensure at least 1 normal food
    const normalCount = foods.filter(f => f.type === FOOD.NORMAL).length;
    if (normalCount === 0) {
        const pos = getRandomEmptyCell();
        if (pos) foods.push({ x: pos.x, y: pos.y, type: FOOD.NORMAL, timer: -1 });
    }
}

function spawnSpecialFood() {
    powerupSpawnTimer++;
    if (powerupSpawnTimer % 300 === 0) {
        // Spawn bonus food (timed)
        const pos = getRandomEmptyCell();
        if (pos) foods.push({ x: pos.x, y: pos.y, type: FOOD.BONUS, timer: 300 });
    }
    if (powerupSpawnTimer % 600 === 0) {
        // Spawn golden food (rare, timed)
        const pos = getRandomEmptyCell();
        if (pos) foods.push({ x: pos.x, y: pos.y, type: FOOD.GOLDEN, timer: 240 });
    }
    if (powerupSpawnTimer % 450 === 0 && Math.random() < 0.5) {
        const pos = getRandomEmptyCell();
        if (pos) {
            const type = Math.random() < 0.5 ? FOOD.SHRINK : FOOD.SPEED_DOWN;
            foods.push({ x: pos.x, y: pos.y, type: type, timer: 360 });
        }
    }
    // Tick timers
    foods.forEach(f => {
        if (f.timer > 0) {
            f.timer--;
            if (f.timer <= 0) f.expired = true;
        }
    });
}

function getRandomEmptyCell() {
    const attempts = 100;
    for (let i = 0; i < attempts; i++) {
        const x = Math.floor(Math.random() * GRID_W);
        const y = Math.floor(Math.random() * GRID_H);
        if (walls[y] && walls[y][x] === WALL) continue;
        if (snake.some(s => s.x === x && s.y === y)) continue;
        if (foods.some(f => f.x === x && f.y === y)) continue;
        return { x, y };
    }
    return null;
}

function moveSnake() {
    direction = nextDirection;
    const head = snake[0];
    let nx = head.x + DX[direction];
    let ny = head.y + DY[direction];

    // Wrap or collide with edges
    if (currentLevel === 0 && gameMode === 'classic') {
        // Level 1: wrap around
        if (nx < 0) nx = GRID_W - 1;
        if (nx >= GRID_W) nx = 0;
        if (ny < 0) ny = GRID_H - 1;
        if (ny >= GRID_H) ny = 0;
    } else if (gameMode === 'endless') {
        // Endless: always wrap
        if (nx < 0) nx = GRID_W - 1;
        if (nx >= GRID_W) nx = 0;
        if (ny < 0) ny = GRID_H - 1;
        if (ny >= GRID_H) ny = 0;
    }

    // Ghost mode: pass through walls
    if (ghostActive) {
        // Can pass through walls but still wraps at edges
        if (nx < 0) nx = GRID_W - 1;
        if (nx >= GRID_W) nx = 0;
        if (ny < 0) ny = GRID_H - 1;
        if (ny >= GRID_H) ny = 0;
    } else {
        // Wall collision
        if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) {
            if (shieldActive) { shieldActive = false; playSFX('shield'); return; }
            die();
            return;
        }
        if (walls[ny] && walls[ny][nx] === WALL) {
            if (shieldActive) { shieldActive = false; playSFX('shield'); return; }
            die();
            return;
        }
    }

    // Self collision
    if (snake.some(s => s.x === nx && s.y === ny)) {
        if (shieldActive) { shieldActive = false; playSFX('shield'); return; }
        die();
        return;
    }

    // Move
    snake.unshift({ x: nx, y: ny });

    // Check food
    let ate = false;
    const skinData = skins[equippedSkin] || skins.classic;

    for (let i = foods.length - 1; i >= 0; i--) {
        const f = foods[i];
        if (f.x === nx && f.y === ny && !f.expired) {
            foods.splice(i, 1);
            ate = true;
            foodEaten++;

            let points = 0;
            let coinReward = 0;

            switch (f.type) {
                case FOOD.NORMAL:
                    points = 10;
                    coinReward = 1;
                    playSFX('eat');
                    break;
                case FOOD.BONUS:
                    points = 50;
                    coinReward = 3;
                    playSFX('bonus');
                    spawnParticles(nx * CELL + CELL / 2, ny * CELL + CELL / 2, '#FF00FF', 8);
                    break;
                case FOOD.GOLDEN:
                    points = 100;
                    coinReward = 5;
                    playSFX('golden');
                    spawnParticles(nx * CELL + CELL / 2, ny * CELL + CELL / 2, '#FFD700', 12);
                    break;
                case FOOD.SHRINK:
                    points = 20;
                    coinReward = 1;
                    // Remove tail segments
                    if (snake.length > 4) {
                        snake.splice(snake.length - 2, 2);
                    }
                    playSFX('shrink');
                    break;
                case FOOD.SPEED_DOWN:
                    points = 10;
                    coinReward = 1;
                    speedOverride = currentSpeed + 3;
                    speedOverrideTimer = 300;
                    playSFX('powerup');
                    break;
            }

            points = Math.floor(points * skinData.scoreMod);
            coinReward = Math.floor(coinReward * skinData.coinMod);
            score += points;
            coins += coinReward;
            saveCoins();
            addFloatingText(nx * CELL, ny * CELL, '+' + points);
            updateHUD();
            break;
        }
    }

    if (!ate) {
        snake.pop(); // Remove tail if didn't eat
    }

    // Magnet: move food closer to head
    if (magnetActive) {
        foods.forEach(f => {
            if (f.type === FOOD.NORMAL || f.type === FOOD.BONUS || f.type === FOOD.GOLDEN) {
                if (Math.abs(f.x - nx) + Math.abs(f.y - ny) < 10) {
                    if (f.x < nx && !isBlocked(f.x + 1, f.y)) f.x++;
                    else if (f.x > nx && !isBlocked(f.x - 1, f.y)) f.x--;
                    if (f.y < ny && !isBlocked(f.x, f.y + 1)) f.y++;
                    else if (f.y > ny && !isBlocked(f.x, f.y - 1)) f.y--;
                }
            }
        });
    }

    // Check level complete (classic mode)
    if (gameMode === 'classic' && foodEaten >= levelFoodTarget) {
        levelComplete();
    }

    spawnFood();
}

function isBlocked(x, y) {
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return true;
    if (walls[y] && walls[y][x] === WALL) return true;
    if (snake.some(s => s.x === x && s.y === y)) return true;
    return false;
}

function die() {
    gameState = 'GAME_OVER';
    stopMusic();
    playSFX('die');
    // Explode snake into particles
    snake.forEach(s => {
        spawnParticles(s.x * CELL + CELL / 2, s.y * CELL + CELL / 2, '#00FF00', 3);
    });
    if (score > highScore) {
        highScore = score;
        saveHighScore();
    }
    document.getElementById('final-score').textContent = 'Score: ' + score;
    document.getElementById('final-length').textContent = 'Length: ' + snake.length;
    document.getElementById('final-level').textContent = 'Level: ' + (currentLevel + 1);
    saveCoins();
    updateCoinDisplay();
    setTimeout(() => showScreen('game-over-screen'), 800);
}

function levelComplete() {
    gameState = 'LEVEL_COMPLETE';
    stopMusic();
    playSFX('levelup');
    const lengthBonus = snake.length * 10;
    const totalScore = score + lengthBonus;
    score = totalScore;

    if (score > highScore) { highScore = score; saveHighScore(); }

    document.getElementById('lc-score').textContent = score - lengthBonus;
    document.getElementById('lc-length').textContent = snake.length;
    document.getElementById('lc-food').textContent = foodEaten;
    document.getElementById('lc-bonus').textContent = lengthBonus;
    document.getElementById('lc-total').textContent = totalScore;

    saveCoins();
    updateCoinDisplay();
    showScreen('level-complete-screen');
}

function nextLevel() {
    currentLevel++;
    if (currentLevel >= 10) {
        showVictory();
    } else {
        loadLevel(currentLevel);
        gameState = 'PLAYING';
        showScreen(null);
    }
}

// ============================================================
// SECTION 7: RENDERING
// ============================================================
function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawBackground();
    drawWalls();
    drawFood();
    drawSnake();
    drawParticles();
    drawFloatingTexts();
    drawPowerupIndicators();
}

function drawBackground() {
    // Nokia-style dark background with subtle grid
    ctx.fillStyle = '#0a1a0a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid lines
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.04)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= GRID_W; c++) {
        ctx.beginPath();
        ctx.moveTo(c * CELL, 0);
        ctx.lineTo(c * CELL, CANVAS_H);
        ctx.stroke();
    }
    for (let r = 0; r <= GRID_H; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * CELL);
        ctx.lineTo(CANVAS_W, r * CELL);
        ctx.stroke();
    }
}

function drawWalls() {
    for (let r = 0; r < GRID_H; r++) {
        for (let c = 0; c < GRID_W; c++) {
            if (walls[r] && walls[r][c] === WALL) {
                const x = c * CELL;
                const y = r * CELL;
                // Retro brick wall style
                ctx.fillStyle = '#404040';
                ctx.fillRect(x, y, CELL, CELL);
                ctx.fillStyle = '#555555';
                ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
                ctx.fillStyle = '#333333';
                ctx.fillRect(x + CELL / 2 - 1, y, 2, CELL);
                ctx.fillRect(x, y + CELL / 2 - 1, CELL, 2);
            }
        }
    }
}

function drawFood() {
    foods.forEach(f => {
        if (f.expired) return;
        const x = f.x * CELL;
        const y = f.y * CELL;
        const blinking = f.timer > 0 && f.timer < 60 && Math.floor(frameCount / 5) % 2 === 0;
        if (blinking) return;

        switch (f.type) {
            case FOOD.NORMAL:
                ctx.fillStyle = '#FF0000';
                ctx.beginPath();
                ctx.arc(x + CELL / 2, y + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
                ctx.fill();
                // Apple highlight
                ctx.fillStyle = '#FF4444';
                ctx.beginPath();
                ctx.arc(x + CELL / 2 - 2, y + CELL / 2 - 2, 3, 0, Math.PI * 2);
                ctx.fill();
                // Stem
                ctx.fillStyle = '#00AA00';
                ctx.fillRect(x + CELL / 2 - 1, y + 2, 2, 4);
                break;
            case FOOD.BONUS:
                ctx.fillStyle = '#FF00FF';
                // Star shape
                drawStar(x + CELL / 2, y + CELL / 2, 5, CELL / 2 - 1, CELL / 4, '#FF00FF');
                break;
            case FOOD.GOLDEN:
                // Pulsing golden orb
                const pulse = Math.sin(frameCount * 0.1) * 2;
                ctx.fillStyle = '#FFD700';
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(x + CELL / 2, y + CELL / 2, CELL / 2 - 2 + pulse, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                break;
            case FOOD.SHRINK:
                ctx.fillStyle = '#00FFFF';
                ctx.fillRect(x + 3, y + CELL / 2 - 2, CELL - 6, 4);
                break;
            case FOOD.SPEED_DOWN:
                ctx.fillStyle = '#AAAAFF';
                ctx.beginPath();
                ctx.moveTo(x + CELL / 2, y + 3);
                ctx.lineTo(x + CELL - 3, y + CELL - 3);
                ctx.lineTo(x + 3, y + CELL - 3);
                ctx.closePath();
                ctx.fill();
                break;
        }
    });
}

function drawStar(cx, cy, spikes, outerR, innerR, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (Math.PI / spikes) * i - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
}

function drawSnake() {
    const skinData = skins[equippedSkin] || skins.classic;

    // Ghost effect
    if (ghostActive) {
        ctx.globalAlpha = 0.5;
    }

    for (let i = snake.length - 1; i >= 0; i--) {
        const s = snake[i];
        const x = s.x * CELL;
        const y = s.y * CELL;

        if (i === 0) {
            // Head
            ctx.fillStyle = skinData.headColor;
            if (equippedSkin === 'rainbow') {
                const hue = (frameCount * 5 + i * 20) % 360;
                ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            }
            ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);

            // Eyes
            ctx.fillStyle = '#FFFFFF';
            let ex1, ey1, ex2, ey2;
            if (direction === DIR.RIGHT) { ex1 = x + 13; ey1 = y + 4; ex2 = x + 13; ey2 = y + 12; }
            else if (direction === DIR.LEFT) { ex1 = x + 5; ey1 = y + 4; ex2 = x + 5; ey2 = y + 12; }
            else if (direction === DIR.UP) { ex1 = x + 4; ey1 = y + 5; ex2 = x + 12; ey2 = y + 5; }
            else { ex1 = x + 4; ey1 = y + 13; ex2 = x + 12; ey2 = y + 13; }
            ctx.beginPath();
            ctx.arc(ex1, ey1, 3, 0, Math.PI * 2);
            ctx.arc(ex2, ey2, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(ex1, ey1, 1.5, 0, Math.PI * 2);
            ctx.arc(ex2, ey2, 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Body segment
            let color = skinData.color;
            if (equippedSkin === 'rainbow') {
                const hue = (frameCount * 5 + i * 20) % 360;
                color = `hsl(${hue}, 100%, 45%)`;
            }
            ctx.fillStyle = color;
            ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);

            // Darker inner pattern
            if (equippedSkin !== 'rainbow') {
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);
            }
        }
    }

    // Shield indicator on head
    if (shieldActive) {
        const head = snake[0];
        ctx.strokeStyle = '#00AAFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(head.x * CELL + CELL / 2, head.y * CELL + CELL / 2, CELL / 2 + 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.globalAlpha = 1;
}

function drawPowerupIndicators() {
    let yOff = CANVAS_H - 15;
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'left';

    if (shieldActive) {
        ctx.fillStyle = '#00AAFF';
        ctx.fillText('SHIELD', 10, yOff);
        yOff -= 12;
    }
    if (ghostActive) {
        ctx.fillStyle = '#AAAAAA';
        ctx.fillText('GHOST ' + Math.ceil(ghostTimer / 60) + 's', 10, yOff);
        yOff -= 12;
    }
    if (magnetActive) {
        ctx.fillStyle = '#FF4444';
        ctx.fillText('MAGNET ' + Math.ceil(magnetTimer / 60) + 's', 10, yOff);
        yOff -= 12;
    }
    if (speedOverrideTimer > 0) {
        ctx.fillStyle = '#AAAAFF';
        ctx.fillText('SLOW ' + Math.ceil(speedOverrideTimer / 60) + 's', 10, yOff);
    }
}

// ============================================================
// SECTION 8: PARTICLES & EFFECTS
// ============================================================
function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 30 + Math.random() * 20,
            color,
            size: 2 + Math.random() * 3
        });
    }
}

function addFloatingText(x, y, text) {
    floatingTexts.push({ x, y, text, life: 40, vy: -1.2 });
}

function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life / 50;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
}

function drawFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy;
        ft.life--;
        if (ft.life <= 0) { floatingTexts.splice(i, 1); continue; }
        ctx.globalAlpha = ft.life / 40;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x + CELL / 2, ft.y);
    }
    ctx.globalAlpha = 1;
}

// ============================================================
// SECTION 9: GAME LOOP
// ============================================================
function gameLoop() {
    frameCount++;

    if (gameState === 'PLAYING' && !paused) {
        moveTimer++;

        // Determine move speed
        let speed = currentSpeed;
        const skinData = skins[equippedSkin] || skins.classic;
        if (skinData.speedMod !== 1) speed = Math.max(2, Math.round(speed * (1 / skinData.speedMod)));
        if (speedOverrideTimer > 0) {
            speed = speedOverride;
            speedOverrideTimer--;
            if (speedOverrideTimer <= 0) speedOverride = 0;
        }
        // Sprint
        if (keys['ShiftLeft'] || keys['ShiftRight']) speed = Math.max(2, speed - 2);

        if (moveTimer >= speed) {
            moveTimer = 0;
            moveSnake();
        }

        // Timers
        if (ghostActive) {
            ghostTimer--;
            if (ghostTimer <= 0) ghostActive = false;
        }
        if (magnetActive) {
            magnetTimer--;
            if (magnetTimer <= 0) magnetActive = false;
        }

        spawnSpecialFood();
        render();
    } else if (gameState === 'GAME_OVER') {
        // Still render death particles
        render();
    }

    requestAnimationFrame(gameLoop);
}

function updateHUD() {
    document.getElementById('ui-score').textContent = 'SCORE ' + score;
    document.getElementById('ui-length').textContent = 'LENGTH ' + snake.length;
    document.getElementById('ui-highscore').textContent = 'HI ' + highScore;
    updateCoinDisplay();
}

// ============================================================
// SECTION 10: GAME STATE MANAGEMENT
// ============================================================
function startGame() {
    initAudio();
    gameState = 'PLAYING';
    score = 0;
    foodEaten = 0;
    currentLevel = 0;
    loadLevel(currentLevel);
    showScreen(null);
    playGameMusic();
}

function loadLevel(idx) {
    if (gameMode === 'endless') {
        walls = generateWalls(1); // Simple border for endless
        currentSpeed = 6;
        levelFoodTarget = Infinity;
        document.getElementById('ui-level').textContent = 'ENDLESS';
    } else {
        walls = generateWalls(idx);
        currentSpeed = LEVEL_SPEEDS[idx] || 4;
        levelFoodTarget = LEVEL_FOOD_TARGETS[idx] || 10;
        document.getElementById('ui-level').textContent = 'LV' + (idx + 1) + ' ' + (LEVEL_NAMES[idx] || '');
    }

    foods = [];
    particles = [];
    floatingTexts = [];
    foodEaten = 0;
    moveTimer = 0;
    powerupSpawnTimer = 0;
    speedOverride = 0;
    speedOverrideTimer = 0;
    ghostActive = false;
    ghostTimer = 0;
    magnetActive = false;
    magnetTimer = 0;
    shieldActive = false;

    resetSnake();

    // Apply purchased powerups
    if (ownedPowerups.shield > 0) {
        ownedPowerups.shield--;
        localStorage.setItem('snakeOwnedPowerups', JSON.stringify(ownedPowerups));
        shieldActive = true;
    }
    if (ownedPowerups.ghost > 0) {
        ownedPowerups.ghost--;
        localStorage.setItem('snakeOwnedPowerups', JSON.stringify(ownedPowerups));
        ghostActive = true;
        ghostTimer = 600;
    }
    if (ownedPowerups.magnet > 0) {
        ownedPowerups.magnet--;
        localStorage.setItem('snakeOwnedPowerups', JSON.stringify(ownedPowerups));
        magnetActive = true;
        magnetTimer = 900;
    }
    if (ownedPowerups.shrink > 0) {
        // Shrink doesn't apply at start, it's instant use - refund it
        // Actually, shrink makes more sense as on-demand, so skip auto-use
    }

    spawnFood();
    updateHUD();
}

function showVictory() {
    gameState = 'VICTORY';
    stopMusic();
    playSFX('levelup');
    if (score > highScore) { highScore = score; saveHighScore(); }
    document.getElementById('victory-score').textContent = 'Final Score: ' + score;
    coins += 100; // Victory bonus
    saveCoins();
    updateCoinDisplay();
    showScreen('victory-screen');
}

function goToMainMenu() {
    gameState = 'MENU';
    paused = false;
    stopMusic();
    showScreen('start-screen');
    updateCoinDisplay();
    updateHUD();
}

// ============================================================
// SECTION 11: INPUT HANDLING
// ============================================================
let keys = {};

document.addEventListener('keydown', e => {
    keys[e.code] = true;

    if (gameState === 'PLAYING' && !paused) {
        switch (e.code) {
            case 'ArrowUp': case 'KeyW':
                if (direction !== DIR.DOWN) nextDirection = DIR.UP;
                e.preventDefault();
                break;
            case 'ArrowDown': case 'KeyS':
                if (direction !== DIR.UP) nextDirection = DIR.DOWN;
                e.preventDefault();
                break;
            case 'ArrowLeft': case 'KeyA':
                if (direction !== DIR.RIGHT) nextDirection = DIR.LEFT;
                e.preventDefault();
                break;
            case 'ArrowRight': case 'KeyD':
                if (direction !== DIR.LEFT) nextDirection = DIR.RIGHT;
                e.preventDefault();
                break;
            case 'Space':
                paused = true;
                showScreen('pause-screen');
                e.preventDefault();
                break;
        }
    } else if (gameState === 'PLAYING' && paused) {
        if (e.code === 'Space') {
            paused = false;
            showScreen(null);
            e.preventDefault();
        }
    }
});

document.addEventListener('keyup', e => {
    keys[e.code] = false;
});

// ============================================================
// SECTION 12: SCREEN MANAGEMENT & EVENT LISTENERS
// ============================================================
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    if (id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    }
}

document.getElementById('start-btn').addEventListener('click', () => startGame());

document.getElementById('shop-btn').addEventListener('click', () => {
    showScreen('shop-screen');
    updateShopUI();
    updateCoinDisplay();
});

document.getElementById('back-btn').addEventListener('click', () => showScreen('start-screen'));

document.getElementById('next-level-btn').addEventListener('click', () => nextLevel());

document.getElementById('restart-btn').addEventListener('click', () => startGame());

document.getElementById('menu-btn').addEventListener('click', () => goToMainMenu());

document.getElementById('play-again-btn').addEventListener('click', () => startGame());

document.getElementById('victory-menu-btn').addEventListener('click', () => goToMainMenu());

document.getElementById('resume-btn').addEventListener('click', () => {
    paused = false;
    showScreen(null);
});

document.getElementById('pause-menu-btn').addEventListener('click', () => goToMainMenu());

document.getElementById('music-btn').addEventListener('click', () => {
    initAudio();
    musicMuted = !musicMuted;
    document.getElementById('music-btn').textContent = musicMuted ? 'MUSIC OFF' : 'MUSIC ON';
    if (musicMuted) stopMusic();
});

document.getElementById('mode-btn').addEventListener('click', () => {
    if (gameMode === 'classic') {
        gameMode = 'endless';
        document.getElementById('mode-btn').textContent = 'MODE: ENDLESS';
        document.getElementById('mode-info').textContent = 'MODE: ENDLESS (No levels, play until you die!)';
    } else {
        gameMode = 'classic';
        document.getElementById('mode-btn').textContent = 'MODE: CLASSIC';
        document.getElementById('mode-info').textContent = 'MODE: CLASSIC (10 Levels)';
    }
});

// ============================================================
// SECTION 13: INITIALIZATION
// ============================================================
function init() {
    initShopListeners();
    updateCoinDisplay();
    updateHUD();
    showScreen('start-screen');
    gameLoop();
}

init();
