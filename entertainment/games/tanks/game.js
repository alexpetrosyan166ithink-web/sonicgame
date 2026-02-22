// ============================================================
// BATTLE TANKS - Classic Nintendo Tank Game (Battle City style)
// ============================================================

// ============================================================
// SECTION 1: CONSTANTS
// ============================================================
const CANVAS_W = 800;
const CANVAS_H = 400;
const CELL = 20;
const GRID_W = CANVAS_W / CELL; // 40 columns
const GRID_H = CANVAS_H / CELL; // 20 rows

const DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

// Tile types
const TILE = {
    EMPTY: 0,
    BRICK: 1,
    STEEL: 2,
    WATER: 3,
    TREES: 4,
    EAGLE: 5,
    EAGLE_DEAD: 6
};

// Tank speeds (pixels per frame)
const PLAYER_SPEED = 2;
const BULLET_SPEED = 4;
const ENEMY_BASE_SPEED = 1;

// Timers
const ENEMY_SPAWN_INTERVAL = 180; // frames between spawns
const ENEMY_FIRE_INTERVAL = 90;
const ENEMY_TURN_INTERVAL = 60;
const POWERUP_DURATION = 300; // frames for shield/speed
const SHIELD_START_DURATION = 120; // brief invincibility on spawn

// Enemy types
const ENEMY_TYPE = {
    BASIC: 0,    // slow, 1HP
    FAST: 1,     // fast, 1HP
    POWER: 2,    // slow, fires fast, 1HP
    ARMOR: 3     // slow, 4HP (flashes when hit)
};

// Power-up types
const POWERUP = {
    SHIELD: 0,
    SPEED: 1,
    LIFE: 2,
    BOMB: 3,
    STAR: 4
};

// Colors
const COLORS = {
    BRICK: '#8B4513',
    BRICK_DARK: '#654321',
    STEEL: '#888888',
    STEEL_LIGHT: '#AAAAAA',
    WATER: '#1E90FF',
    WATER_DARK: '#0066CC',
    TREES: '#228B22',
    TREES_DARK: '#006400',
    EAGLE: '#FFD700',
    EAGLE_DEAD: '#444444',
    PLAYER: '#FFD700',
    PLAYER_DARK: '#B8860B',
    ENEMY_BASIC: '#CCCCCC',
    ENEMY_FAST: '#FF6666',
    ENEMY_POWER: '#66FF66',
    ENEMY_ARMOR: '#9966FF',
    BULLET: '#FFFFFF',
    GROUND: '#0a0a0a'
};

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
    musicGain.gain.value = 0.15;
    sfxGain = audioCtx.createGain();
    sfxGain.connect(audioCtx.destination);
    sfxGain.gain.value = 0.3;
}

function playNote(freq, start, dur, type, gain) {
    if (!audioCtx || musicMuted) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.2, start);
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
        case 'fire':
            playNote(200, now, 0.06, 'square', sfxGain);
            playNote(150, now + 0.03, 0.06, 'square', sfxGain);
            break;
        case 'hit':
            playNote(300, now, 0.04, 'square', sfxGain);
            playNote(500, now + 0.03, 0.06, 'square', sfxGain);
            break;
        case 'steel':
            playNote(800, now, 0.03, 'triangle', sfxGain);
            playNote(600, now + 0.02, 0.03, 'triangle', sfxGain);
            break;
        case 'explode':
            playNote(150, now, 0.12, 'sawtooth', sfxGain);
            playNote(100, now + 0.08, 0.15, 'sawtooth', sfxGain);
            playNote(60, now + 0.15, 0.2, 'sawtooth', sfxGain);
            break;
        case 'powerup':
            playNote(523, now, 0.06, 'square', sfxGain);
            playNote(659, now + 0.06, 0.06, 'square', sfxGain);
            playNote(784, now + 0.12, 0.06, 'square', sfxGain);
            playNote(1047, now + 0.18, 0.12, 'square', sfxGain);
            break;
        case 'life':
            for (let i = 0; i < 6; i++) playNote(400 + i * 100, now + i * 0.05, 0.1, 'square', sfxGain);
            break;
        case 'bomb':
            for (let i = 0; i < 4; i++) {
                playNote(200 - i * 30, now + i * 0.1, 0.15, 'sawtooth', sfxGain);
            }
            break;
        case 'gameover':
            playNote(400, now, 0.15, 'sawtooth', sfxGain);
            playNote(300, now + 0.15, 0.15, 'sawtooth', sfxGain);
            playNote(200, now + 0.3, 0.15, 'sawtooth', sfxGain);
            playNote(100, now + 0.45, 0.4, 'sawtooth', sfxGain);
            break;
        case 'levelup':
            for (let i = 0; i < 8; i++) playNote(400 + i * 80, now + i * 0.06, 0.1, 'square', sfxGain);
            break;
        case 'victory':
            for (let i = 0; i < 12; i++) playNote(300 + i * 60, now + i * 0.08, 0.12, 'square', sfxGain);
            break;
        case 'eaglehit':
            playNote(100, now, 0.2, 'sawtooth', sfxGain);
            playNote(80, now + 0.15, 0.25, 'sawtooth', sfxGain);
            playNote(50, now + 0.3, 0.4, 'sawtooth', sfxGain);
            break;
    }
}

function stopMusic() {
    musicPlaying = false;
    if (currentMusicInterval) { clearInterval(currentMusicInterval); currentMusicInterval = null; }
}

function playBattleMusic() {
    if (!audioCtx) return;
    stopMusic();
    musicPlaying = true;
    // Military march chiptune loop
    const melody = [
        262, 0, 330, 0, 392, 392, 330, 0, 262, 0, 294, 0, 330, 0, 262, 0,
        220, 0, 262, 0, 330, 330, 262, 0, 220, 0, 247, 0, 262, 0, 0, 0,
        294, 0, 349, 0, 440, 440, 349, 0, 294, 0, 330, 0, 349, 0, 294, 0,
        262, 0, 330, 0, 392, 0, 330, 0, 262, 0, 0, 0, 0, 0, 0, 0
    ];
    let i = 0;
    currentMusicInterval = setInterval(() => {
        if (!musicPlaying || musicMuted) return;
        if (melody[i] > 0) playNote(melody[i], audioCtx.currentTime, 0.12, 'square', musicGain);
        i = (i + 1) % melody.length;
    }, 140);
}

// ============================================================
// SECTION 3: GAME STATE
// ============================================================
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let gameState = 'MENU'; // MENU, PLAYING, PAUSED, LEVEL_COMPLETE, GAME_OVER, VICTORY
let grid = []; // 2D array [row][col] of tile types
let player = null;
let enemies = [];
let bullets = [];
let explosions = [];
let powerups = [];
let particles = [];

let score = 0;
let lives = 3;
let currentLevel = 0;
let enemiesRemaining = 0;
let enemiesSpawned = 0;
let totalEnemiesThisLevel = 0;
let spawnTimer = 0;
let spawnPoints = [];
let eagleAlive = true;
let frameCount = 0;

let highScore = parseInt(localStorage.getItem('tanksHighScore')) || 0;
let playerGunLevel = 0; // 0=normal, 1=faster, 2=double shot
let playerShield = 0; // frames remaining
let playerSpeed = 0; // frames remaining for speed boost

// Input state
const keys = {};

// ============================================================
// SECTION 4: LEVEL DATA
// ============================================================
// Legend: 0=empty, 1=brick, 2=steel, 3=water, 4=trees, 5=eagle
// Each level is a 20x40 grid. Eagle is always at bottom-center.
// Spawn points: top-left (col 0), top-center (col 19), top-right (col 39)

function generateLevel(levelNum) {
    // Create empty grid
    const g = [];
    for (let r = 0; r < GRID_H; r++) {
        g[r] = [];
        for (let c = 0; c < GRID_W; c++) {
            g[r][c] = TILE.EMPTY;
        }
    }

    // Place eagle at bottom center (rows 18-19, cols 19-20)
    g[18][19] = TILE.EAGLE;
    g[18][20] = TILE.EAGLE;
    g[19][19] = TILE.EAGLE;
    g[19][20] = TILE.EAGLE;

    // Protect eagle with bricks
    g[17][18] = TILE.BRICK; g[17][19] = TILE.BRICK; g[17][20] = TILE.BRICK; g[17][21] = TILE.BRICK;
    g[18][18] = TILE.BRICK; g[19][18] = TILE.BRICK;
    g[18][21] = TILE.BRICK; g[19][21] = TILE.BRICK;

    // Level-specific layouts
    const seed = levelNum;
    const brickDensity = 0.08 + levelNum * 0.01;
    const steelDensity = 0.01 + levelNum * 0.005;
    const waterDensity = levelNum > 3 ? 0.01 + (levelNum - 3) * 0.003 : 0;
    const treeDensity = levelNum > 1 ? 0.02 + levelNum * 0.003 : 0;

    // Pseudo-random based on level
    function seededRand(x, y) {
        let h = seed * 374761 + x * 668265 + y * 550029;
        h = ((h >> 16) ^ h) * 45679;
        h = ((h >> 16) ^ h) * 45679;
        h = (h >> 16) ^ h;
        return (h & 0xFFFF) / 0xFFFF;
    }

    for (let r = 2; r < GRID_H - 2; r++) {
        for (let c = 1; c < GRID_W - 1; c++) {
            // Skip eagle area
            if (r >= 17 && r <= 19 && c >= 18 && c <= 21) continue;
            // Skip spawn areas (top corners and center)
            if (r < 3 && (c < 3 || (c > 18 && c < 22) || c > 37)) continue;
            // Skip player spawn area (bottom-left)
            if (r > 16 && c < 4) continue;

            const rnd = seededRand(r, c);

            if (rnd < steelDensity) {
                g[r][c] = TILE.STEEL;
            } else if (rnd < steelDensity + brickDensity) {
                g[r][c] = TILE.BRICK;
            } else if (rnd < steelDensity + brickDensity + waterDensity) {
                g[r][c] = TILE.WATER;
            } else if (rnd < steelDensity + brickDensity + waterDensity + treeDensity) {
                g[r][c] = TILE.TREES;
            }
        }
    }

    // Add structured patterns based on level
    addLevelPatterns(g, levelNum);

    return g;
}

function addLevelPatterns(g, lvl) {
    // Add symmetrical brick formations for visual interest
    const patterns = [
        // Horizontal walls
        () => {
            const row = 5 + (lvl % 6);
            for (let c = 5; c < 15; c++) { if (g[row][c] === TILE.EMPTY) g[row][c] = TILE.BRICK; }
            for (let c = 25; c < 35; c++) { if (g[row][c] === TILE.EMPTY) g[row][c] = TILE.BRICK; }
        },
        // Vertical walls
        () => {
            const col1 = 10; const col2 = 30;
            for (let r = 4; r < 12; r++) {
                if (g[r][col1] === TILE.EMPTY) g[r][col1] = TILE.BRICK;
                if (g[r][col2] === TILE.EMPTY) g[r][col2] = TILE.BRICK;
            }
        },
        // Steel cross in center
        () => {
            if (lvl > 4) {
                for (let i = -2; i <= 2; i++) {
                    const r = 10; const c = 20;
                    if (r + i >= 0 && r + i < GRID_H && g[r + i][c] === TILE.EMPTY) g[r + i][c] = TILE.STEEL;
                    if (c + i >= 0 && c + i < GRID_W && g[r][c + i] === TILE.EMPTY) g[r][c + i] = TILE.STEEL;
                }
            }
        },
        // Water moats
        () => {
            if (lvl > 6) {
                for (let c = 8; c < 16; c++) { if (g[10][c] === TILE.EMPTY) g[10][c] = TILE.WATER; }
                for (let c = 24; c < 32; c++) { if (g[10][c] === TILE.EMPTY) g[10][c] = TILE.WATER; }
            }
        },
        // Tree cover
        () => {
            if (lvl > 2) {
                for (let r = 6; r < 9; r++) {
                    for (let c = 16; c < 24; c++) {
                        if (g[r][c] === TILE.EMPTY) g[r][c] = TILE.TREES;
                    }
                }
            }
        }
    ];

    // Apply patterns based on level number
    patterns[lvl % patterns.length]();
    if (lvl > 5) patterns[(lvl + 2) % patterns.length]();
    if (lvl > 10) patterns[(lvl + 4) % patterns.length]();
}

// Level enemy configurations
function getLevelConfig(lvl) {
    const baseEnemies = 4 + Math.floor(lvl * 0.8);
    const totalEnemies = Math.min(baseEnemies, 20);

    // Enemy type distribution changes with level
    let types;
    if (lvl < 3) {
        types = [ENEMY_TYPE.BASIC];
    } else if (lvl < 6) {
        types = [ENEMY_TYPE.BASIC, ENEMY_TYPE.FAST];
    } else if (lvl < 10) {
        types = [ENEMY_TYPE.BASIC, ENEMY_TYPE.FAST, ENEMY_TYPE.POWER];
    } else {
        types = [ENEMY_TYPE.BASIC, ENEMY_TYPE.FAST, ENEMY_TYPE.POWER, ENEMY_TYPE.ARMOR];
    }

    return { totalEnemies, types };
}

// ============================================================
// SECTION 5: RENDERING
// ============================================================

function drawTile(r, c, type) {
    const x = c * CELL;
    const y = r * CELL;

    switch (type) {
        case TILE.BRICK:
            ctx.fillStyle = COLORS.BRICK;
            ctx.fillRect(x, y, CELL, CELL);
            // Brick pattern
            ctx.fillStyle = COLORS.BRICK_DARK;
            ctx.fillRect(x, y, CELL / 2, CELL / 2);
            ctx.fillRect(x + CELL / 2, y + CELL / 2, CELL / 2, CELL / 2);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x, y, CELL, CELL);
            break;

        case TILE.STEEL:
            ctx.fillStyle = COLORS.STEEL;
            ctx.fillRect(x, y, CELL, CELL);
            ctx.fillStyle = COLORS.STEEL_LIGHT;
            ctx.fillRect(x + 2, y + 2, CELL - 6, CELL - 6);
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, CELL, CELL);
            break;

        case TILE.WATER:
            ctx.fillStyle = COLORS.WATER_DARK;
            ctx.fillRect(x, y, CELL, CELL);
            // Animated waves
            ctx.fillStyle = COLORS.WATER;
            const waveOffset = Math.sin(frameCount * 0.05 + c * 0.5) * 3;
            ctx.fillRect(x, y + 4 + waveOffset, CELL, 6);
            ctx.fillRect(x, y + 14 + waveOffset * 0.7, CELL, 4);
            break;

        case TILE.TREES:
            // Trees are drawn on top of tanks (visual cover)
            ctx.fillStyle = COLORS.TREES;
            ctx.fillRect(x, y, CELL, CELL);
            ctx.fillStyle = COLORS.TREES_DARK;
            ctx.fillRect(x + 3, y + 3, 6, 6);
            ctx.fillRect(x + 11, y + 8, 6, 6);
            ctx.fillRect(x + 5, y + 12, 7, 6);
            break;

        case TILE.EAGLE:
            ctx.fillStyle = COLORS.EAGLE;
            ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
            // Eagle symbol
            ctx.fillStyle = '#B8860B';
            ctx.fillRect(x + 5, y + 4, 10, 4);
            ctx.fillRect(x + 7, y + 8, 6, 6);
            ctx.fillRect(x + 4, y + 6, 4, 3);
            ctx.fillRect(x + 12, y + 6, 4, 3);
            break;

        case TILE.EAGLE_DEAD:
            ctx.fillStyle = COLORS.EAGLE_DEAD;
            ctx.fillRect(x, y, CELL, CELL);
            ctx.fillStyle = '#222';
            ctx.fillRect(x + 3, y + 3, CELL - 6, CELL - 6);
            break;
    }
}

function drawTank(tank) {
    const x = tank.x;
    const y = tank.y;
    const size = CELL;
    const half = size / 2;

    ctx.save();
    ctx.translate(x + half, y + half);
    ctx.rotate(tank.dir * Math.PI / 2);

    // Tank body
    const bodyColor = tank.isPlayer ? COLORS.PLAYER : getEnemyColor(tank);
    const darkColor = tank.isPlayer ? COLORS.PLAYER_DARK : '#333';

    // Draw shield glow if active
    if (tank.shield > 0) {
        ctx.strokeStyle = `rgba(0, 200, 255, ${0.5 + Math.sin(frameCount * 0.15) * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, half + 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Treads
    ctx.fillStyle = '#333';
    ctx.fillRect(-half, -half, 4, size);
    ctx.fillRect(half - 4, -half, 4, size);

    // Body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-half + 4, -half + 2, size - 8, size - 4);

    // Turret
    ctx.fillStyle = darkColor;
    ctx.fillRect(-3, -half - 2, 6, half + 2);

    // Armor flash for armored enemies
    if (tank.type === ENEMY_TYPE.ARMOR && tank.hp > 1) {
        if (frameCount % 20 < 10) {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(-half + 4, -half + 2, size - 8, size - 4);
        }
    }

    // Star indicator for upgraded player gun
    if (tank.isPlayer && playerGunLevel > 0) {
        ctx.fillStyle = '#FF0';
        const starSize = 3;
        ctx.fillRect(-starSize / 2, 2, starSize, starSize);
    }

    ctx.restore();
}

function getEnemyColor(tank) {
    switch (tank.type) {
        case ENEMY_TYPE.BASIC: return COLORS.ENEMY_BASIC;
        case ENEMY_TYPE.FAST: return COLORS.ENEMY_FAST;
        case ENEMY_TYPE.POWER: return COLORS.ENEMY_POWER;
        case ENEMY_TYPE.ARMOR: return COLORS.ENEMY_ARMOR;
        default: return COLORS.ENEMY_BASIC;
    }
}

function drawBullet(bullet) {
    ctx.fillStyle = COLORS.BULLET;
    ctx.fillRect(bullet.x - 2, bullet.y - 2, 4, 4);
    // Trail
    ctx.fillStyle = 'rgba(255, 200, 50, 0.5)';
    ctx.fillRect(
        bullet.x - 2 - DX[bullet.dir] * 4,
        bullet.y - 2 - DY[bullet.dir] * 4,
        4, 4
    );
}

function drawExplosion(exp) {
    const progress = exp.timer / exp.maxTimer;
    const size = CELL * (1 + (1 - progress));
    const alpha = progress;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Outer ring
    ctx.fillStyle = '#FF4400';
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, size, 0, Math.PI * 2);
    ctx.fill();

    // Inner ring
    ctx.fillStyle = '#FFAA00';
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, size * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawPowerup(pu) {
    const x = pu.col * CELL;
    const y = pu.row * CELL;
    const pulse = Math.sin(frameCount * 0.1) * 2;

    ctx.save();

    // Glowing background
    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(frameCount * 0.08) * 0.15})`;
    ctx.fillRect(x - pulse, y - pulse, CELL + pulse * 2, CELL + pulse * 2);

    // Icon based on type
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    switch (pu.type) {
        case POWERUP.SHIELD:
            ctx.fillStyle = '#00AAFF';
            ctx.fillText('S', x + CELL / 2, y + CELL / 2);
            break;
        case POWERUP.SPEED:
            ctx.fillStyle = '#FFAA00';
            ctx.fillText('F', x + CELL / 2, y + CELL / 2);
            break;
        case POWERUP.LIFE:
            ctx.fillStyle = '#FF4444';
            ctx.fillText('+', x + CELL / 2, y + CELL / 2);
            break;
        case POWERUP.BOMB:
            ctx.fillStyle = '#FF0000';
            ctx.fillText('B', x + CELL / 2, y + CELL / 2);
            break;
        case POWERUP.STAR:
            ctx.fillStyle = '#FFD700';
            ctx.fillText('*', x + CELL / 2, y + CELL / 2);
            break;
    }

    ctx.restore();
}

function drawParticle(p) {
    ctx.fillStyle = `rgba(${p.color}, ${p.life})`;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
}

function render() {
    // Clear canvas
    ctx.fillStyle = COLORS.GROUND;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw grid tiles (except trees - drawn last for cover effect)
    for (let r = 0; r < GRID_H; r++) {
        for (let c = 0; c < GRID_W; c++) {
            if (grid[r][c] !== TILE.EMPTY && grid[r][c] !== TILE.TREES) {
                drawTile(r, c, grid[r][c]);
            }
        }
    }

    // Draw powerups
    powerups.forEach(pu => drawPowerup(pu));

    // Draw bullets
    bullets.forEach(b => drawBullet(b));

    // Draw player
    if (player && player.alive) {
        drawTank(player);
    }

    // Draw enemies
    enemies.forEach(e => {
        if (e.alive) drawTank(e);
    });

    // Draw trees on top (visual cover)
    for (let r = 0; r < GRID_H; r++) {
        for (let c = 0; c < GRID_W; c++) {
            if (grid[r][c] === TILE.TREES) {
                drawTile(r, c, TILE.TREES);
            }
        }
    }

    // Draw explosions on top
    explosions.forEach(exp => drawExplosion(exp));

    // Draw particles
    particles.forEach(p => drawParticle(p));

    // Update HUD
    document.getElementById('ui-score').textContent = 'SCORE ' + score;
    document.getElementById('ui-level').textContent = 'LEVEL ' + (currentLevel + 1);
    document.getElementById('ui-lives').textContent = 'LIVES ' + lives;
    document.getElementById('ui-enemies').textContent = 'ENEMIES ' + enemiesRemaining;
    document.getElementById('ui-highscore').textContent = 'HI ' + highScore;
}

// ============================================================
// SECTION 6: GAME UPDATE
// ============================================================

function update() {
    if (gameState !== 'PLAYING') return;

    frameCount++;

    updatePlayer();
    updateEnemies();
    updateBullets();
    updateExplosions();
    updateParticles();
    updatePowerups();
    spawnEnemies();

    // Decrease player power-up timers
    if (playerShield > 0) playerShield--;
    if (playerSpeed > 0) playerSpeed--;

    // Check level complete
    if (enemiesRemaining <= 0 && enemies.filter(e => e.alive).length === 0) {
        levelComplete();
    }
}

function updatePlayer() {
    if (!player || !player.alive) return;

    // Shield timer
    if (player.shield > 0) player.shield--;

    const speed = playerSpeed > 0 ? PLAYER_SPEED * 1.5 : PLAYER_SPEED;
    let moved = false;
    let newDir = player.dir;

    if (keys['ArrowUp'] || keys['KeyW']) { newDir = DIR.UP; moved = true; }
    else if (keys['ArrowDown'] || keys['KeyS']) { newDir = DIR.DOWN; moved = true; }
    else if (keys['ArrowLeft'] || keys['KeyA']) { newDir = DIR.LEFT; moved = true; }
    else if (keys['ArrowRight'] || keys['KeyD']) { newDir = DIR.RIGHT; moved = true; }

    if (moved) {
        player.dir = newDir;
        const nx = player.x + DX[newDir] * speed;
        const ny = player.y + DY[newDir] * speed;

        if (canMoveTo(nx, ny, CELL)) {
            player.x = nx;
            player.y = ny;
        }
    }

    // Fire
    if (keys['Space']) {
        firePlayerBullet();
    }
}

function canMoveTo(x, y, size) {
    // Check canvas bounds
    if (x < 0 || y < 0 || x + size > CANVAS_W || y + size > CANVAS_H) return false;

    // Check grid tiles at all four corners
    const margin = 2;
    const corners = [
        { r: Math.floor((y + margin) / CELL), c: Math.floor((x + margin) / CELL) },
        { r: Math.floor((y + margin) / CELL), c: Math.floor((x + size - margin - 1) / CELL) },
        { r: Math.floor((y + size - margin - 1) / CELL), c: Math.floor((x + margin) / CELL) },
        { r: Math.floor((y + size - margin - 1) / CELL), c: Math.floor((x + size - margin - 1) / CELL) }
    ];

    for (const corner of corners) {
        if (corner.r < 0 || corner.r >= GRID_H || corner.c < 0 || corner.c >= GRID_W) return false;
        const tile = grid[corner.r][corner.c];
        if (tile === TILE.BRICK || tile === TILE.STEEL || tile === TILE.WATER || tile === TILE.EAGLE) return false;
    }

    return true;
}

function firePlayerBullet() {
    // Cooldown check
    const maxBullets = playerGunLevel >= 2 ? 2 : 1;
    const playerBullets = bullets.filter(b => b.owner === 'player');
    if (playerBullets.length >= maxBullets) return;

    // Fire cooldown
    if (player.fireCooldown > 0) return;
    player.fireCooldown = playerGunLevel >= 1 ? 8 : 15;

    const bx = player.x + CELL / 2 + DX[player.dir] * CELL / 2;
    const by = player.y + CELL / 2 + DY[player.dir] * CELL / 2;

    bullets.push({
        x: bx, y: by,
        dir: player.dir,
        speed: playerGunLevel >= 1 ? BULLET_SPEED * 1.5 : BULLET_SPEED,
        owner: 'player',
        power: playerGunLevel >= 2 ? 2 : 1
    });

    playSFX('fire');
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += DX[b.dir] * b.speed;
        b.y += DY[b.dir] * b.speed;

        // Out of bounds
        if (b.x < 0 || b.x > CANVAS_W || b.y < 0 || b.y > CANVAS_H) {
            bullets.splice(i, 1);
            continue;
        }

        // Grid collision
        const gr = Math.floor(b.y / CELL);
        const gc = Math.floor(b.x / CELL);

        if (gr >= 0 && gr < GRID_H && gc >= 0 && gc < GRID_W) {
            const tile = grid[gr][gc];

            if (tile === TILE.BRICK) {
                grid[gr][gc] = TILE.EMPTY;
                spawnSmallExplosion(gc * CELL + CELL / 2, gr * CELL + CELL / 2);
                playSFX('hit');
                bullets.splice(i, 1);
                continue;
            }

            if (tile === TILE.STEEL) {
                if (b.owner === 'player' && b.power >= 2) {
                    grid[gr][gc] = TILE.EMPTY;
                    spawnSmallExplosion(gc * CELL + CELL / 2, gr * CELL + CELL / 2);
                    playSFX('hit');
                } else {
                    playSFX('steel');
                }
                bullets.splice(i, 1);
                continue;
            }

            if (tile === TILE.EAGLE || tile === TILE.EAGLE_DEAD) {
                if (tile === TILE.EAGLE) {
                    // Eagle destroyed!
                    destroyEagle();
                }
                bullets.splice(i, 1);
                continue;
            }
        }

        // Bullet-tank collision
        if (b.owner === 'player') {
            // Check enemy hits
            for (let j = enemies.length - 1; j >= 0; j--) {
                const e = enemies[j];
                if (!e.alive) continue;
                if (bulletHitsTank(b, e)) {
                    e.hp -= b.power || 1;
                    if (e.hp <= 0) {
                        destroyEnemy(e, j);
                    } else {
                        playSFX('steel');
                    }
                    bullets.splice(i, 1);
                    break;
                }
            }
        } else {
            // Enemy bullet hits player
            if (player && player.alive && bulletHitsTank(b, player)) {
                if (player.shield <= 0 && playerShield <= 0) {
                    destroyPlayer();
                }
                bullets.splice(i, 1);
                continue;
            }

            // Enemy bullet hits other enemy bullets (cancel out)
            for (let j = i - 1; j >= 0; j--) {
                const other = bullets[j];
                if (other.owner !== b.owner && Math.abs(b.x - other.x) < 6 && Math.abs(b.y - other.y) < 6) {
                    bullets.splice(i, 1);
                    bullets.splice(j, 1);
                    break;
                }
            }
        }
    }

    // Update player fire cooldown
    if (player && player.fireCooldown > 0) player.fireCooldown--;
}

function bulletHitsTank(bullet, tank) {
    return bullet.x >= tank.x && bullet.x <= tank.x + CELL &&
           bullet.y >= tank.y && bullet.y <= tank.y + CELL;
}

function destroyEnemy(enemy, index) {
    enemy.alive = false;
    enemiesRemaining--;
    spawnExplosion(enemy.x + CELL / 2, enemy.y + CELL / 2);
    playSFX('explode');

    // Score based on type
    const pts = [100, 200, 300, 400][enemy.type] || 100;
    score += pts;

    // Chance to spawn powerup (20%)
    if (Math.random() < 0.2) {
        spawnPowerup();
    }

    spawnParticles(enemy.x + CELL / 2, enemy.y + CELL / 2, getEnemyColor(enemy));
}

function destroyPlayer() {
    spawnExplosion(player.x + CELL / 2, player.y + CELL / 2);
    playSFX('explode');
    player.alive = false;
    playerGunLevel = 0;

    lives--;
    if (lives <= 0) {
        setTimeout(() => gameOver('Your tank was destroyed!'), 1000);
    } else {
        // Respawn after delay
        setTimeout(() => {
            if (gameState === 'PLAYING') {
                respawnPlayer();
            }
        }, 1500);
    }
}

function respawnPlayer() {
    player.x = 8 * CELL;
    player.y = (GRID_H - 2) * CELL;
    player.dir = DIR.UP;
    player.alive = true;
    player.shield = SHIELD_START_DURATION;
    player.fireCooldown = 0;
}

function destroyEagle() {
    eagleAlive = false;
    playSFX('eaglehit');

    // Mark all eagle tiles as dead
    for (let r = 0; r < GRID_H; r++) {
        for (let c = 0; c < GRID_W; c++) {
            if (grid[r][c] === TILE.EAGLE) {
                grid[r][c] = TILE.EAGLE_DEAD;
                spawnExplosion(c * CELL + CELL / 2, r * CELL + CELL / 2);
            }
        }
    }

    setTimeout(() => gameOver('Your base was destroyed!'), 1500);
}

// ============================================================
// SECTION 7: ENEMY AI
// ============================================================

function updateEnemies() {
    for (const e of enemies) {
        if (!e.alive) continue;

        e.moveTimer++;
        e.fireTimer++;

        // Movement AI
        if (e.moveTimer >= e.turnInterval) {
            e.moveTimer = 0;

            // Smart direction choice
            if (Math.random() < 0.3) {
                // Random direction
                e.dir = Math.floor(Math.random() * 4);
            } else {
                // Move toward player or eagle
                const target = Math.random() < 0.5 && player && player.alive
                    ? { x: player.x, y: player.y }
                    : { x: 19 * CELL, y: 18 * CELL }; // Eagle position

                const dx = target.x - e.x;
                const dy = target.y - e.y;

                if (Math.abs(dx) > Math.abs(dy)) {
                    e.dir = dx > 0 ? DIR.RIGHT : DIR.LEFT;
                } else {
                    e.dir = dy > 0 ? DIR.DOWN : DIR.UP;
                }
            }
        }

        // Move
        const speed = e.type === ENEMY_TYPE.FAST ? ENEMY_BASE_SPEED * 1.8 : ENEMY_BASE_SPEED;
        const nx = e.x + DX[e.dir] * speed;
        const ny = e.y + DY[e.dir] * speed;

        if (canMoveToEnemy(nx, ny, CELL, e)) {
            e.x = nx;
            e.y = ny;
        } else {
            // Hit wall, change direction
            e.dir = Math.floor(Math.random() * 4);
        }

        // Fire
        const fireInterval = e.type === ENEMY_TYPE.POWER ? ENEMY_FIRE_INTERVAL * 0.6 : ENEMY_FIRE_INTERVAL;
        if (e.fireTimer >= fireInterval) {
            e.fireTimer = 0;
            fireEnemyBullet(e);
        }
    }
}

function canMoveToEnemy(x, y, size, self) {
    if (x < 0 || y < 0 || x + size > CANVAS_W || y + size > CANVAS_H) return false;

    const margin = 2;
    const corners = [
        { r: Math.floor((y + margin) / CELL), c: Math.floor((x + margin) / CELL) },
        { r: Math.floor((y + margin) / CELL), c: Math.floor((x + size - margin - 1) / CELL) },
        { r: Math.floor((y + size - margin - 1) / CELL), c: Math.floor((x + margin) / CELL) },
        { r: Math.floor((y + size - margin - 1) / CELL), c: Math.floor((x + size - margin - 1) / CELL) }
    ];

    for (const corner of corners) {
        if (corner.r < 0 || corner.r >= GRID_H || corner.c < 0 || corner.c >= GRID_W) return false;
        const tile = grid[corner.r][corner.c];
        if (tile === TILE.BRICK || tile === TILE.STEEL || tile === TILE.WATER || tile === TILE.EAGLE) return false;
    }

    // Don't overlap other enemies
    for (const other of enemies) {
        if (other === self || !other.alive) continue;
        if (Math.abs(x - other.x) < CELL - 2 && Math.abs(y - other.y) < CELL - 2) return false;
    }

    // Don't overlap player
    if (player && player.alive) {
        if (Math.abs(x - player.x) < CELL - 2 && Math.abs(y - player.y) < CELL - 2) return false;
    }

    return true;
}

function fireEnemyBullet(enemy) {
    // Only 1 bullet per enemy at a time
    const eBullets = bullets.filter(b => b.ownerId === enemy.id);
    if (eBullets.length >= 1) return;

    const bx = enemy.x + CELL / 2 + DX[enemy.dir] * CELL / 2;
    const by = enemy.y + CELL / 2 + DY[enemy.dir] * CELL / 2;

    bullets.push({
        x: bx, y: by,
        dir: enemy.dir,
        speed: BULLET_SPEED * 0.8,
        owner: 'enemy',
        ownerId: enemy.id,
        power: 1
    });
}

function spawnEnemies() {
    if (enemiesSpawned >= totalEnemiesThisLevel) return;

    spawnTimer++;
    const interval = Math.max(ENEMY_SPAWN_INTERVAL - currentLevel * 5, 80);
    if (spawnTimer < interval) return;
    spawnTimer = 0;

    // Max 4 enemies alive at once (6 in later levels)
    const maxAlive = currentLevel >= 10 ? 6 : 4;
    if (enemies.filter(e => e.alive).length >= maxAlive) return;

    // Pick spawn point
    const sp = spawnPoints[enemiesSpawned % spawnPoints.length];

    // Check if spawn point is clear
    const blocked = enemies.some(e => e.alive && Math.abs(e.x - sp.x) < CELL * 2 && Math.abs(e.y - sp.y) < CELL * 2);
    if (blocked) return;
    if (player && Math.abs(player.x - sp.x) < CELL * 2 && Math.abs(player.y - sp.y) < CELL * 2) return;

    const config = getLevelConfig(currentLevel);
    const type = config.types[enemiesSpawned % config.types.length];

    const enemy = {
        id: 'enemy_' + Date.now() + '_' + enemiesSpawned,
        x: sp.x,
        y: sp.y,
        dir: DIR.DOWN,
        type: type,
        hp: type === ENEMY_TYPE.ARMOR ? 4 : 1,
        alive: true,
        moveTimer: 0,
        fireTimer: 0,
        turnInterval: type === ENEMY_TYPE.FAST ? ENEMY_TURN_INTERVAL * 0.6 : ENEMY_TURN_INTERVAL,
        isPlayer: false
    };

    enemies.push(enemy);
    enemiesSpawned++;

    // Spawn flash
    spawnSmallExplosion(sp.x + CELL / 2, sp.y + CELL / 2);
}

// ============================================================
// SECTION 8: EFFECTS & POWER-UPS
// ============================================================

function spawnExplosion(x, y) {
    explosions.push({ x, y, timer: 20, maxTimer: 20 });
}

function spawnSmallExplosion(x, y) {
    explosions.push({ x, y, timer: 10, maxTimer: 10 });
}

function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].timer--;
        if (explosions[i].timer <= 0) {
            explosions.splice(i, 1);
        }
    }
}

function spawnParticles(x, y, color) {
    const rgb = hexToRGB(color);
    for (let i = 0; i < 8; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            size: 2 + Math.random() * 3,
            life: 1,
            decay: 0.03 + Math.random() * 0.03,
            color: rgb
        });
    }
}

function hexToRGB(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function spawnPowerup() {
    // Find random empty tile
    let attempts = 0;
    while (attempts < 50) {
        const r = 2 + Math.floor(Math.random() * (GRID_H - 4));
        const c = 2 + Math.floor(Math.random() * (GRID_W - 4));
        if (grid[r][c] === TILE.EMPTY) {
            const type = Math.floor(Math.random() * 5); // 0-4
            powerups.push({ row: r, col: c, type, timer: 600 }); // lasts 10 seconds
            return;
        }
        attempts++;
    }
}

function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        const pu = powerups[i];
        pu.timer--;
        if (pu.timer <= 0) {
            powerups.splice(i, 1);
            continue;
        }

        // Check player pickup
        if (player && player.alive) {
            const pr = Math.floor((player.y + CELL / 2) / CELL);
            const pc = Math.floor((player.x + CELL / 2) / CELL);
            if (pr === pu.row && pc === pu.col) {
                activatePowerup(pu.type);
                powerups.splice(i, 1);
            }
        }
    }
}

function activatePowerup(type) {
    switch (type) {
        case POWERUP.SHIELD:
            playerShield = POWERUP_DURATION;
            player.shield = POWERUP_DURATION;
            playSFX('powerup');
            break;
        case POWERUP.SPEED:
            playerSpeed = POWERUP_DURATION;
            playSFX('powerup');
            break;
        case POWERUP.LIFE:
            lives++;
            playSFX('life');
            break;
        case POWERUP.BOMB:
            // Destroy all visible enemies
            for (const e of enemies) {
                if (e.alive) {
                    e.alive = false;
                    enemiesRemaining--;
                    spawnExplosion(e.x + CELL / 2, e.y + CELL / 2);
                    score += [100, 200, 300, 400][e.type] || 100;
                }
            }
            playSFX('bomb');
            break;
        case POWERUP.STAR:
            playerGunLevel = Math.min(playerGunLevel + 1, 2);
            playSFX('powerup');
            break;
    }
}

// ============================================================
// SECTION 9: STATE MANAGEMENT
// ============================================================

function startGame() {
    score = 0;
    lives = 3;
    currentLevel = 0;
    playerGunLevel = 0;
    loadLevel(currentLevel);
    hideAllScreens();
    gameState = 'PLAYING';
    playBattleMusic();
}

function loadLevel(lvl) {
    grid = generateLevel(lvl);
    enemies = [];
    bullets = [];
    explosions = [];
    powerups = [];
    particles = [];
    enemiesSpawned = 0;
    spawnTimer = 0;
    eagleAlive = true;
    frameCount = 0;

    const config = getLevelConfig(lvl);
    totalEnemiesThisLevel = config.totalEnemies;
    enemiesRemaining = totalEnemiesThisLevel;

    // Spawn points
    spawnPoints = [
        { x: 0, y: 0 },
        { x: 19 * CELL, y: 0 },
        { x: (GRID_W - 1) * CELL, y: 0 }
    ];

    // Create player
    player = {
        x: 8 * CELL,
        y: (GRID_H - 2) * CELL,
        dir: DIR.UP,
        alive: true,
        shield: SHIELD_START_DURATION,
        fireCooldown: 0,
        isPlayer: true
    };

    // Clear tiles around player spawn
    for (let r = GRID_H - 3; r < GRID_H; r++) {
        for (let c = 7; c < 10; c++) {
            if (r >= 0 && r < GRID_H && c >= 0 && c < GRID_W) {
                if (grid[r][c] !== TILE.EAGLE) grid[r][c] = TILE.EMPTY;
            }
        }
    }

    // Clear tiles around enemy spawn points
    for (const sp of spawnPoints) {
        const sr = Math.floor(sp.y / CELL);
        const sc = Math.floor(sp.x / CELL);
        for (let dr = 0; dr < 2; dr++) {
            for (let dc = 0; dc < 2; dc++) {
                const r = sr + dr;
                const c = sc + dc;
                if (r >= 0 && r < GRID_H && c >= 0 && c < GRID_W) {
                    grid[r][c] = TILE.EMPTY;
                }
            }
        }
    }
}

function levelComplete() {
    gameState = 'LEVEL_COMPLETE';
    playSFX('levelup');
    stopMusic();

    const bonus = (currentLevel + 1) * 500;
    score += bonus;

    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('tanksHighScore', highScore);
    }

    document.getElementById('lc-enemies').textContent = totalEnemiesThisLevel;
    document.getElementById('lc-score').textContent = score - bonus;
    document.getElementById('lc-bonus').textContent = bonus;
    document.getElementById('lc-total').textContent = score;

    hideAllScreens();
    document.getElementById('level-complete-screen').classList.remove('hidden');
}

function nextLevel() {
    currentLevel++;
    if (currentLevel >= 20) {
        victory();
        return;
    }
    loadLevel(currentLevel);
    hideAllScreens();
    gameState = 'PLAYING';
    playBattleMusic();
}

function gameOver(reason) {
    gameState = 'GAME_OVER';
    stopMusic();
    playSFX('gameover');

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('tanksHighScore', highScore);
    }

    document.getElementById('go-reason').textContent = reason || 'Tank destroyed!';
    document.getElementById('go-score').textContent = 'Score: ' + score;
    document.getElementById('go-level').textContent = 'Reached Level ' + (currentLevel + 1);

    hideAllScreens();
    document.getElementById('game-over-screen').classList.remove('hidden');
}

function victory() {
    gameState = 'VICTORY';
    stopMusic();
    playSFX('victory');

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('tanksHighScore', highScore);
    }

    document.getElementById('victory-score').textContent = 'Final Score: ' + score;

    hideAllScreens();
    document.getElementById('victory-screen').classList.remove('hidden');
}

function showMenu() {
    gameState = 'MENU';
    stopMusic();
    hideAllScreens();
    document.getElementById('start-screen').classList.remove('hidden');
}

function togglePause() {
    if (gameState === 'PLAYING') {
        gameState = 'PAUSED';
        stopMusic();
        document.getElementById('pause-screen').classList.remove('hidden');
    } else if (gameState === 'PAUSED') {
        gameState = 'PLAYING';
        document.getElementById('pause-screen').classList.add('hidden');
        playBattleMusic();
    }
}

function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
}

// ============================================================
// SECTION 10: INPUT HANDLING
// ============================================================

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    if (e.code === 'Escape') {
        if (gameState === 'PLAYING' || gameState === 'PAUSED') {
            togglePause();
        }
    }

    // Prevent scrolling with arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// ============================================================
// SECTION 11: SCREEN MANAGEMENT (Button Events)
// ============================================================

document.getElementById('start-btn').addEventListener('click', () => {
    initAudio();
    startGame();
});

document.getElementById('music-btn').addEventListener('click', () => {
    initAudio();
    musicMuted = !musicMuted;
    document.getElementById('music-btn').textContent = musicMuted ? 'MUSIC OFF' : 'MUSIC ON';
    if (musicMuted) {
        stopMusic();
    } else if (gameState === 'PLAYING') {
        playBattleMusic();
    }
});

document.getElementById('next-level-btn').addEventListener('click', () => {
    nextLevel();
});

document.getElementById('restart-btn').addEventListener('click', () => {
    startGame();
});

document.getElementById('menu-btn').addEventListener('click', () => {
    showMenu();
});

document.getElementById('play-again-btn').addEventListener('click', () => {
    startGame();
});

document.getElementById('victory-menu-btn').addEventListener('click', () => {
    showMenu();
});

document.getElementById('resume-btn').addEventListener('click', () => {
    togglePause();
});

document.getElementById('pause-menu-btn').addEventListener('click', () => {
    gameState = 'MENU';
    stopMusic();
    hideAllScreens();
    document.getElementById('start-screen').classList.remove('hidden');
});

// ============================================================
// SECTION 12: GAME LOOP
// ============================================================

function gameLoop() {
    update();
    if (gameState === 'PLAYING' || gameState === 'PAUSED') {
        render();
    }
    requestAnimationFrame(gameLoop);
}

// ============================================================
// SECTION 13: INIT
// ============================================================

function init() {
    // Load high score
    highScore = parseInt(localStorage.getItem('tanksHighScore')) || 0;
    document.getElementById('ui-highscore').textContent = 'HI ' + highScore;

    // Show start screen
    showMenu();

    // Start game loop
    gameLoop();
}

init();
