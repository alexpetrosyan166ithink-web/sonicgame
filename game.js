// Three.js 3D Game Setup with PS-Quality Graphics
let scene, camera, renderer, composer;
let sonicMesh, groundMesh;
let obstacles = [];
let rings = [];
let projectiles = [];
let bossProjectiles = [];
let particleSystem = [];
let speedTrail = [];

// Sonic World Elements
let springs = [];
let loops = [];
let pipes = [];
let itemBoxes = [];
let dashPanels = [];
let ramps = [];
let platforms = [];
let checkpoints = [];

// Player power-up states
let hasShield = false;
let hasSpeedBoost = false;
let speedBoostTimer = 0;
let hasInvincibility = false;
let invincibilityTimer = 0;

// Audio System
let audioContext = null;
let musicPlaying = false;
let musicGain = null;
let musicMuted = false;

// Initialize Audio Context
function initAudio() {
    if (audioContext) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = audioContext.createGain();
    musicGain.connect(audioContext.destination);
    musicGain.gain.value = 0.3;
}

// Play a note
function playNote(frequency, startTime, duration, type = 'square') {
    if (!audioContext || musicMuted) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0.3, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(musicGain);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
}

// Sonic-style background music
function playBackgroundMusic() {
    if (!audioContext || musicPlaying) return;
    musicPlaying = true;

    const tempo = 140;
    const beatDuration = 60 / tempo;

    // Classic Sonic-inspired melody (Green Hill Zone style)
    const melody = [
        // Bar 1
        { note: 659, duration: 0.5 },  // E5
        { note: 659, duration: 0.25 }, // E5
        { note: 659, duration: 0.25 }, // E5
        { note: 523, duration: 0.5 },  // C5
        { note: 659, duration: 0.5 },  // E5
        // Bar 2
        { note: 784, duration: 1 },    // G5
        { note: 392, duration: 1 },    // G4
        // Bar 3
        { note: 523, duration: 0.75 }, // C5
        { note: 392, duration: 0.5 },  // G4
        { note: 330, duration: 0.75 }, // E4
        // Bar 4
        { note: 440, duration: 0.5 },  // A4
        { note: 494, duration: 0.5 },  // B4
        { note: 466, duration: 0.25 }, // Bb4
        { note: 440, duration: 0.75 }, // A4
        // Bar 5
        { note: 392, duration: 0.33 }, // G4
        { note: 659, duration: 0.33 }, // E5
        { note: 784, duration: 0.33 }, // G5
        { note: 880, duration: 0.5 },  // A5
        { note: 698, duration: 0.25 }, // F5
        { note: 784, duration: 0.25 }, // G5
        // Bar 6
        { note: 659, duration: 0.5 },  // E5
        { note: 523, duration: 0.25 }, // C5
        { note: 587, duration: 0.25 }, // D5
        { note: 494, duration: 0.5 },  // B4
    ];

    // Bass line
    const bass = [
        { note: 131, duration: 0.5 }, // C3
        { note: 131, duration: 0.5 }, // C3
        { note: 165, duration: 0.5 }, // E3
        { note: 165, duration: 0.5 }, // E3
        { note: 196, duration: 0.5 }, // G3
        { note: 196, duration: 0.5 }, // G3
        { note: 175, duration: 0.5 }, // F3
        { note: 196, duration: 0.5 }, // G3
    ];

    function playLoop() {
        if (!musicPlaying || !audioContext) return;

        const now = audioContext.currentTime;
        let melodyTime = 0;
        let bassTime = 0;

        // Play melody
        melody.forEach(({ note, duration }) => {
            playNote(note, now + melodyTime * beatDuration, duration * beatDuration, 'square');
            melodyTime += duration;
        });

        // Play bass (loop it to match melody length)
        const totalMelodyBeats = melody.reduce((sum, n) => sum + n.duration, 0);
        while (bassTime < totalMelodyBeats) {
            bass.forEach(({ note, duration }) => {
                if (bassTime < totalMelodyBeats) {
                    playNote(note, now + bassTime * beatDuration, duration * beatDuration, 'triangle');
                    bassTime += duration;
                }
            });
        }

        // Schedule next loop
        const loopDuration = totalMelodyBeats * beatDuration * 1000;
        setTimeout(playLoop, loopDuration);
    }

    playLoop();
}

// Stop background music
function stopBackgroundMusic() {
    musicPlaying = false;
}

// Toggle music mute
function toggleMusic() {
    musicMuted = !musicMuted;
    if (musicGain) {
        musicGain.gain.value = musicMuted ? 0 : 0.3;
    }
    updateMusicButton();
}

// Update music button text
function updateMusicButton() {
    const btn = document.getElementById('music-btn');
    if (btn) {
        btn.textContent = musicMuted ? '🔇 MUSIC OFF' : '🔊 MUSIC ON';
    }
}

// Play sound effect for ring collection
function playRingSound() {
    if (!audioContext || musicMuted) return;
    const now = audioContext.currentTime;
    playNote(1319, now, 0.1, 'sine'); // E6
    playNote(1568, now + 0.05, 0.1, 'sine'); // G6
}

// Play sound effect for jump
function playJumpSound() {
    if (!audioContext || musicMuted) return;
    const now = audioContext.currentTime;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start(now);
    osc.stop(now + 0.15);
}

// Play sound effect for hit
function playHitSound() {
    if (!audioContext || musicMuted) return;
    const now = audioContext.currentTime;
    playNote(150, now, 0.2, 'sawtooth');
    playNote(100, now + 0.1, 0.2, 'sawtooth');
}

// Play sound effect for spin dash
function playSpinSound() {
    if (!audioContext || musicMuted) return;
    const now = audioContext.currentTime;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start(now);
    osc.stop(now + 0.2);
}

// Game state
let gameRunning = false;
let score = 0;
let lives = 3;
let currentLevel = 1;
let gameSpeed = 0.18;
let frameCount = 0;
let levelProgress = 0;

// Player state
const player = {
    lane: 0,
    targetX: 0,
    x: 0,
    y: 2,
    z: 0,
    velocityY: 0,
    jumpHeight: 0,
    jumping: false,
    gravity: 0.025,
    jumpPower: 0.4,
    spinning: false,
    spinDashTimer: 0,
    spinDashCooldown: 0,
    shootCooldown: 0,
    invincible: false,
    invincibleTimer: 0,
    animFrame: 0
};

let canDoubleJump = false;
let hasDoubleJumped = false;

// Boss state
let bossHealth = 50;
let bossMaxHealth = 50;
let bossY = 2;
let bossVelocityY = 0.02;
let bossAttackTimer = 0;
let bossFlash = false;
let bossMesh = null;

// Camera shake
let cameraShake = { x: 0, y: 0, intensity: 0 };

// Shop and Skins System
let coins = parseInt(localStorage.getItem('sonicCoins')) || 0;
let ownedSkins = JSON.parse(localStorage.getItem('sonicOwnedSkins')) || ['classic'];
let equippedSkin = localStorage.getItem('sonicEquippedSkin') || 'classic';
let equippedWeapon = localStorage.getItem('sonicEquippedWeapon') || 'ring';

const skins = {
    classic: { name: 'Classic Sonic', price: 0, color: 0x0066FF, power: 'none' },
    speed: { name: 'Speed Sonic', price: 100, color: 0xFF0000, power: 'speed' },
    jumper: { name: 'Sky Sonic', price: 150, color: 0xFFA500, power: 'doublejump' },
    tank: { name: 'Tank Sonic', price: 200, color: 0x228B22, power: 'extralife' },
    gunner: { name: 'Gunner Sonic', price: 180, color: 0x6B46C1, power: 'rapidfire' },
    ultimate: { name: 'Ultimate Sonic', price: 500, color: 0xFFD700, power: 'all' }
};

// Weapons System - All FREE!
const weapons = {
    ring: {
        name: 'Ring Shot',
        color: 0xFFD700,
        damage: 5,
        speed: 0.5,
        cooldown: 20,
        size: 0.18,
        description: 'Classic golden ring projectile'
    },
    fireball: {
        name: 'Fire Ball',
        color: 0xFF4500,
        damage: 8,
        speed: 0.4,
        cooldown: 25,
        size: 0.25,
        description: 'Burning fireball - High damage'
    },
    lightning: {
        name: 'Lightning Bolt',
        color: 0x00FFFF,
        damage: 6,
        speed: 0.8,
        cooldown: 15,
        size: 0.15,
        description: 'Super fast electric bolt'
    },
    laser: {
        name: 'Laser Beam',
        color: 0xFF00FF,
        damage: 10,
        speed: 0.3,
        cooldown: 35,
        size: 0.3,
        description: 'Powerful laser - Highest damage'
    },
    star: {
        name: 'Power Star',
        color: 0xFFFF00,
        damage: 7,
        speed: 0.6,
        cooldown: 18,
        size: 0.2,
        description: 'Spinning star projectile'
    },
    ice: {
        name: 'Ice Shard',
        color: 0x87CEEB,
        damage: 5,
        speed: 0.55,
        cooldown: 12,
        size: 0.18,
        description: 'Rapid fire ice shards'
    }
};

// Level data - Classic Sonic Zone Colors (15 Levels)
const levels = [
    { id: 1, name: 'Green Hill', type: 'runner', skyColor: 0x0044AA, groundColor: 0x8B4513, difficulty: 1 },
    { id: 2, name: 'Marble Zone', type: 'runner', skyColor: 0x1a1a4e, groundColor: 0x4a4a6e, difficulty: 1.2 },
    { id: 3, name: 'Boss Fight', type: 'boss', skyColor: 0x330000, groundColor: 0x8B4513, difficulty: 1 },
    { id: 4, name: 'Spring Yard', type: 'runner', skyColor: 0x000033, groundColor: 0x8B6914, difficulty: 1.4 },
    { id: 5, name: 'Labyrinth', type: 'runner', skyColor: 0x003344, groundColor: 0x2266AA, difficulty: 1.5 },
    { id: 6, name: 'Mega Boss', type: 'boss', skyColor: 0x000000, groundColor: 0x333333, difficulty: 1.3 },
    { id: 7, name: 'Star Light', type: 'runner', skyColor: 0x000022, groundColor: 0x444488, difficulty: 1.6 },
    { id: 8, name: 'Scrap Brain', type: 'runner', skyColor: 0x220000, groundColor: 0x666666, difficulty: 1.8 },
    { id: 9, name: 'Sky Sanctuary', type: 'runner', skyColor: 0x4488FF, groundColor: 0xCCCCCC, difficulty: 1.9 },
    { id: 10, name: 'Ultra Boss', type: 'boss', skyColor: 0x110022, groundColor: 0x440066, difficulty: 1.5 },
    { id: 11, name: 'Lava Reef', type: 'runner', skyColor: 0x330000, groundColor: 0x661100, difficulty: 2.0 },
    { id: 12, name: 'Ice Cap', type: 'runner', skyColor: 0x6688AA, groundColor: 0xAADDFF, difficulty: 2.2 },
    { id: 13, name: 'Sandopolis', type: 'runner', skyColor: 0xDD8800, groundColor: 0xDDCC66, difficulty: 2.4 },
    { id: 14, name: 'Death Egg', type: 'runner', skyColor: 0x000011, groundColor: 0x222244, difficulty: 2.6 },
    { id: 15, name: 'Final Boss', type: 'boss', skyColor: 0x000000, groundColor: 0x110000, difficulty: 2.0 }
];

// Initialize Three.js with Enhanced Graphics
function initThree() {
    const container = document.getElementById('game-canvas-container');

    // Scene - Classic Sonic blue sky
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0044AA); // Deep Sonic blue
    scene.fog = new THREE.FogExp2(0x0066CC, 0.008);

    // Side-scrolling camera like classic Sonic
    camera = new THREE.OrthographicCamera(-10, 10, 5, -5, 0.1, 1000);
    camera.position.set(0, 3, 15);
    camera.lookAt(0, 3, 0);

    // Renderer with enhanced settings
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(800, 400);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Post-processing disabled for better performance
    composer = null;

    // Enhanced Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(10, 20, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 512;
    mainLight.shadow.mapSize.height = 512;
    mainLight.shadow.camera.left = -20;
    mainLight.shadow.camera.right = 20;
    mainLight.shadow.camera.top = 20;
    mainLight.shadow.camera.bottom = -20;
    mainLight.shadow.bias = -0.0001;
    scene.add(mainLight);

    // Rim light for depth
    const rimLight = new THREE.DirectionalLight(0x4da6ff, 0.6);
    rimLight.position.set(-5, 5, -10);
    scene.add(rimLight);

    // Fill light
    const fillLight = new THREE.HemisphereLight(0x87CEEB, 0x228B22, 0.6);
    scene.add(fillLight);

    // Classic Sonic Green Hill Zone Ground - Side scrolling view
    const groundGeometry = new THREE.PlaneGeometry(100, 4);

    // Create classic Sonic checkered ground texture
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx2d = canvas.getContext('2d');

    // Classic brown/tan checkered pattern like Green Hill Zone
    const tileSize = 32;
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
            if ((x + y) % 2 === 0) {
                ctx2d.fillStyle = '#8B4513';
            } else {
                ctx2d.fillStyle = '#D2691E';
            }
            ctx2d.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
    }

    const groundTexture = new THREE.CanvasTexture(canvas);
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(25, 1);
    groundTexture.magFilter = THREE.NearestFilter;
    groundTexture.minFilter = THREE.NearestFilter;

    const groundMaterial = new THREE.MeshBasicMaterial({
        map: groundTexture
    });

    groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.position.set(0, -1, 0);
    scene.add(groundMesh);

    // Add grass strip on top
    createGrassStrip();

    // Lane markers not needed for side-scroll view

    // Create enhanced Sonic
    createEnhancedSonic();

    // Add environmental effects
    createEnvironment();
}

// Create grass strip on top of ground
function createGrassStrip() {
    const grassCanvas = document.createElement('canvas');
    grassCanvas.width = 64;
    grassCanvas.height = 16;
    const gCtx = grassCanvas.getContext('2d');

    // Bright green grass base
    gCtx.fillStyle = '#00AA00';
    gCtx.fillRect(0, 0, 64, 16);

    // Darker green grass blades
    gCtx.fillStyle = '#008800';
    for (let i = 0; i < 16; i++) {
        const x = i * 4;
        gCtx.fillRect(x, 0, 2, 4 + Math.random() * 4);
    }

    // Light green highlights
    gCtx.fillStyle = '#00DD00';
    for (let i = 0; i < 8; i++) {
        const x = i * 8 + 2;
        gCtx.fillRect(x, 2, 2, 4);
    }

    const grassTexture = new THREE.CanvasTexture(grassCanvas);
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.repeat.set(50, 1);
    grassTexture.magFilter = THREE.NearestFilter;

    const grassGeometry = new THREE.PlaneGeometry(100, 0.5);
    const grassMaterial = new THREE.MeshBasicMaterial({
        map: grassTexture,
        transparent: true
    });

    const grass = new THREE.Mesh(grassGeometry, grassMaterial);
    grass.position.set(0, 1.1, 0);
    scene.add(grass);
}

function createEnvironment() {
    // Classic Sonic Palm Trees
    createPalmTrees();

    // Add clouds in the sky
    createClouds();

    // Add background hills (Green Hill style)
    createBackgroundHills();
}

function createPalmTrees() {
    // Palm tree positions - background for side-scroll view
    const positions = [
        { x: -8, y: 0 }, { x: 0, y: 0 }, { x: 8, y: 0 },
        { x: -4, y: 0 }, { x: 4, y: 0 }, { x: 12, y: 0 }
    ];

    positions.forEach(pos => {
        const palmGroup = new THREE.Group();

        // Brown trunk with segments
        const trunkCanvas = document.createElement('canvas');
        trunkCanvas.width = 32;
        trunkCanvas.height = 64;
        const tCtx = trunkCanvas.getContext('2d');

        // Draw trunk segments
        for (let i = 0; i < 8; i++) {
            tCtx.fillStyle = i % 2 === 0 ? '#8B6914' : '#A0782C';
            tCtx.fillRect(0, i * 8, 32, 8);
        }

        const trunkTexture = new THREE.CanvasTexture(trunkCanvas);
        trunkTexture.magFilter = THREE.NearestFilter;

        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 4, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ map: trunkTexture });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2;
        palmGroup.add(trunk);

        // Palm leaves (classic triangular style)
        const leafMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const leafGeometry = new THREE.ConeGeometry(0.8, 2, 4);
            const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
            leaf.position.set(
                Math.cos(angle) * 0.8,
                4.2,
                Math.sin(angle) * 0.8
            );
            leaf.rotation.x = Math.PI / 4;
            leaf.rotation.y = angle;
            palmGroup.add(leaf);
        }

        palmGroup.position.set(pos.x, 0, -5);  // Behind the action
        scene.add(palmGroup);
    });
}

function createClouds() {
    // Fluffy white clouds like classic Sonic - side-scroll view
    const cloudPositions = [
        { x: -8, y: 7, z: -8 }, { x: 0, y: 8, z: -10 },
        { x: 8, y: 7.5, z: -8 }, { x: -4, y: 8.5, z: -12 },
        { x: 4, y: 7, z: -9 }, { x: 12, y: 8, z: -10 }
    ];

    cloudPositions.forEach(pos => {
        const cloudGroup = new THREE.Group();

        // Create puffy cloud from spheres
        const cloudMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 1,
            metalness: 0
        });

        const sizes = [0.8, 1.2, 1.0, 0.9, 0.7];
        const offsets = [
            { x: -1, y: 0 }, { x: 0, y: 0.3 }, { x: 1, y: 0 },
            { x: -0.5, y: -0.2 }, { x: 0.5, y: -0.2 }
        ];

        sizes.forEach((size, i) => {
            const puff = new THREE.Mesh(
                new THREE.SphereGeometry(size, 8, 8),
                cloudMaterial
            );
            puff.position.set(offsets[i].x, offsets[i].y, 0);
            cloudGroup.add(puff);
        });

        cloudGroup.position.set(pos.x, pos.y, pos.z);
        scene.add(cloudGroup);
    });
}

function createBackgroundHills() {
    // Green rolling hills in background (classic Sonic style) - side-scroll
    const hillMaterial = new THREE.MeshBasicMaterial({
        color: 0x228B22
    });

    // Background hills as simple curved shapes
    const hill1 = new THREE.Mesh(
        new THREE.CircleGeometry(8, 16, 0, Math.PI),
        hillMaterial
    );
    hill1.position.set(-6, -1, -15);
    scene.add(hill1);

    const hill2 = new THREE.Mesh(
        new THREE.CircleGeometry(10, 16, 0, Math.PI),
        hillMaterial
    );
    hill2.position.set(6, -1.5, -18);
    scene.add(hill2);

    // Far background hill (darker)
    const hill3 = new THREE.Mesh(
        new THREE.CircleGeometry(15, 16, 0, Math.PI),
        new THREE.MeshBasicMaterial({ color: 0x1a6611 })
    );
    hill3.position.set(0, -2, -20);
    scene.add(hill3);
}

// Create pixel art Sonic sprite
function createPixelSonicTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    // Transparent background
    ctx.clearRect(0, 0, 32, 32);

    const skinColor = skins[equippedSkin].color;
    const blue = '#' + skinColor.toString(16).padStart(6, '0');
    const darkBlue = '#0033AA';
    const skin = '#FFCC99';
    const white = '#FFFFFF';
    const black = '#000000';
    const red = '#DD0000';

    // Sonic pixel art (simplified 32x32)
    const pixels = [
        // Row by row pixel data (1=blue, 2=darkblue, 3=skin, 4=white, 5=black, 6=red, 0=transparent)
        '00000000111100000000000000000000',
        '00000011111111000000000000000000',
        '00000111111111100000000000000000',
        '00001111111111110000000000000000',
        '00011111111111111000000000000000',
        '00111111111111111100000000000000',
        '00111111144411111100000000000000',
        '01111111445541111110000000000000',
        '01111111445554111110000000000000',
        '01111133344554331110000000000000',
        '01111333334443333110000000000000',
        '00111333333333331100000000000000',
        '00011133333333311000000000000000',
        '00001113333331110000000000000000',
        '00000111111111100000000000000000',
        '00000011111111000000000000000000',
        '00000001111110000000000000000000',
        '00000000111100000000000000000000',
        '00000000066000000000000000000000',
        '00000000666600000000000000000000',
        '00000006666660000000000000000000',
        '00000066446640000000000000000000',
        '00000066446640000000000000000000',
        '00000006666600000000000000000000',
    ];

    const colors = { '0': null, '1': blue, '2': darkBlue, '3': skin, '4': white, '5': black, '6': red };

    pixels.forEach((row, y) => {
        for (let x = 0; x < row.length && x < 32; x++) {
            const colorKey = row[x];
            if (colors[colorKey]) {
                ctx.fillStyle = colors[colorKey];
                ctx.fillRect(x, y + 4, 1, 1);
            }
        }
    });

    return canvas;
}

// Sonic SVG as data URL for reliable loading
const SONIC_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 345.21 453.72"><defs><style>.cls-1{fill:#000}.cls-2{fill:#facca3}.cls-3{fill:#2659b5}.cls-4{fill:#cd3240}.cls-5{fill:#fff}</style></defs><g><path class="cls-1" d="m330.2,150.11c1.96-2.63,4.64-4.4,7.33-6.15,2.29-1.49,4.33-3.15,6.01-5.41,2.12-2.87,2.01-5.68.83-8.72-.34-.89-.64-1.83-1.52-2.41-4.12-2.76-8.67-2.7-13.08-1.34-5.49,1.7-9.51,5.59-12.97,10.09-4.28,5.57-7.59,11.65-9.87,18.28-.45,1.3-.97.9-1.65.43-.64-.45-1.02-1.21-1.76-1.56-7.84-3.68-16.8-.88-20.52,7.94-1.31,3.13-2.1,6.3-2.41,9.6-.26,2.77-.33,5.6.07,8.37.3,2.08.37,2.33-1.54,3.27-2.15,1.06-3.81,2.59-5.06,4.58-.88,1.39-1.29,2.99-1.92,4.49-.38.9-.88,1.62-1.65,2.29-1.41,1.22-3.03,2.21-4.13,3.79-2.8,4.01-3.21,8.49-2.79,13.16.07.77.03,1.24-.83,1.71-2.51,1.35-4.71,3.19-6.83,5.06-4.15,3.66-8.89,4.71-14.21,3.61-5.95-1.23-10.7-4.71-15.35-8.35-2.38-1.86-4.7-3.81-7.02-5.74-2.3-1.93-4.76-3.63-7.67-4.92.84-.91,1.7-1.26,2.53-1.51,5.02-1.49,9.77-3.57,14.36-6.05,5.53-2.98,10.54-6.57,14.68-11.38,3.88-4.5,7.2-9.27,9.15-14.91.78-2.27,2.32-3.61,4.49-4.65,4.26-2.04,7.73-4.93,8.98-9.84.9-3.55-.64-6.58-4.09-7.71-1.5-.49-1.5-1.91-1.24-2.86.08-.16.14-.34.23-.49,2.52-4.3,4.54-8.83,6.19-13.52,2.67-7.61,4.43-15.43,4.83-23.5.3-6.13-.08-12.23-1.66-18.2-.24-.9-.52-1.8.16-2.59,2.02-2.35,3.72-4.92,5.32-7.56,2.33-3.83,4.49-7.81,5.8-12.05,2.38-7.67,2.97-15.63,2.3-23.66-.1-1.21-.61-1.69-1.8-1.76-3.38-.22-6.76-.62-10.14-.75-3.27-.12-6.55-.06-9.83.26-3.42.34-6.81.73-10.17,1.48-4.44.99-8.7,2.55-13.04,3.85-1.45.43-2.49.01-3.38-.97-3.73-4.11-8.14-7.44-12.43-10.88-4.53-3.63-9.45-6.71-14.47-9.65-5.9-3.46-11.86-6.73-18.17-9.38-3.68-1.54-7.39-3.01-11.15-4.31-4.79-1.67-9.65-3.07-14.59-4.26-9.57-2.29-19.2-4.06-29.07-4.18-1.87-.02-3.77-.16-5.58-.6-4.39-1.04-8.84-.38-13.2-.23-3.63.12-7.33.47-11,.78-3.08.26-6.14.61-9.23.84-5.12.39-10.11,1.59-15.14,2.54-5.75,1.09-11.43,2.51-17.05,4.18-3.92,1.17-7.86,2.31-11.68,3.76-5.98,2.27-11.88,4.76-17.79,7.21-2.64,1.09-5.11,2.51-7.35,4.28-1.07.85-.97,1.21.32,1.65.91.32,1.83.61,2.75.87,7.86,2.28,15.55,5,22.88,8.68,5.55,2.78,10.75,6.08,15.39,10.2,1.85,1.64,3.96,3.05,5.56,4.91,2.36,2.75,4.86,5.4,6.92,8.4,1.82,2.64,3.8,5.19,5.09,8.17.71,1.64.6,1.88-1.12,2.45-2.4.79-4.9,1.23-7.31,2.03-8.89,2.97-17.38,6.85-25.35,11.71-8.85,5.41-16.99,11.81-24.23,19.31-3.57,3.71-7.18,7.39-10.36,11.45-2.76,3.52-5.38,7.15-7.86,10.89-3.06,4.62-5.63,9.46-7.63,14.62-.94,2.44-1.07,5.08-1.93,7.53-.17.49-.83.99-.39,1.47.47.52,1.14.01,1.69-.13,1.92-.52,3.81-1.14,5.74-1.61,9.43-2.29,18.84-4.68,28.5-5.85,3.65-.45,7.31-.97,10.98-1.08,6.66-.2,13.31-.15,19.92,1,5.5.95,10.9,2.17,15.89,4.79,1.69.89,1.74.98.33,2.35-6.25,6.07-11.39,13-15.92,20.42-5.16,8.46-9.13,17.45-11.66,27.05-2.11,8-2.63,16.2-3.01,24.4-.2,4.43.57,8.84.36,13.28-.08,1.75.22,1.84,1.83.97,3.21-1.74,6-4.05,8.88-6.25,4.34-3.3,8.88-6.28,13.59-9.03,5.41-3.16,10.95-6.04,16.77-8.28,7.61-2.93,15.39-5.32,23.49-6.68,6.83-1.14,13.65-2,20.57-1.87.51,0,1.11-.22,1.6.55-3.28,3.97-6.77,7.84-10.28,11.64-3.88,4.2-8.93,7.01-13.8,9.94-3.22,1.93-6.34,3.93-8.87,6.79-3.58,4.07-5.02,8.72-4.33,14.07.15,1.15.09,2.24-.73,3.25-3.81,4.69-6.83,9.88-9.41,15.32-3.72,7.85-5.5,16.26-7.04,24.8.26,0,.44.02.6,0,2.95-.47,5.38-2.19,7.97-3.46,3.16-1.55,6.03-1.29,8.88.6.45.3.94.56,1.37.88,2.54,1.83,5.29,2.33,8.24,1.25,1.06-.39,1.65.04,2.39.68,2.22,1.94,4.31,4.11,7.23,5.05.98.31,1.95.64,2.92.97.66.22.92.58.35,1.18-1.26,1.32-2.42,2.68-4.12,3.54-3.65,1.84-7.47,3.12-11.41,4.14-.27.07-.62-.03-.73.38-.13.47.22.65.51.86,1.06.75,2.25,1.15,3.54,1.3,5.5.64,10.72-.6,15.88-2.33,1.97-.66,2.07-.64,2.18,1.4.16,3.41,1.79,5.75,4.83,7.3,4.86,2.47,9.96,3.67,15.41,3.57,2.64-.05,2.77.01,2.43,2.55-.65,4.85-1.53,9.67-2.96,14.37-.26.85-.66,1.34-1.66,1.33-2.6-.05-5.2.04-7.81.3-3.44.34-6.88.66-10.11,1.93-2.77,1.08-5.44,2.41-7.29,4.88-2.76,3.67-3,10.57.39,14.74,1.26,1.56,1.16,3.01-.21,4.38-1.42,1.42-2.57,3.05-3.65,4.72-2.36,3.68-2.44,7.39.08,11.05.48.7.98,1.38,1.54,2.02.76.87.62,1.49-.36,2.03-.43.23-.82.52-1.22.79-5.01,3.31-9.72,6.99-14.03,11.17-3.14,3.04-5.72,6.58-8.35,10.03-4.88,6.41-9.12,13.26-12.92,20.36-3.41,6.36-6,13.08-7.93,20.04-.69,2.49-1.29,5.02-1.88,7.54-.42,1.76-.07,2.75,1.15,2.87,3.18.32,6.27,1.26,9.5,1.19,3.47-.07,6.94,0,10.41-.02.66,0,1.31-.05,1.98-.18,3.49-.69,6.98-1.42,10.5-1.87,4.63-.58,9.1-1.85,13.52-3.17,6.01-1.79,11.9-3.97,17.79-6.11,7.21-2.63,14.43-5.25,21.44-8.4,5.3-2.39,10.3-5.32,15.37-8.13,3.16-1.76,5.1-4.31,5.53-7.96.29-2.46.43-4.89.06-7.38-.69-4.66-1.22-9.33-2.92-13.78-1.31-3.42-3.09-6.55-5.15-9.55-1.51-2.21-1.55-2.26.83-3.55,1.05-.57,1.99-1.24,2.62-2.2,3.32-5.02,3.72-10.49,2.29-16.18-.23-.9-.36-1.64.22-2.38,1.55-2.01,3.13-3.99,4.66-6.01.43-.57.72-.39,1.17-.03,1.71,1.35,3.46,2.64,5.17,4,1.06.84,1.49,1.93.74,3.17-.92,1.53-1.38,3.15-1.52,4.94-.31,4.29.64,8.27,3.38,11.52,1.2,1.43,1.07,2.34.53,3.8-2.61,6.96-4.2,14.06-3.25,21.61.74,5.85,2.26,11.46,4.05,17.03.28.9.69,1.4,1.76,1.45,2.12.1,4.21.45,6.32.64,3.17.28,6.32.99,9.49,1.2,5.38.35,10.73,1.02,16.11,1.42,5.62.43,11.25.88,16.87.84,8.87-.06,17.74.32,26.62-.2,3.37-.2,6.75-.48,10.15-.56,4.94-.12,9.87-.72,14.79-1.19,3.19-.3,6.4-.33,9.57-.84,3.46-.56,6.93-.98,10.4-1.45,4.44-.62,8.79-1.61,13-3.15.7-.26,1.49-.7,1.55-1.4.05-.68-.89-.87-1.44-1.23-.1-.06-.22-.09-.34-.13-2.99-.94-6.05-1.69-9.16-2.01-4.15-.41-8.33-.69-12.51-.78-6.37-.14-12.74-.14-19.12-.07-9.42.12-18.86-.33-28.28.29-3.34.22-6.66-.46-10.01-.3-.29.01-.61.04-.97-.51,2.75-1.13,5.61-1.64,8.36-2.45,6.71-1.98,13.49-3.73,20.16-5.86,10.14-3.23,20.11-6.94,29.97-10.91,5.15-2.07,10.2-4.41,15.31-6.59,3.73-1.59,7.44-3.19,10.85-5.42,5.02-3.28,3.53-6.81.34-9.32-3.32-2.6-7.09-4.46-10.82-6.32-6.06-3.02-12.29-5.72-18.71-7.92-5.9-2.02-11.87-3.8-18-5.02-3.96-.8-7.95-1.4-11.98-1.8-4-.4-7.97-.52-11.98-.35-3.26.14-6.49.78-9.78.48-.89-.08-1.22-.27-1.32-1.24-.33-3.32-1.58-6.13-4.48-8.11-1.21-.83-2.43-1.6-3.72-2.26-1.08-.56-1.53-1.41-1.25-2.54.62-2.48.36-4.93-.07-7.38-.72-4.05-3.03-6.76-7.01-7.99-3.31-1.02-6.66-1.11-10.02-.29-2.46.6-4.9,1.28-7.36,1.89-.92.23-1.9.39-2.14-.92-.26-1.39-.99-2.59-1.4-3.92-3.02-9.84-6.34-19.58-9.78-29.27-.39-1.08-.13-1.73.69-2.34,1.36-1.01,2.71-2.02,4.05-3.04,4.41-3.32,8.65-6.79,12.04-11.23,6.58-8.62,10.18-18.19,9.72-29.16-.11-2.73-.12-5.45-.31-8.18-.12-1.86.16-1.97,1.99-1.54,5.45,1.28,10.67,3.55,16.4,3.67,3.7.08,7.22-.28,10.4-2.36,3.7-2.41,6.57-5.75,9.68-8.81.78-.77,1.6-1.49,2.49-2.12.81-.56,1.61-.61,2.32.01,2.64,2.33,5.77,3.01,9.2,3.18,3.97.19,7.39-.73,10.33-3.48,2.95-2.77,5.76-5.72,9.35-7.73.82-.46,1.77-1.24,2.01-2.06.77-2.67,2.88-2.63,4.95-2.82.42-.04.87,0,1.26-.12,3.89-1.11,7.9-1.69,11.67-3.31,5.14-2.2,9.95-4.81,13.26-9.46,2.85-4.01,4.2-8.47,3.55-13.49-.33-2.57-.26-5.17.67-7.72.54-1.51.65-3.13.38-4.81-.33-2-1.69-3.16-2.98-4.42-1.41-1.37-2.11-2.88-1.62-4.91.3-1.24.1-2.52-.35-3.75-1.04-2.85-3.22-4.63-5.69-6.11-2.7-1.61-2.85-2.17-1.03-4.75.11-.15.25-.27.36-.42Z"/><path class="cls-3" d="m102.97,250.1c-.92-.06-1.48,1.1-2.03,1.9-3.36,4.82-5.72,10.16-7.83,15.6-1.95,5.04-3.79,10.13-4.55,15.53-.08.57-.54,1.28.1,1.68.57.35,1.15-.2,1.67-.47,1.36-.68,2.66-1.48,4.04-2.1,3.12-1.38,6.13-1.44,8.77,1.12.79.76,1.6,1.5,2.62,1.94.97.42,1.94.6,2.9.06,0-.66-.45-.81-.81-1-3.14-1.6-4.64-4.38-5.37-7.63-1.31-5.78-.39-11.38,2.01-16.69,1.2-2.67,1.35-5.12,0-7.66-.44-.83-.52-2.22-1.53-2.29Z"/><path class="cls-3" d="m268.82,91.69c-.93-3.99-1.98-7.92-4.58-11.21-2.36-3-5.17-3.46-8.28-1.32-1.05.72-2.01,1.57-3.02,2.35-.75.57-1.45,1.24-2.57,1.3-.08-.99.47-1.57.91-2.2.88-1.29,2.15-2.13,3.4-3,1.61-1.11,1.64-1.24.73-2.92-2.74-5.04-6.05-9.71-9.65-14.15-6.78-8.37-13.83-16.47-22.42-23.11-5.63-4.35-11.31-8.63-17.39-12.32-9.35-5.67-19.22-10.24-29.6-13.65-9.08-2.99-18.37-5.17-27.85-6.51-4.52-.64-9.06-1.18-13.6-1.38-15.29-.69-30.52-.01-45.64,2.61-6.71,1.16-13.38,2.51-19.96,4.25-9.6,2.54-18.97,5.78-28.19,9.45-2.77,1.1-5.46,2.38-8.18,3.59-.33.15-.73.33-.73.74,0,.46.44.5.79.6,1.46.4,2.91.87,4.4,1.19,8.11,1.78,15.6,5.1,22.7,9.29,10.07,5.95,18.41,13.88,25.46,23.18,2.17,2.86,4.04,5.93,5.11,9.41.7,2.31.5,2.77-1.82,3.24-6.34,1.31-12.44,3.41-18.37,5.94-11.15,4.75-21.41,11.02-30.67,18.86-6.23,5.27-12.02,11-17.21,17.33-3.4,4.14-6.61,8.41-9.5,12.92-3.51,5.48-6.93,11.02-9.14,17.2-.19.54-.76,1.19-.2,1.66.46.39,1.17.01,1.74-.17,2.26-.72,4.49-1.54,6.77-2.19,8.2-2.33,16.5-4.15,25-5.04,12.53-1.33,25.01-1.67,37.35,1.57,3.71.98,7.44,1.95,10.81,3.83,3.14,1.75,3.12,2.07.86,4.86-5.86,7.22-11.81,14.38-16.62,22.38-4.65,7.75-8.46,15.85-10.94,24.57-1.82,6.42-2.71,12.97-3.34,19.58-.42,4.43-.54,8.87-.15,13.31.18,2.06.67,2.27,2.3.99,2.63-2.06,5.05-4.38,7.77-6.33,8.25-5.92,17.23-10.43,26.68-14.11,7.63-2.97,15.43-5.28,23.41-6.9,10.47-2.13,21.04-3.13,31.75-2.4,2.44.17,4.92.3,7.61,0Z"/><path class="cls-4" d="m333.35,377.91c-5.79-4.27-12-7.82-18.45-11.02-3.23-1.6-6.64-2.7-9.91-4.18-3.26-1.47-6.76-2.36-10.24-3.25-4.31-1.1-8.66-1.91-13.05-2.6-5.47-.85-10.94-1.72-16.5-1.56-2.41.07-3.73.99-4.54,3.22-.61,1.66-.94,3.4-1.27,5.12-.9,4.63-.91,9.31-.82,14.16-.21,7.41.5,14.92,1.63,22.38.32,2.15.69,4.33,1.49,6.39.44,1.15,1.14,1.63,2.4,1.22,1.97-.64,3.98-1.14,5.94-1.8,6.74-2.26,13.45-4.62,20.22-6.82,13.4-4.36,26.26-9.97,38.82-16.31,1.52-.77,3.01-1.61,4.35-2.67,1.29-1.03,1.3-1.28-.06-2.28Z"/><path class="cls-4" d="m128.86,393.39c-2.15-1.96-4.44-3.84-7.37-4.57-4.73-1.19-8.42.9-11.76,3.91-4.74,4.28-8.37,9.49-11.98,14.67-6.01,8.61-10.76,17.95-14.98,27.54-1.91,4.34-3.66,8.76-4.38,13.51-.2,1.33.15,1.87,1.51,2.06,2.73.38,5.47.17,7.15.27,10.4.22,19.48-1.37,28.4-3.98,8.46-2.48,16.68-5.73,25.21-7.96,1.31-.34,1.69-1.2,1.69-2.44.04-10.15-.78-20.16-4.85-29.64-2.13-4.95-4.61-9.7-8.65-13.38Z"/><path class="cls-2" d="m109.61,231c-3.21,3.48-5.11,7.5-5.26,12.69.21,2.27.63,4.92,1.64,7.41,2.73,6.67,7,12.33,11.66,17.74.88,1.02,1.71.94,2.68.24,2.46-1.76,4.36-4.04,5.92-6.61.57-.94.53-1.96.21-2.99-.61-1.99-1.44-3.87-2.53-5.64-1.27-2.08-2.33-4.26-3.14-6.56-1.94-5.49-.72-9.54,3.98-12.95,4.75-3.45,10.11-5.8,15.43-8.19,3.82-1.72,7.78-3.14,11.37-5.35,2.2-1.36,4.18-2.94,5.32-5.35,1.08-2.31.59-4.65-1.42-6.21-1.86-1.44-4.01-2.04-6.34-1.48-2.61.63-5.04,1.74-7.45,2.9-7.12,3.45-13.93,7.46-20.59,11.71-4.04,2.58-8.18,5.06-11.49,8.63Z"/><path class="cls-2" d="m249.02,166.48c-.48.06-.96.15-1.44.24-2.56.51-5.1,1.25-7.74.98-5.1-.53-7.3-3.21-5.23-8,.6-1.4,1.17-2.81,1.79-4.19.47-1.07.19-1.57-.99-1.7-5.67-.63-11.27-.58-16.76,1.33-3.8,1.32-7.42,3.06-11.2,4.41-6.13,2.19-12.47,2.84-18.87,2.26-9.37-.86-17.86-4.43-25.97-9.04-5.25-2.98-10.04-6.63-15.04-9.99-3.06-2.05-6.52-3.16-10.2-2.72-6.1.73-10.14,4.31-12.02,10.05-3.08,9.42-1.48,18.31,4.12,26.33,5.22,7.48,12.38,12.84,20.36,17.09,12.67,6.75,26.35,8.93,40.53,8.64,2.14-.06,4.25-.19,6.38-.37,7.13-.6,14.06-2.09,20.78-4.52,10.93-3.95,20.36-10.03,27.4-19.47,2.27-3.04,4.18-6.27,5.3-9.92.43-1.41.25-1.61-1.22-1.43Z"/><path class="cls-2" d="m229.92,244.73c-.1-5.84-1.51-11.53-3.82-16.97-3.97-9.34-10.18-16.5-19.67-20.51-5.31-2.24-10.88-2.94-16.6-2.58-6.24.39-12.09,2.05-17.21,5.77-7.43,5.4-11.54,12.99-13.92,21.64-.71,2.58-.69,2.74,1.74,3.73,4.85,1.98,7.1,5.93,8.25,10.65.94,3.87.65,7.73-1.09,11.39-.44.93-.62,1.73.4,2.55,6.56,5.23,9.69,12.15,9.75,20.47.01,1.34.58,1.75,1.75,2.01,3.7.81,7.44,1.11,11.22,1.01,4.82.13,9.58-.42,14.28-1.43,5.07-1.08,9.85-2.88,13.57-6.62,8.56-8.6,11.55-19.36,11.35-31.11Z"/><path class="cls-5" d="m135.76,308.88c6.37,4.65,13.31,6.1,20.86,3.25,5.81-2.19,9.87-6.49,13.16-11.52,4.67-7.13,6.74-15.07,5.95-23.53-.75-7.96-4.19-14.35-12.04-17.6-1-.41-2.03-.87-2.91-1.68.77-.29,1.26.33,1.88.25.61-.08,1.19.11,1.78.26.98.26,1.72.07,2.1-1.08,1.84-5.49,1.56-10.71-1.81-15.57-.94-1.35-2.06-2.55-3.44-3.46-2.97-1.95-6.01-1.18-9.05-.13-.75.26-.76.84-.76,1.47,0,1.64.04,3.29-.01,4.93-.09,2.48-.65,4.77-2.57,6.57-.84.78-1.54,1.71-2.29,2.58-.51.59-.79,1.14-.22,1.93,2.2,3.03,2.61,6.65,2.82,10.17.26,4.48-.44,8.91-2.16,13.12-1.36,3.32-3,6.47-5.59,9.04-1.62,1.6-3.56,2.69-5.57,3.71-.57.29-1.4.56-1.17,1.41.55,2.06,1.28,4.11,3.04,5.44,2.56,1.94,5.51,3.01,8.76,3.02,2.79,0,5.58.23,8.36-.29.72-.13,1.48-.02,2.59-.02-.5.38-.62.52-.77.58-3.19,1.4-6.55,1.64-9.97,1.57-.62-.01-1.58-.34-1.84.33-.3.78.43,1.45,1.03,1.96.41.35.94.57,1.34.92.8.69,2.05.86,2.48,2.03-.49.32-.9.08-1.35-.09-2.46-.9-4.28-2.7-6.18-4.38-1.83-1.61-3.74-3-6.12-3.77-1.34-.43-1.93.06-2.39,1.13-1.12,2.62-.36,5.68,2.08,7.46Z"/><path class="cls-5" d="m263.29,105.85c-.52-3.18-1.52-6.23-3.43-8.89-.5-.69-.96-1.32-1.98-.35-4,3.85-7.05,8.28-8.99,13.5-1.05,2.83-2.09,5.7-3.51,8.35-1.27,2.38-1.71,4.67-1.21,7.31,1.09,5.69.35,11.2-2.11,16.44-1.23,2.64-3,4.86-5.8,6.01-1.68.69-2.07.47-2.66-1.23-1.02-2.96-.64-5.94-.19-8.92.26-1.69.12-1.9-1.51-1.31-2.44.89-4.8.94-6.88-.67-1.57-1.22-2.84-2.77-3.74-4.62-2.45-5.05-3.55-10.52-4.95-15.88-2.7-10.24-5.29-20.5-10.4-29.89-4.19-7.69-9.91-13.8-18.26-16.91-4.05-1.51-8.18-2.6-12.73-2-6.48.86-11.42,4.14-15.54,8.81-3.67,4.17-6.27,9.08-8.14,14.29-3.22,8.99-4.91,18.29-4.91,27.87,0,6.45.93,12.75,2.89,18.91,2.05,6.44,6.46,10.7,12.12,14.06,4.75,2.82,9.85,4.63,15.06,6.25,6.44,2.01,13,3.36,19.77,2.87,4.65-.34,9.16-1.43,13.53-3.13,3.28-1.27,6.58-2.49,9.92-3.57,2.93-.95,6-1.56,9.06-1.68,2.26-.09,4.57.37,6.84.76,1.32.23,2.73.99,4.03.16,1.5-.95,3.19-1.53,4.64-2.49,2.66-1.76,5.6-2.43,8.66-2.97,1.34-.24,3.05.11,3.95-1.37.75-1.24,1.46-2.54,1.97-3.89,1.27-3.46,2.33-6.98,3.14-10.59,1.87-8.34,2.76-16.72,1.37-25.22Z"/></g></svg>`;

function createEnhancedSonic() {
    const sonicGroup = new THREE.Group();

    // Create Sonic texture from embedded SVG
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = 345;
        canvas.height = 454;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 345, 454);

        const sonicTexture = new THREE.CanvasTexture(canvas);
        sonicTexture.magFilter = THREE.LinearFilter;
        sonicTexture.minFilter = THREE.LinearFilter;

        if (sonicGroup.children[0] && sonicGroup.children[0].material) {
            sonicGroup.children[0].material.map = sonicTexture;
            sonicGroup.children[0].material.needsUpdate = true;
        }
    };
    // Use data URL for reliable loading
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(SONIC_SVG)));

    // Create sprite with transparent material
    const spriteMaterial = new THREE.SpriteMaterial({
        transparent: true,
        alphaTest: 0.1
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2, 2.6, 1);
    sonicGroup.add(sprite);

    // Hitbox for collisions
    const hitboxGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    sonicGroup.add(hitbox);

    sonicGroup.position.set(0, 0.8, 0);
    sonicMesh = sonicGroup;
    scene.add(sonicMesh);
}

function createEnhancedLaneMarkers() {
    for (let lane = -1; lane <= 1; lane++) {
        if (lane === 0) continue;

        // Create glowing lane markers
        for (let z = 10; z > -100; z -= 5) {
            const geometry = new THREE.BoxGeometry(0.1, 0.05, 2);
            const material = new THREE.MeshStandardMaterial({
                color: 0x00FFFF,
                emissive: 0x00FFFF,
                emissiveIntensity: 0.8,
                transparent: true,
                opacity: 0.6
            });
            const marker = new THREE.Mesh(geometry, material);
            marker.position.set(lane * 2, 0.01, z);
            scene.add(marker);
        }
    }
}

function createObstacle(type, lane, z) {
    let mesh;

    if (type === 'spike') {
        const geometry = new THREE.ConeGeometry(0.5, 1, 4);
        const material = new THREE.MeshStandardMaterial({
            color: 0x8B0000,
            roughness: 0.3,
            metalness: 0.7,
            emissive: 0x440000,
            emissiveIntensity: 0.5
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.y = Math.PI / 4;

        // Add glow light
        const light = new THREE.PointLight(0xFF0000, 0.5, 3);
        light.position.set(0, 0.5, 0);
        mesh.add(light);
    } else if (type === 'badnik') {
        // Enhanced Badnik
        const geometry = new THREE.SphereGeometry(0.6, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0x8B0000,
            roughness: 0.2,
            metalness: 0.8,
            emissive: 0x440000,
            emissiveIntensity: 0.7
        });
        mesh = new THREE.Mesh(geometry, material);

        // Add eyes
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFF00,
            emissive: 0xFFFF00,
            emissiveIntensity: 1
        });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.2, 0.2, 0.5);
        mesh.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.2, 0.2, 0.5);
        mesh.add(rightEye);
    } else if (type === 'wall') {
        // Wall obstacle
        const geometry = new THREE.BoxGeometry(0.8, 1.5, 0.3);
        const material = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.7,
            metalness: 0.5,
            emissive: 0x222222,
            emissiveIntensity: 0.3
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 0.75;
    } else if (type === 'barrier') {
        // Barrier - must jump over
        const geometry = new THREE.BoxGeometry(2, 0.4, 0.3);
        const material = new THREE.MeshStandardMaterial({
            color: 0xFF6600,
            roughness: 0.4,
            metalness: 0.6,
            emissive: 0xFF3300,
            emissiveIntensity: 0.5
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 0.8;

        // Add warning stripes
        const stripeGeometry = new THREE.BoxGeometry(0.2, 0.41, 0.31);
        const stripeMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFF00,
            emissive: 0xFFFF00,
            emissiveIntensity: 0.7
        });
        for (let i = -2; i <= 2; i++) {
            const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
            stripe.position.x = i * 0.4;
            mesh.add(stripe);
        }
    } else if (type === 'laser') {
        // Laser beam obstacle
        const geometry = new THREE.BoxGeometry(0.1, 2, 0.1);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00FFFF,
            roughness: 0.1,
            metalness: 0.9,
            emissive: 0x00FFFF,
            emissiveIntensity: 1.5,
            transparent: true,
            opacity: 0.8
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 1;

        // Add laser glow
        const light = new THREE.PointLight(0x00FFFF, 2, 5);
        light.position.set(0, 1, 0);
        mesh.add(light);
    } else if (type === 'mine') {
        // Floating mine
        const geometry = new THREE.SphereGeometry(0.4, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.4,
            metalness: 0.8,
            emissive: 0xFF0000,
            emissiveIntensity: 0.6
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 1.5;

        // Add spikes to mine
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const spikeGeometry = new THREE.ConeGeometry(0.08, 0.3, 6);
            const spikeMaterial = new THREE.MeshStandardMaterial({
                color: 0x333333,
                roughness: 0.3,
                metalness: 0.7
            });
            const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
            spike.position.set(Math.cos(angle) * 0.4, 0, Math.sin(angle) * 0.4);
            spike.rotation.z = Math.PI / 2;
            spike.rotation.y = angle;
            mesh.add(spike);
        }

        // Add blinking light
        const light = new THREE.PointLight(0xFF0000, 1, 4);
        mesh.add(light);
        mesh.userData.blinkTimer = 0;
    } else if (type === 'lowbarrier') {
        // Low barrier across the lane - MUST JUMP!
        const geometry = new THREE.BoxGeometry(2.5, 0.5, 0.4);
        const material = new THREE.MeshStandardMaterial({
            color: 0xFF0066,
            roughness: 0.3,
            metalness: 0.7,
            emissive: 0xFF0044,
            emissiveIntensity: 0.6
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 0.25;

        // Add glowing top
        const topGeometry = new THREE.BoxGeometry(2.5, 0.1, 0.5);
        const topMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFF00,
            emissive: 0xFFFF00,
            emissiveIntensity: 1
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 0.3;
        mesh.add(top);
    } else if (type === 'hurdle') {
        // Track hurdle - classic jump obstacle
        const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.5,
            metalness: 0.5
        });
        mesh = new THREE.Group();

        const leftPole = new THREE.Mesh(poleGeometry, poleMaterial);
        leftPole.position.set(-0.8, 0.5, 0);
        mesh.add(leftPole);

        const rightPole = new THREE.Mesh(poleGeometry, poleMaterial);
        rightPole.position.set(0.8, 0.5, 0);
        mesh.add(rightPole);

        const barGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8);
        const barMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF0000,
            emissive: 0xFF0000,
            emissiveIntensity: 0.5
        });
        const bar = new THREE.Mesh(barGeometry, barMaterial);
        bar.rotation.z = Math.PI / 2;
        bar.position.y = 0.7;
        mesh.add(bar);
    }

    // Side-scroll: X is horizontal (spawn on right), Y is vertical (lane)
    mesh.position.set(z, 2 + lane * 1.5, 0);  // z becomes X position, lane becomes Y
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { type, lane, dead: false };
    scene.add(mesh);
    obstacles.push(mesh);
}

function createRing(lane, z) {
    // Classic Sonic golden ring
    const geometry = new THREE.TorusGeometry(0.4, 0.1, 8, 16);
    const material = new THREE.MeshBasicMaterial({
        color: 0xFFCC00
    });
    const ring = new THREE.Mesh(geometry, material);
    // Side-scroll: X is horizontal, Y is vertical
    ring.position.set(z, 2 + lane * 1.5, 0);
    ring.rotation.y = Math.PI / 2;  // Face the camera
    ring.userData = { collected: false, spinSpeed: 0.15 + Math.random() * 0.05 };

    scene.add(ring);
    rings.push(ring);
}

// ==================== SONIC WORLD ELEMENTS ====================

// Create Spring (Yellow = normal, Red = super bounce)
function createSpring(x, y, type = 'yellow') {
    const springGroup = new THREE.Group();

    // Base
    const baseGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.2, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.8,
        roughness: 0.3
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    springGroup.add(base);

    // Spring coil
    const springColor = type === 'red' ? 0xFF0000 : 0xFFFF00;
    const coilGeometry = new THREE.TorusGeometry(0.25, 0.08, 8, 16);
    const coilMaterial = new THREE.MeshStandardMaterial({
        color: springColor,
        emissive: springColor,
        emissiveIntensity: 0.3
    });

    for (let i = 0; i < 3; i++) {
        const coil = new THREE.Mesh(coilGeometry, coilMaterial);
        coil.position.y = 0.2 + i * 0.15;
        coil.rotation.x = Math.PI / 2;
        springGroup.add(coil);
    }

    // Top platform
    const topGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.1, 16);
    const topMaterial = new THREE.MeshStandardMaterial({
        color: springColor,
        emissive: springColor,
        emissiveIntensity: 0.5
    });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 0.7;
    springGroup.add(top);

    springGroup.position.set(x, y, 0);
    springGroup.userData = {
        type: type,
        bounceForce: type === 'red' ? 0.8 : 0.5,
        activated: false,
        animTimer: 0
    };

    scene.add(springGroup);
    springs.push(springGroup);
}

// Create Loop-de-loop (visual element with auto-movement)
function createLoop(x, y) {
    const loopGroup = new THREE.Group();

    // Create loop track using torus
    const trackGeometry = new THREE.TorusGeometry(3, 0.3, 16, 32);
    const trackMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.7
    });
    const track = new THREE.Mesh(trackGeometry, trackMaterial);
    track.rotation.y = Math.PI / 2;
    loopGroup.add(track);

    // Add checkered pattern
    const innerGeometry = new THREE.TorusGeometry(2.7, 0.25, 16, 32);
    const innerMaterial = new THREE.MeshStandardMaterial({
        color: 0xD2691E,
        roughness: 0.6
    });
    const inner = new THREE.Mesh(innerGeometry, innerMaterial);
    inner.rotation.y = Math.PI / 2;
    loopGroup.add(inner);

    // Arrow indicators
    const arrowGeometry = new THREE.ConeGeometry(0.2, 0.4, 8);
    const arrowMaterial = new THREE.MeshStandardMaterial({
        color: 0x00FF00,
        emissive: 0x00FF00,
        emissiveIntensity: 0.5
    });

    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.position.set(0, Math.sin(angle) * 2.7, Math.cos(angle) * 2.7);
        arrow.rotation.x = angle + Math.PI / 2;
        loopGroup.add(arrow);
    }

    loopGroup.position.set(x, y, 0);
    loopGroup.userData = {
        active: false,
        progress: 0
    };

    scene.add(loopGroup);
    loops.push(loopGroup);
}

// Create Pipe/Tube (S-tube style)
function createPipe(x, y, exitX, exitY) {
    const pipeGroup = new THREE.Group();

    // Entry pipe
    const entryGeometry = new THREE.CylinderGeometry(0.8, 0.8, 1.5, 16, 1, true);
    const pipeMaterial = new THREE.MeshStandardMaterial({
        color: 0x4169E1,
        metalness: 0.6,
        roughness: 0.4,
        side: THREE.DoubleSide
    });
    const entry = new THREE.Mesh(entryGeometry, pipeMaterial);
    entry.rotation.z = Math.PI / 2;
    pipeGroup.add(entry);

    // Pipe rim (entry)
    const rimGeometry = new THREE.TorusGeometry(0.8, 0.15, 8, 16);
    const rimMaterial = new THREE.MeshStandardMaterial({
        color: 0x00008B,
        emissive: 0x000044,
        emissiveIntensity: 0.3
    });
    const entryRim = new THREE.Mesh(rimGeometry, rimMaterial);
    entryRim.position.x = -0.75;
    entryRim.rotation.y = Math.PI / 2;
    pipeGroup.add(entryRim);

    // Glow effect
    const glowGeometry = new THREE.RingGeometry(0.5, 0.8, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00FFFF,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.x = -0.8;
    glow.rotation.y = Math.PI / 2;
    pipeGroup.add(glow);

    pipeGroup.position.set(x, y, 0);
    pipeGroup.userData = {
        exitX: exitX,
        exitY: exitY,
        isInPipe: false
    };

    scene.add(pipeGroup);
    pipes.push(pipeGroup);
}

// Create Item Box / Monitor
function createItemBox(x, y, powerUp = 'random') {
    const boxGroup = new THREE.Group();

    // Determine power-up type
    const powerUps = ['shield', 'speed', 'invincibility', 'extralife', 'rings'];
    if (powerUp === 'random') {
        powerUp = powerUps[Math.floor(Math.random() * powerUps.length)];
    }

    // Box body
    const boxGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const boxMaterial = new THREE.MeshStandardMaterial({
        color: 0x808080,
        metalness: 0.5,
        roughness: 0.5
    });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    boxGroup.add(box);

    // Screen face
    const screenGeometry = new THREE.PlaneGeometry(0.6, 0.6);
    let screenColor;
    switch(powerUp) {
        case 'shield': screenColor = 0x00BFFF; break;
        case 'speed': screenColor = 0xFF4500; break;
        case 'invincibility': screenColor = 0xFFD700; break;
        case 'extralife': screenColor = 0x00FF00; break;
        case 'rings': screenColor = 0xFFCC00; break;
        default: screenColor = 0xFFFFFF;
    }
    const screenMaterial = new THREE.MeshBasicMaterial({
        color: screenColor
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = 0.41;
    boxGroup.add(screen);

    // Icon on screen based on power-up
    const iconGeometry = powerUp === 'rings'
        ? new THREE.TorusGeometry(0.15, 0.05, 8, 16)
        : new THREE.SphereGeometry(0.15, 8, 8);
    const iconMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const icon = new THREE.Mesh(iconGeometry, iconMaterial);
    icon.position.z = 0.45;
    if (powerUp === 'rings') icon.rotation.x = Math.PI / 2;
    boxGroup.add(icon);

    boxGroup.position.set(x, y, 0);
    boxGroup.userData = {
        powerUp: powerUp,
        collected: false,
        bobOffset: Math.random() * Math.PI * 2
    };

    scene.add(boxGroup);
    itemBoxes.push(boxGroup);
}

// Create Dash Panel / Speed Booster
function createDashPanel(x, y) {
    const panelGroup = new THREE.Group();

    // Base panel
    const panelGeometry = new THREE.BoxGeometry(1.5, 0.1, 1);
    const panelMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF6600,
        emissive: 0xFF3300,
        emissiveIntensity: 0.5,
        metalness: 0.8
    });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panelGroup.add(panel);

    // Arrow indicators
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 0.3);
    arrowShape.lineTo(0.2, 0);
    arrowShape.lineTo(0.1, 0);
    arrowShape.lineTo(0.1, -0.3);
    arrowShape.lineTo(-0.1, -0.3);
    arrowShape.lineTo(-0.1, 0);
    arrowShape.lineTo(-0.2, 0);
    arrowShape.lineTo(0, 0.3);

    const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
    const arrowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFF00,
        side: THREE.DoubleSide
    });

    for (let i = 0; i < 2; i++) {
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.position.set(-0.3 + i * 0.6, 0.06, 0);
        arrow.rotation.x = -Math.PI / 2;
        arrow.rotation.z = -Math.PI / 2;
        panelGroup.add(arrow);
    }

    panelGroup.position.set(x, y, 0);
    panelGroup.userData = {
        boostAmount: 0.3,
        cooldown: 0
    };

    scene.add(panelGroup);
    dashPanels.push(panelGroup);
}

// Create Ramp
function createRamp(x, y, direction = 'up') {
    const rampGroup = new THREE.Group();

    // Ramp surface
    const rampGeometry = new THREE.BoxGeometry(2, 0.2, 1);
    const rampMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.7
    });
    const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
    ramp.rotation.z = direction === 'up' ? -Math.PI / 6 : Math.PI / 6;
    rampGroup.add(ramp);

    // Support
    const supportGeometry = new THREE.BoxGeometry(0.2, 1, 0.8);
    const supportMaterial = new THREE.MeshStandardMaterial({
        color: 0x654321
    });
    const support = new THREE.Mesh(supportGeometry, supportMaterial);
    support.position.set(direction === 'up' ? 0.8 : -0.8, -0.3, 0);
    rampGroup.add(support);

    rampGroup.position.set(x, y, 0);
    rampGroup.userData = {
        direction: direction,
        launchForce: 0.35
    };

    scene.add(rampGroup);
    ramps.push(rampGroup);
}

// Create Moving Platform
function createPlatform(x, y, moveType = 'horizontal', range = 3) {
    const platformGroup = new THREE.Group();

    // Platform surface
    const platformGeometry = new THREE.BoxGeometry(2, 0.3, 1);
    const platformMaterial = new THREE.MeshStandardMaterial({
        color: 0x228B22,
        roughness: 0.6
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platformGroup.add(platform);

    // Decorative edges
    const edgeGeometry = new THREE.BoxGeometry(2.1, 0.1, 1.1);
    const edgeMaterial = new THREE.MeshStandardMaterial({
        color: 0x006400,
        emissive: 0x003300,
        emissiveIntensity: 0.3
    });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.position.y = 0.15;
    platformGroup.add(edge);

    platformGroup.position.set(x, y, 0);
    platformGroup.userData = {
        moveType: moveType,
        range: range,
        startX: x,
        startY: y,
        speed: 0.02,
        direction: 1
    };

    scene.add(platformGroup);
    platforms.push(platformGroup);
}

// Create Checkpoint
function createCheckpoint(x, y) {
    const checkpointGroup = new THREE.Group();

    // Pole
    const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        metalness: 0.7
    });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 1.5;
    checkpointGroup.add(pole);

    // Spinner (blue when inactive, red when active)
    const spinnerGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const spinnerMaterial = new THREE.MeshStandardMaterial({
        color: 0x0000FF,
        emissive: 0x0000FF,
        emissiveIntensity: 0.5
    });
    const spinner = new THREE.Mesh(spinnerGeometry, spinnerMaterial);
    spinner.position.y = 3.2;
    checkpointGroup.add(spinner);

    // Star decoration
    const starGeometry = new THREE.OctahedronGeometry(0.25);
    const starMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        emissive: 0xFFFFFF,
        emissiveIntensity: 0.8
    });
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.position.y = 3.2;
    checkpointGroup.add(star);

    checkpointGroup.position.set(x, y, 0);
    checkpointGroup.userData = {
        activated: false,
        spinSpeed: 0.05
    };

    scene.add(checkpointGroup);
    checkpoints.push(checkpointGroup);
}

// Play spring sound
function playSpringSound() {
    if (!audioContext || musicMuted) return;
    const now = audioContext.currentTime;
    playNote(523, now, 0.1, 'sine');
    playNote(784, now + 0.05, 0.1, 'sine');
    playNote(1047, now + 0.1, 0.15, 'sine');
}

// Play item box sound
function playItemBoxSound() {
    if (!audioContext || musicMuted) return;
    const now = audioContext.currentTime;
    playNote(880, now, 0.1, 'square');
    playNote(1175, now + 0.1, 0.15, 'square');
}

// Play dash panel sound
function playDashSound() {
    if (!audioContext || musicMuted) return;
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start(now);
    osc.stop(now + 0.2);
}

// Play checkpoint sound
function playCheckpointSound() {
    if (!audioContext || musicMuted) return;
    const now = audioContext.currentTime;
    playNote(523, now, 0.15, 'sine');
    playNote(659, now + 0.15, 0.15, 'sine');
    playNote(784, now + 0.3, 0.15, 'sine');
    playNote(1047, now + 0.45, 0.3, 'sine');
}

// ==================== END SONIC WORLD ELEMENTS ====================

function createProjectile() {
    const weapon = weapons[equippedWeapon];
    let geometry;

    // Different geometry based on weapon type
    switch(equippedWeapon) {
        case 'ring':
            geometry = new THREE.TorusGeometry(weapon.size, 0.06, 8, 16);
            break;
        case 'fireball':
            geometry = new THREE.SphereGeometry(weapon.size, 12, 12);
            break;
        case 'lightning':
            geometry = new THREE.CylinderGeometry(0.05, 0.05, weapon.size * 3, 6);
            break;
        case 'laser':
            geometry = new THREE.BoxGeometry(weapon.size * 2, 0.1, 0.1);
            break;
        case 'star':
            geometry = new THREE.OctahedronGeometry(weapon.size);
            break;
        case 'ice':
            geometry = new THREE.ConeGeometry(weapon.size * 0.5, weapon.size * 2, 6);
            break;
        default:
            geometry = new THREE.TorusGeometry(weapon.size, 0.06, 8, 16);
    }

    const material = new THREE.MeshBasicMaterial({
        color: weapon.color
    });
    const proj = new THREE.Mesh(geometry, material);

    // Side-scroll: start from Sonic's position
    const sonicY = sonicMesh ? sonicMesh.position.y : 2;
    proj.position.set(-4, sonicY, 0);

    // Rotate based on weapon type
    if (equippedWeapon === 'ring') {
        proj.rotation.y = Math.PI / 2;
    } else if (equippedWeapon === 'lightning' || equippedWeapon === 'ice') {
        proj.rotation.z = -Math.PI / 2;
    }

    proj.userData = {
        speed: weapon.speed,
        damage: weapon.damage,
        weaponType: equippedWeapon
    };

    scene.add(proj);
    projectiles.push(proj);

    createParticleEffect(-4, sonicY, 0, weapon.color, 3);
}

function createBoss() {
    const bossGroup = new THREE.Group();
    // Different boss colors for each boss level
    let bodyColor;
    if (currentLevel === 15) {
        bodyColor = 0xFF0000;  // Final Boss - bright red
    } else if (currentLevel === 10) {
        bodyColor = 0x6600CC;  // Ultra Boss - purple
    } else if (currentLevel === 6) {
        bodyColor = 0x00AA00;  // Mega Boss - green
    } else {
        bodyColor = 0x8B0000;  // Regular Boss - dark red
    }

    // Enhanced boss body
    const bodyGeometry = new THREE.SphereGeometry(1.2, 32, 32);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: bodyColor,
        roughness: 0.2,
        metalness: 0.8,
        emissive: bodyColor,
        emissiveIntensity: 0.6
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    bossGroup.add(body);

    // Armor plates with metallic look
    for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI * 2) / 12;
        const plateGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.15);
        const plateMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a0000,
            roughness: 0.3,
            metalness: 0.9,
            emissive: 0x440000,
            emissiveIntensity: 0.3
        });
        const plate = new THREE.Mesh(plateGeometry, plateMaterial);
        plate.position.set(Math.cos(angle) * 1.1, Math.sin(angle) * 1.1, 0);
        plate.rotation.z = angle;
        plate.castShadow = true;
        bossGroup.add(plate);
    }

    // Enhanced glowing eyes
    const eyeGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const eyeMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF0000,
        roughness: 0.1,
        metalness: 0.9,
        emissive: 0xFF0000,
        emissiveIntensity: 2
    });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.4, 0.3, 1);
    bossGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.4, 0.3, 1);
    bossGroup.add(rightEye);

    // Boss glow
    const bossLight = new THREE.PointLight(bodyColor, 3, 15);
    bossGroup.add(bossLight);

    // Side-scroll: boss on the right side
    bossGroup.position.set(6, 3, 0);
    bossMesh = bossGroup;
    scene.add(bossGroup);
}

function createBossProjectile() {
    const geometry = new THREE.SphereGeometry(0.25, 16, 16);
    const material = new THREE.MeshStandardMaterial({
        color: 0xFF4500,
        roughness: 0.1,
        metalness: 0.9,
        emissive: 0xFF0000,
        emissiveIntensity: 1.5
    });
    const proj = new THREE.Mesh(geometry, material);
    proj.position.copy(bossMesh.position);
    proj.position.z += 2;
    proj.userData = { speed: 0.15 };

    // Add light
    const light = new THREE.PointLight(0xFF4500, 1.5, 4);
    proj.add(light);

    scene.add(proj);
    bossProjectiles.push(proj);
}

// Projectile that aims at Sonic's current position!
function createBossProjectileAimed() {
    if (!bossMesh) return;

    const geometry = new THREE.SphereGeometry(0.3, 12, 12);
    // Projectile color based on boss
    let color;
    if (currentLevel === 15) {
        color = 0xFF0000;  // Final Boss - red
    } else if (currentLevel === 10) {
        color = 0x9900FF;  // Ultra Boss - purple
    } else if (currentLevel === 6) {
        color = 0x00FF00;  // Mega Boss - green
    } else {
        color = 0xFF4500;  // Regular Boss - orange
    }
    const material = new THREE.MeshBasicMaterial({
        color: color
    });
    const proj = new THREE.Mesh(geometry, material);
    proj.position.copy(bossMesh.position);

    // Side-scroll: calculate direction to Sonic (at X=-5)
    const sonicX = -5;
    const sonicY = player.y + player.jumpHeight;
    const dirX = sonicX - bossMesh.position.x;
    const dirY = sonicY - bossMesh.position.y;
    const length = Math.sqrt(dirX * dirX + dirY * dirY);

    proj.userData = {
        speed: 0,
        velocityX: (dirX / length) * 0.1,
        velocityY: (dirY / length) * 0.08,
        aimed: true
    };

    scene.add(proj);
    bossProjectiles.push(proj);
}

// Spread shot for Final Boss
function createBossProjectileSpread() {
    if (!bossMesh) return;

    const colors = [0xFF0000, 0x00FF00, 0x0000FF];
    const offsets = [-1.5, 0, 1.5];

    for (let i = 0; i < 3; i++) {
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshStandardMaterial({
            color: colors[i],
            emissive: colors[i],
            emissiveIntensity: 1.5
        });
        const proj = new THREE.Mesh(geometry, material);
        proj.position.copy(bossMesh.position);
        proj.position.z += 2;
        proj.position.x += offsets[i] * 0.5;

        proj.userData = {
            speed: 0.1,
            velocityX: -0.08 + offsets[i] * 0.01,
            aimed: true
        };

        scene.add(proj);
        bossProjectiles.push(proj);
    }
}

// Laser barrage for Final Boss
function createBossLaserBarrage() {
    if (!bossMesh) return;

    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            if (!bossMesh) return;

            const geometry = new THREE.BoxGeometry(0.8, 0.2, 0.2);
            const material = new THREE.MeshBasicMaterial({
                color: 0xFF00FF
            });
            const laser = new THREE.Mesh(geometry, material);
            laser.position.copy(bossMesh.position);
            laser.position.y = 1 + i * 1.5;

            // Side-scroll: move left slowly
            laser.userData = {
                speed: 0,
                velocityX: -0.12,
                velocityY: 0,
                isLaser: true
            };

            scene.add(laser);
            bossProjectiles.push(laser);
        }, i * 200);
    }
}

function createParticleEffect(x, y, z, color, count = 8) {
    for (let i = 0; i < Math.min(count, 8); i++) {
        const geometry = new THREE.SphereGeometry(0.05, 8, 8);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 1,
            transparent: true,
            opacity: 1
        });
        const particle = new THREE.Mesh(geometry, material);
        particle.position.set(x, y, z);
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2
            ),
            life: 30,
            maxLife: 30
        };
        scene.add(particle);
        particleSystem.push(particle);
    }
}

function createExplosion(x, y, z) {
    createParticleEffect(x, y, z, 0xFF4500, 6);
    cameraShake.intensity = 0.2;
}

function updateParticles() {
    for (let i = particleSystem.length - 1; i >= 0; i--) {
        const particle = particleSystem[i];
        particle.userData.life--;

        particle.position.add(particle.userData.velocity);
        particle.userData.velocity.y -= 0.01; // gravity

        // Fade out
        particle.material.opacity = particle.userData.life / particle.userData.maxLife;
        particle.scale.setScalar(particle.material.opacity);

        if (particle.userData.life <= 0) {
            scene.remove(particle);
            particleSystem.splice(i, 1);
        }
    }
}

function createSpeedTrail() {
    if (!sonicMesh) return;

    // Classic Sonic motion blur effect
    const trail = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.3),
        new THREE.MeshBasicMaterial({
            color: skins[equippedSkin].color,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        })
    );
    trail.position.copy(sonicMesh.position);
    trail.position.x += (Math.random() - 0.5) * 0.3;
    trail.position.z += 0.5;
    trail.userData = { life: 8 };
    scene.add(trail);
    speedTrail.push(trail);
}

function updateSpeedTrail() {
    for (let i = speedTrail.length - 1; i >= 0; i--) {
        const trail = speedTrail[i];
        trail.userData.life--;
        trail.material.opacity = trail.userData.life / 10 * 0.6;
        trail.scale.setScalar(0.5 + trail.userData.life / 20);

        if (trail.userData.life <= 0) {
            scene.remove(trail);
            speedTrail.splice(i, 1);
        }
    }
}

// Input handling
document.addEventListener('keydown', (e) => {
    if (!gameRunning) return;

    if (e.code === 'Space') {
        e.preventDefault();
        jump();
    }
    if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        e.preventDefault();
        spinDash();
    }
    if (e.code === 'KeyA' || e.code === 'KeyX') {
        e.preventDefault();
        shoot();
    }
    if (e.code === 'ArrowLeft') {
        e.preventDefault();
        changeLane(-1);
    }
    if (e.code === 'ArrowRight') {
        e.preventDefault();
        changeLane(1);
    }
});

function changeLane(direction) {
    // In side-scroll mode, up/down moves Sonic vertically
    player.lane = Math.max(-1, Math.min(1, player.lane + direction));
    player.targetX = player.lane * 2;  // Still used for vertical position in side-scroll
}

function jump() {
    if (!player.jumping) {
        player.velocityY = player.jumpPower;
        player.jumpHeight = 0;
        player.jumping = true;
        hasDoubleJumped = false;
        createParticleEffect(-5, player.y, 0, 0x00FFFF, 3);
        playJumpSound();
    } else if (canDoubleJump && player.jumping && !hasDoubleJumped) {
        player.velocityY = player.jumpPower * 0.8;
        hasDoubleJumped = true;
        createParticleEffect(-5, player.y + player.jumpHeight, 0, 0xFFD700, 3);
        playJumpSound();
    }
}

function spinDash() {
    if (player.spinDashCooldown > 0) return;
    player.spinning = true;
    player.spinDashTimer = 60;  // Lasts longer
    player.spinDashCooldown = 40;  // Can use more often
    createParticleEffect(player.x, player.y, player.z, 0x00FFFF, 5);
    playSpinSound();
}

function shoot() {
    if (player.shootCooldown > 0) return;

    createProjectile();

    const power = skins[equippedSkin].power;
    const weapon = weapons[equippedWeapon];
    let cooldown = weapon.cooldown;

    // Rapidfire power reduces cooldown
    if (power === 'rapidfire' || power === 'all') {
        cooldown = Math.floor(cooldown * 0.5);
    }

    player.shootCooldown = cooldown;
}

// Shop System
function updateCoinDisplay() {
    document.getElementById('coin-amount').textContent = coins;
    document.getElementById('coin-amount-shop').textContent = coins;
    localStorage.setItem('sonicCoins', coins);
}

function initShop() {
    updateCoinDisplay();
    updateShopUI();
}

function updateShopUI() {
    document.querySelectorAll('.skin-card').forEach(card => {
        const skinId = card.getAttribute('data-skin');
        const btn = card.querySelector('.skin-btn');

        if (ownedSkins.includes(skinId)) {
            if (equippedSkin === skinId) {
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
            btn.disabled = coins < skins[skinId].price;
        }
    });
}

document.getElementById('shop-btn').addEventListener('click', () => {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('shop-screen').classList.remove('hidden');
    updateShopUI();
    updateWeaponUI();
});

document.getElementById('back-btn').addEventListener('click', () => {
    document.getElementById('shop-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
});

document.querySelectorAll('.skin-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const card = e.target.closest('.skin-card');
        const skinId = card.getAttribute('data-skin');

        if (!ownedSkins.includes(skinId)) {
            if (coins >= skins[skinId].price) {
                coins -= skins[skinId].price;
                ownedSkins.push(skinId);
                localStorage.setItem('sonicOwnedSkins', JSON.stringify(ownedSkins));
                updateCoinDisplay();
                equipSkin(skinId);
            }
        } else if (equippedSkin !== skinId) {
            equipSkin(skinId);
        }
    });
});

function equipSkin(skinId) {
    equippedSkin = skinId;
    localStorage.setItem('sonicEquippedSkin', skinId);
    updateShopUI();
}

// Weapon selection functions
function updateWeaponUI() {
    document.querySelectorAll('.weapon-card').forEach(card => {
        const weaponId = card.getAttribute('data-weapon');
        const btn = card.querySelector('.weapon-btn');

        if (equippedWeapon === weaponId) {
            btn.textContent = 'EQUIPPED';
            btn.className = 'weapon-btn equipped';
        } else {
            btn.textContent = 'SELECT';
            btn.className = 'weapon-btn';
        }
    });
}

function equipWeapon(weaponId) {
    equippedWeapon = weaponId;
    localStorage.setItem('sonicEquippedWeapon', weaponId);
    updateWeaponUI();
}

// Initialize weapon button listeners
document.querySelectorAll('.weapon-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const card = e.target.closest('.weapon-card');
        const weaponId = card.getAttribute('data-weapon');
        equipWeapon(weaponId);
    });
});

// Game functions
function startGame() {
    // Initialize and play audio
    initAudio();
    playBackgroundMusic();

    gameRunning = true;
    score = 0;
    currentLevel = 1;
    frameCount = 0;
    levelProgress = 0;

    player.lane = 0;
    player.targetX = 0;
    player.x = 0;
    player.y = 2;
    player.velocityY = 0;
    player.jumpHeight = 0;
    player.jumping = false;
    player.spinning = false;
    player.spinDashTimer = 0;
    player.spinDashCooldown = 0;
    player.shootCooldown = 0;
    player.invincible = false;
    player.invincibleTimer = 0;
    hasDoubleJumped = false;

    // Clear scene
    obstacles.forEach(obs => scene.remove(obs));
    rings.forEach(ring => scene.remove(ring));
    projectiles.forEach(proj => scene.remove(proj));
    bossProjectiles.forEach(proj => scene.remove(proj));
    particleSystem.forEach(p => scene.remove(p));
    speedTrail.forEach(t => scene.remove(t));
    if (bossMesh) scene.remove(bossMesh);

    // Clear Sonic world elements
    springs.forEach(s => scene.remove(s));
    loops.forEach(l => scene.remove(l));
    pipes.forEach(p => scene.remove(p));
    itemBoxes.forEach(b => scene.remove(b));
    dashPanels.forEach(d => scene.remove(d));
    ramps.forEach(r => scene.remove(r));
    platforms.forEach(p => scene.remove(p));
    checkpoints.forEach(c => scene.remove(c));

    obstacles = [];
    rings = [];
    projectiles = [];
    bossProjectiles = [];
    particleSystem = [];
    speedTrail = [];
    bossMesh = null;

    // Reset world element arrays
    springs = [];
    loops = [];
    pipes = [];
    itemBoxes = [];
    dashPanels = [];
    ramps = [];
    platforms = [];
    checkpoints = [];

    // Reset power-up states
    hasShield = false;
    hasSpeedBoost = false;
    speedBoostTimer = 0;
    hasInvincibility = false;
    invincibilityTimer = 0;

    // Apply skin powers
    const power = skins[equippedSkin].power;

    if (power === 'extralife' || power === 'all') {
        lives = 4;
    } else {
        lives = 3;
    }

    if (power === 'speed' || power === 'all') {
        gameSpeed = 0.25;
    } else {
        gameSpeed = 0.18;
    }

    if (power === 'doublejump' || power === 'all') {
        canDoubleJump = true;
    } else {
        canDoubleJump = false;
    }

    // Update Sonic sprite with new skin
    if (sonicMesh) {
        scene.remove(sonicMesh);
    }
    createEnhancedSonic();

    updateLevelColors();

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('victory-screen').classList.add('hidden');

    updateUI();
    gameLoop();
}

function updateLevelColors() {
    const level = levels[currentLevel - 1];
    scene.background = new THREE.Color(level.skyColor);
    scene.fog.color.setHex(level.skyColor);

    // Update ground with level-specific checkered pattern
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx2d = canvas.getContext('2d');

    // Get base color and calculate light/dark variants
    const baseColor = level.groundColor;
    const r = (baseColor >> 16) & 255;
    const g = (baseColor >> 8) & 255;
    const b = baseColor & 255;

    const darkColor = `rgb(${Math.floor(r * 0.7)}, ${Math.floor(g * 0.7)}, ${Math.floor(b * 0.7)})`;
    const lightColor = `rgb(${Math.min(255, Math.floor(r * 1.2))}, ${Math.min(255, Math.floor(g * 1.2))}, ${Math.min(255, Math.floor(b * 1.2))})`;

    const tileSize = 32;
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
            ctx2d.fillStyle = (x + y) % 2 === 0 ? darkColor : lightColor;
            ctx2d.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
    }

    const newTexture = new THREE.CanvasTexture(canvas);
    newTexture.wrapS = THREE.RepeatWrapping;
    newTexture.wrapT = THREE.RepeatWrapping;
    newTexture.repeat.set(4, 40);
    newTexture.magFilter = THREE.NearestFilter;
    newTexture.minFilter = THREE.NearestFilter;

    groundMesh.material.map = newTexture;
    groundMesh.material.needsUpdate = true;
}

function updateUI() {
    const level = levels[currentLevel - 1];
    document.getElementById('level-display').textContent = `${level.name.toUpperCase()}`;
    document.getElementById('score').textContent = `RINGS  ${score}`;
    document.getElementById('lives').textContent = `LIVES ${lives}`;
}

function gameLoop() {
    if (!gameRunning) return;

    update();

    // Render with post-processing if available
    if (composer) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }

    requestAnimationFrame(gameLoop);
}

function update() {
    frameCount++;
    const level = levels[currentLevel - 1];

    // Update timers
    if (player.spinDashTimer > 0) player.spinDashTimer--;
    else player.spinning = false;

    // Update ball mode indicator
    const ballModeEl = document.getElementById('ball-mode');
    if (ballModeEl) {
        if (player.spinning) {
            ballModeEl.classList.remove('hidden');
        } else {
            ballModeEl.classList.add('hidden');
        }
    }

    if (player.spinDashCooldown > 0) player.spinDashCooldown--;
    if (player.shootCooldown > 0) player.shootCooldown--;
    if (player.invincibleTimer > 0) {
        player.invincibleTimer--;
        player.invincible = player.invincibleTimer > 0;
    }

    // Player physics - Side scroll version
    // Jump physics
    if (player.jumping) {
        player.velocityY -= player.gravity;
        player.jumpHeight += player.velocityY;

        if (player.jumpHeight <= 0) {
            player.jumpHeight = 0;
            player.velocityY = 0;
            player.jumping = false;
        }
    }

    // Lane position (up/down movement)
    const laneY = 2 + player.lane * 1.5;
    player.y += (laneY - player.y) * 0.2;

    // Update Sonic sprite position - Side scrolling view
    if (sonicMesh) {
        // Sonic stays on left side, Y = lane position + jump height
        const finalY = player.y + player.jumpHeight;
        sonicMesh.position.set(-5, finalY, 0);

        // Running animation - bobbing movement
        if (!player.jumping && !player.spinning) {
            sonicMesh.position.y += Math.abs(Math.sin(frameCount * 0.4)) * 0.1;
        }

        // Ball form when spinning - rotate the sprite!
        if (player.spinning) {
            if (sonicMesh.children[0] && sonicMesh.children[0].material) {
                sonicMesh.children[0].material.rotation += 0.5;
            }
            sonicMesh.scale.set(0.8, 0.8, 0.8);
        } else {
            if (sonicMesh.children[0] && sonicMesh.children[0].material) {
                sonicMesh.children[0].material.rotation *= 0.9;
            }
            sonicMesh.scale.set(1, 1, 1);
        }

        // Invincibility flicker
        sonicMesh.visible = !player.invincible || Math.floor(frameCount / 5) % 2 === 0;

        // Create speed trail - more when spinning
        if (player.spinning) {
            if (frameCount % 2 === 0) createSpeedTrail();
        } else if (frameCount % 5 === 0) {
            createSpeedTrail();
        }
    }

    // Camera shake
    if (cameraShake.intensity > 0) {
        cameraShake.x = (Math.random() - 0.5) * cameraShake.intensity;
        cameraShake.y = (Math.random() - 0.5) * cameraShake.intensity;
        cameraShake.intensity *= 0.9;
        camera.position.x = cameraShake.x;
        camera.position.y = 3 + cameraShake.y;
    }

    // Animate ground texture (scrolling effect) - side scroll left
    if (groundMesh && groundMesh.material.map) {
        const groundSpeedMult = player.spinning ? 2.0 : 1.0;
        groundMesh.material.map.offset.x += gameSpeed * 0.02 * groundSpeedMult;
    }

    // Update particles
    updateParticles();
    updateSpeedTrail();

    // Update projectiles - side scroll (move right)
    projectiles.forEach((proj, index) => {
        proj.position.x += proj.userData.speed;

        // Different rotation/animation based on weapon type
        switch(proj.userData.weaponType) {
            case 'ring':
                proj.rotation.z += 0.3;
                break;
            case 'fireball':
                proj.rotation.x += 0.2;
                proj.rotation.y += 0.2;
                break;
            case 'lightning':
                proj.position.y += Math.sin(frameCount * 0.5) * 0.02;
                break;
            case 'laser':
                // Laser stays straight
                break;
            case 'star':
                proj.rotation.x += 0.3;
                proj.rotation.y += 0.3;
                proj.rotation.z += 0.3;
                break;
            case 'ice':
                proj.rotation.z += 0.1;
                break;
            default:
                proj.rotation.z += 0.3;
        }

        if (proj.position.x > 15) {
            scene.remove(proj);
            projectiles.splice(index, 1);
        }
    });

    if (level.type === 'runner') {
        updateRunnerLevel(level);
    } else {
        updateBossLevel(level);
    }
}

function updateRunnerLevel(level) {
    // Ball form = faster speed!
    const speedMultiplier = player.spinning ? 1.5 : 1.0;
    levelProgress += player.spinning ? 2 : 1;  // Progress faster in ball form

    // Spawn obstacles with more variety and frequency - MORE JUMP OBSTACLES
    if (frameCount % Math.floor(45 / level.difficulty) === 0) {
        const rand = Math.random();
        let type;

        // Weight distribution - more barriers and jump obstacles!
        if (rand < 0.15) type = 'spike';
        else if (rand < 0.25) type = 'badnik';
        else if (rand < 0.35) type = 'wall';
        else if (rand < 0.60) type = 'barrier';  // 25% chance - jump over these!
        else if (rand < 0.75) type = 'laser';
        else if (rand < 0.85) type = 'mine';
        else type = 'lowbarrier';  // New low barrier - must jump!

        const lane = Math.floor(Math.random() * 3) - 1;
        createObstacle(type, lane, 15);
    }

    // Extra jump obstacles spawn
    if (frameCount % Math.floor(80 / level.difficulty) === 0) {
        const lane = Math.floor(Math.random() * 3) - 1;
        createObstacle('barrier', lane, 15);
    }

    // Spawn obstacle patterns - MORE JUMP PATTERNS!
    if (frameCount % Math.floor(150 / level.difficulty) === 0) {
        const pattern = Math.floor(Math.random() * 8);

        if (pattern === 0) {
            // Line of obstacles across all lanes
            for (let lane = -1; lane <= 1; lane++) {
                createObstacle('spike', lane, 15 + lane * 2);
            }
        } else if (pattern === 1) {
            // Zigzag pattern
            createObstacle('badnik', -1, 15);
            createObstacle('badnik', 0, 18);
            createObstacle('badnik', 1, 21);
        } else if (pattern === 2) {
            // Wall with gap
            const gapLane = Math.floor(Math.random() * 3) - 1;
            for (let lane = -1; lane <= 1; lane++) {
                if (lane !== gapLane) {
                    createObstacle('wall', lane, 15);
                }
            }
        } else if (pattern === 3) {
            // Double barrier - JUMP JUMP!
            createObstacle('barrier', 0, 15);
            createObstacle('barrier', 0, 21);
        } else if (pattern === 4) {
            // Triple jump challenge - barriers across all lanes
            for (let lane = -1; lane <= 1; lane++) {
                createObstacle('lowbarrier', lane, 15);
            }
        } else if (pattern === 5) {
            // Hurdle row
            createObstacle('hurdle', -1, 15);
            createObstacle('hurdle', 0, 15);
            createObstacle('hurdle', 1, 15);
        } else if (pattern === 6) {
            // Mixed jump obstacles
            createObstacle('barrier', -1, 15);
            createObstacle('lowbarrier', 0, 18);
            createObstacle('barrier', 1, 21);
        } else if (pattern === 7) {
            // Jump then dodge
            createObstacle('barrier', 0, 15);
            createObstacle('mine', -1, 20);
            createObstacle('mine', 1, 20);
        }
    }

    // Spawn rings more frequently
    if (frameCount % 50 === 0) {
        const lane = Math.floor(Math.random() * 3) - 1;
        createRing(lane, 15);
    }

    // Ring patterns
    if (frameCount % 120 === 0) {
        const pattern = Math.floor(Math.random() * 3);

        if (pattern === 0) {
            // Horizontal line
            for (let lane = -1; lane <= 1; lane++) {
                createRing(lane, 15);
            }
        } else if (pattern === 1) {
            // Vertical line
            const lane = Math.floor(Math.random() * 3) - 1;
            for (let i = 0; i < 3; i++) {
                createRing(lane, 15 + i * 3);
            }
        } else if (pattern === 2) {
            // Diagonal
            createRing(-1, 15);
            createRing(0, 18);
            createRing(1, 21);
        }
    }

    // ==================== SPAWN SONIC WORLD ELEMENTS ====================

    // Spawn Springs
    if (frameCount % 180 === 0) {
        const springType = Math.random() > 0.7 ? 'red' : 'yellow';
        const lane = Math.floor(Math.random() * 3) - 1;
        createSpring(15, 1.2 + lane * 1.5, springType);
    }

    // Spawn Item Boxes
    if (frameCount % 200 === 0) {
        const lane = Math.floor(Math.random() * 3) - 1;
        createItemBox(15, 2.5 + lane * 1.5, 'random');
    }

    // Spawn Dash Panels
    if (frameCount % 250 === 0) {
        const lane = Math.floor(Math.random() * 3) - 1;
        createDashPanel(15, 1.1 + lane * 1.5);
    }

    // Spawn Ramps
    if (frameCount % 300 === 0) {
        const lane = Math.floor(Math.random() * 3) - 1;
        createRamp(15, 1.3 + lane * 1.5, 'up');
    }

    // Spawn Moving Platforms
    if (frameCount % 350 === 0) {
        createPlatform(15, 3.5, 'vertical', 2);
    }

    // Spawn Checkpoints at level milestones
    if (levelProgress === 200 || levelProgress === 400) {
        createCheckpoint(15, 1.2);
    }

    // Spawn Pipes occasionally
    if (frameCount % 400 === 0 && Math.random() > 0.5) {
        createPipe(15, 2, 8, 4);  // Entry at 15, exit at 8, higher position
    }

    // ==================== UPDATE SONIC WORLD ELEMENTS ====================

    // Update power-up timers
    if (speedBoostTimer > 0) {
        speedBoostTimer--;
        if (speedBoostTimer === 0) {
            hasSpeedBoost = false;
            gameSpeed = skins[equippedSkin].power === 'speed' || skins[equippedSkin].power === 'all' ? 0.25 : 0.18;
        }
    }

    if (invincibilityTimer > 0) {
        invincibilityTimer--;
        if (invincibilityTimer === 0) {
            hasInvincibility = false;
        }
    }

    // Update Springs
    springs.forEach((spring, index) => {
        spring.position.x -= gameSpeed * level.difficulty * speedMultiplier;

        // Animate spring
        if (spring.userData.animTimer > 0) {
            spring.userData.animTimer--;
            spring.scale.y = 0.5 + (spring.userData.animTimer / 20) * 0.5;
        } else {
            spring.scale.y = 1;
        }

        // Check collision with player
        const sonicX = -5;
        const sonicY = player.y + player.jumpHeight;

        if (Math.abs(spring.position.x - sonicX) < 0.8 &&
            Math.abs(spring.position.y - sonicY) < 1 &&
            !spring.userData.activated) {

            spring.userData.activated = true;
            spring.userData.animTimer = 20;
            player.velocityY = spring.userData.bounceForce;
            player.jumping = true;
            hasDoubleJumped = false;
            playSpringSound();
            createParticleEffect(spring.position.x, spring.position.y, 0, spring.userData.type === 'red' ? 0xFF0000 : 0xFFFF00, 5);
        }

        // Reset activation when Sonic passes
        if (spring.position.x < sonicX - 2) {
            spring.userData.activated = false;
        }

        // Remove off-screen
        if (spring.position.x < -15) {
            scene.remove(spring);
            springs.splice(index, 1);
        }
    });

    // Update Item Boxes
    itemBoxes.forEach((box, index) => {
        box.position.x -= gameSpeed * level.difficulty * speedMultiplier;

        // Bobbing animation
        box.position.y += Math.sin(frameCount * 0.1 + box.userData.bobOffset) * 0.01;
        box.rotation.y += 0.02;

        // Check collision with player
        const sonicX = -5;
        const sonicY = player.y + player.jumpHeight;

        if (!box.userData.collected &&
            Math.abs(box.position.x - sonicX) < 0.8 &&
            Math.abs(box.position.y - sonicY) < 1) {

            box.userData.collected = true;
            playItemBoxSound();
            createParticleEffect(box.position.x, box.position.y, 0, 0xFFFFFF, 8);

            // Apply power-up effect
            switch(box.userData.powerUp) {
                case 'shield':
                    hasShield = true;
                    createParticleEffect(sonicX, sonicY, 0, 0x00BFFF, 10);
                    break;
                case 'speed':
                    hasSpeedBoost = true;
                    speedBoostTimer = 300;  // 5 seconds at 60fps
                    gameSpeed = 0.35;
                    createParticleEffect(sonicX, sonicY, 0, 0xFF4500, 10);
                    break;
                case 'invincibility':
                    hasInvincibility = true;
                    invincibilityTimer = 600;  // 10 seconds
                    player.invincible = true;
                    player.invincibleTimer = 600;
                    createParticleEffect(sonicX, sonicY, 0, 0xFFD700, 15);
                    break;
                case 'extralife':
                    lives++;
                    updateUI();
                    createParticleEffect(sonicX, sonicY, 0, 0x00FF00, 10);
                    break;
                case 'rings':
                    score += 50;
                    coins += 10;
                    updateCoinDisplay();
                    updateUI();
                    createParticleEffect(sonicX, sonicY, 0, 0xFFCC00, 10);
                    break;
            }

            scene.remove(box);
            itemBoxes.splice(index, 1);
        }

        // Remove off-screen
        if (box.position.x < -15) {
            scene.remove(box);
            itemBoxes.splice(index, 1);
        }
    });

    // Update Dash Panels
    dashPanels.forEach((panel, index) => {
        panel.position.x -= gameSpeed * level.difficulty * speedMultiplier;

        // Check collision with player
        const sonicX = -5;
        const sonicY = player.y + player.jumpHeight;

        if (Math.abs(panel.position.x - sonicX) < 1 &&
            Math.abs(panel.position.y - sonicY) < 0.5 &&
            panel.userData.cooldown === 0) {

            panel.userData.cooldown = 60;
            playDashSound();

            // Speed boost effect
            if (!hasSpeedBoost) {
                hasSpeedBoost = true;
                speedBoostTimer = 120;  // 2 seconds
                gameSpeed = 0.35;
            }
            createParticleEffect(sonicX, sonicY, 0, 0xFF6600, 8);
        }

        if (panel.userData.cooldown > 0) {
            panel.userData.cooldown--;
        }

        // Remove off-screen
        if (panel.position.x < -15) {
            scene.remove(panel);
            dashPanels.splice(index, 1);
        }
    });

    // Update Ramps
    ramps.forEach((ramp, index) => {
        ramp.position.x -= gameSpeed * level.difficulty * speedMultiplier;

        // Check collision with player
        const sonicX = -5;
        const sonicY = player.y + player.jumpHeight;

        if (Math.abs(ramp.position.x - sonicX) < 1.2 &&
            Math.abs(ramp.position.y - sonicY) < 0.8 &&
            !player.jumping) {

            // Launch player
            player.velocityY = ramp.userData.launchForce;
            player.jumping = true;
            hasDoubleJumped = false;
            playJumpSound();
            createParticleEffect(ramp.position.x, ramp.position.y, 0, 0x8B4513, 5);
        }

        // Remove off-screen
        if (ramp.position.x < -15) {
            scene.remove(ramp);
            ramps.splice(index, 1);
        }
    });

    // Update Moving Platforms
    platforms.forEach((platform, index) => {
        platform.position.x -= gameSpeed * level.difficulty * speedMultiplier;

        // Platform movement
        if (platform.userData.moveType === 'vertical') {
            platform.position.y += platform.userData.speed * platform.userData.direction;
            if (Math.abs(platform.position.y - platform.userData.startY) > platform.userData.range) {
                platform.userData.direction *= -1;
            }
        } else if (platform.userData.moveType === 'horizontal') {
            // Horizontal movement relative to base scroll
            platform.userData.startX -= gameSpeed * level.difficulty * speedMultiplier;
        }

        // Check if player is on platform
        const sonicX = -5;
        const sonicY = player.y + player.jumpHeight;

        if (Math.abs(platform.position.x - sonicX) < 1.2 &&
            sonicY <= platform.position.y + 0.5 &&
            sonicY >= platform.position.y - 0.3 &&
            player.velocityY <= 0) {

            // Land on platform
            player.jumpHeight = platform.position.y - player.y + 0.3;
            player.velocityY = 0;
            player.jumping = false;

            // Move with platform vertically
            if (platform.userData.moveType === 'vertical') {
                player.y += platform.userData.speed * platform.userData.direction * 0.5;
            }
        }

        // Remove off-screen
        if (platform.position.x < -15) {
            scene.remove(platform);
            platforms.splice(index, 1);
        }
    });

    // Update Checkpoints
    checkpoints.forEach((checkpoint, index) => {
        checkpoint.position.x -= gameSpeed * level.difficulty * speedMultiplier;

        // Spin animation
        if (checkpoint.children[1]) {
            checkpoint.children[1].rotation.y += checkpoint.userData.spinSpeed;
        }
        if (checkpoint.children[2]) {
            checkpoint.children[2].rotation.y -= checkpoint.userData.spinSpeed * 2;
            checkpoint.children[2].rotation.x += checkpoint.userData.spinSpeed;
        }

        // Check collision with player
        const sonicX = -5;
        const sonicY = player.y + player.jumpHeight;

        if (!checkpoint.userData.activated &&
            Math.abs(checkpoint.position.x - sonicX) < 1 &&
            Math.abs(checkpoint.position.y + 1.5 - sonicY) < 2) {

            checkpoint.userData.activated = true;
            checkpoint.userData.spinSpeed = 0.2;  // Spin faster when activated

            // Change color to red
            if (checkpoint.children[1] && checkpoint.children[1].material) {
                checkpoint.children[1].material.color.setHex(0xFF0000);
                checkpoint.children[1].material.emissive.setHex(0xFF0000);
            }

            playCheckpointSound();
            createParticleEffect(checkpoint.position.x, checkpoint.position.y + 3, 0, 0xFFD700, 15);

            // Bonus rings
            score += 20;
            coins += 5;
            updateCoinDisplay();
            updateUI();
        }

        // Slow down spin after activation
        if (checkpoint.userData.activated && checkpoint.userData.spinSpeed > 0.05) {
            checkpoint.userData.spinSpeed *= 0.99;
        }

        // Remove off-screen
        if (checkpoint.position.x < -15) {
            scene.remove(checkpoint);
            checkpoints.splice(index, 1);
        }
    });

    // Update Pipes
    pipes.forEach((pipe, index) => {
        pipe.position.x -= gameSpeed * level.difficulty * speedMultiplier;

        // Animate glow
        if (pipe.children[2] && pipe.children[2].material) {
            pipe.children[2].material.opacity = 0.3 + Math.sin(frameCount * 0.1) * 0.2;
        }

        // Check collision with player (pipe entry)
        const sonicX = -5;
        const sonicY = player.y + player.jumpHeight;

        if (!pipe.userData.isInPipe &&
            Math.abs(pipe.position.x - sonicX) < 1 &&
            Math.abs(pipe.position.y - sonicY) < 1) {

            pipe.userData.isInPipe = true;

            // Teleport effect - move Sonic through pipe
            createParticleEffect(pipe.position.x, pipe.position.y, 0, 0x00FFFF, 10);
            playDashSound();

            // Boost player forward and up
            hasSpeedBoost = true;
            speedBoostTimer = 60;
            gameSpeed = 0.35;
            player.velocityY = 0.3;
            player.jumping = true;

            // Add bonus
            score += 10;
            updateUI();
        }

        // Remove off-screen
        if (pipe.position.x < -15) {
            scene.remove(pipe);
            pipes.splice(index, 1);
        }
    });

    // ==================== END UPDATE SONIC WORLD ELEMENTS ====================

    // Update obstacles
    obstacles.forEach((obs, index) => {
        if (obs.userData.dead) return;

        // Side-scroll: move left (negative X)
        obs.position.x -= gameSpeed * level.difficulty * speedMultiplier;

        // Different rotation for different obstacle types
        if (obs.userData.type === 'badnik') {
            obs.rotation.y += 0.08;
        } else if (obs.userData.type === 'mine') {
            obs.rotation.y += 0.05;
            obs.position.y = 1.5 + Math.sin(frameCount * 0.1 + index) * 0.2; // Floating animation

            // Blinking light effect
            if (obs.userData.blinkTimer !== undefined) {
                obs.userData.blinkTimer++;
                if (obs.children.length > 6) {
                    const light = obs.children[obs.children.length - 1];
                    if (light.isLight) {
                        light.intensity = Math.sin(obs.userData.blinkTimer * 0.2) * 0.5 + 0.5;
                    }
                }
            }
        } else if (obs.userData.type === 'laser') {
            // Pulsing laser effect
            if (obs.material) {
                obs.material.emissiveIntensity = 1 + Math.sin(frameCount * 0.15) * 0.5;
            }
        }

        // Check collision with projectiles
        projectiles.forEach((proj, pIndex) => {
            if (obs.position.distanceTo(proj.position) < 0.8) {
                obs.userData.dead = true;
                createExplosion(obs.position.x, obs.position.y, obs.position.z);
                scene.remove(obs);
                scene.remove(proj);
                obstacles.splice(index, 1);
                projectiles.splice(pIndex, 1);
                score += 5;
                coins += 2;
                updateCoinDisplay();
                updateUI();
            }
        });

        // Check collision with player (adjusted for different obstacle types)
        let collisionDistance = 0.8;
        let collisionHeight = 0.8;

        // Adjust collision based on obstacle type
        if (obs.userData.type === 'barrier') {
            collisionHeight = 0.5; // Barrier is lower, can jump over
        } else if (obs.userData.type === 'wall') {
            collisionHeight = 1.2; // Wall is taller
        } else if (obs.userData.type === 'mine') {
            collisionHeight = 1.0; // Mine floats higher
        } else if (obs.userData.type === 'laser') {
            collisionHeight = 1.5; // Laser is very tall
            collisionDistance = 0.3; // Laser is thin
        } else if (obs.userData.type === 'lowbarrier') {
            collisionHeight = 0.4; // Low barrier - easy to jump
            collisionDistance = 1.0; // Wide
        } else if (obs.userData.type === 'hurdle') {
            collisionHeight = 0.6; // Hurdle height
            collisionDistance = 0.6;
        }

        // Side-scroll collision: player at X=-5, check if obstacle is near
        const sonicX = -5;
        const sonicY = player.y + player.jumpHeight;

        if (!obs.userData.dead && Math.abs(obs.position.x - sonicX) < collisionDistance &&
            Math.abs(obs.position.y - sonicY) < collisionHeight) {

            if (player.spinning) {
                obs.userData.dead = true;
                createExplosion(obs.position.x, obs.position.y, obs.position.z);
                scene.remove(obs);
                obstacles.splice(index, 1);
                score += 5;
                coins += 2;
                updateCoinDisplay();
                updateUI();
            } else if (!player.invincible) {
                loseLife();
                scene.remove(obs);
                obstacles.splice(index, 1);
            }
        }

        // Remove off-screen (left side)
        if (obs.position.x < -15) {
            scene.remove(obs);
            obstacles.splice(index, 1);
        }
    });

    // Update rings - side-scroll movement
    rings.forEach((ring, index) => {
        if (ring.userData.collected) return;

        // Move left
        ring.position.x -= gameSpeed * level.difficulty * speedMultiplier;
        ring.rotation.z += ring.userData.spinSpeed || 0.15; // Spin animation

        const sonicX = -5;
        const sonicY = player.y + player.jumpHeight;

        if (Math.abs(ring.position.x - sonicX) < 1.2 &&
            Math.abs(ring.position.y - sonicY) < 1.5) {
            ring.userData.collected = true;
            createParticleEffect(ring.position.x, ring.position.y, ring.position.z, 0xFFD700, 5);
            scene.remove(ring);
            rings.splice(index, 1);
            score += 10;
            coins += 1;
            updateCoinDisplay();
            updateUI();
            playRingSound();
        }

        // Remove off-screen (left side)
        if (ring.position.x < -15) {
            scene.remove(ring);
            rings.splice(index, 1);
        }
    });

    // Level completion
    if (levelProgress > 600) {
        nextLevel();
    }
}

function updateBossLevel(level) {
    if (!bossMesh) {
        createBoss();
        // Boss health based on level
        if (currentLevel === 15) {
            bossHealth = 150;  // Final Boss - hardest
        } else if (currentLevel === 10) {
            bossHealth = 80;   // Ultra Boss
        } else if (currentLevel === 6) {
            bossHealth = 60;   // Mega Boss
        } else {
            bossHealth = 50;   // Regular Boss
        }
        bossMaxHealth = bossHealth;
    }

    // Boss movement - up/down on right side of screen
    bossY += bossVelocityY;
    if (bossY <= 1.5 || bossY >= 4.5) {
        bossVelocityY *= -1;
    }
    bossMesh.position.y = bossY;

    // Side-scroll: boss stays on right side, moves up/down
    let sideSpeed = 0.02;
    if (currentLevel === 6) sideSpeed = 0.025;
    if (currentLevel === 10) sideSpeed = 0.03;
    if (currentLevel === 15) sideSpeed = 0.035;
    bossMesh.position.x = 6 + Math.sin(frameCount * sideSpeed) * 1.5;

    bossMesh.rotation.z += 0.03;  // Rotate facing camera

    // Rotate armor plates
    for (let i = 1; i < 13; i++) {
        if (bossMesh.children[i]) {
            bossMesh.children[i].rotation.z += 0.02;
        }
    }

    // Boss attacks - balanced speed
    bossAttackTimer++;

    // Different attack patterns for different bosses
    let attackRate;
    if (currentLevel === 3) {
        attackRate = 120;  // Boss Fight - shoots every 120 frames
    } else if (currentLevel === 6) {
        attackRate = 100;  // Mega Boss - shoots a bit faster
    } else if (currentLevel === 10) {
        attackRate = 80;   // Ultra Boss - faster
    } else if (currentLevel === 15) {
        attackRate = 60;   // Final Boss - fastest
    } else {
        attackRate = 150;
    }

    if (bossAttackTimer > attackRate / level.difficulty) {
        bossAttackTimer = 0;

        // Create projectile aimed at Sonic!
        createBossProjectileAimed();

        // Mega Boss, Ultra Boss, and Final Boss shoot multiple projectiles
        if (currentLevel === 6 && Math.random() > 0.5) {
            setTimeout(() => createBossProjectileAimed(), 200);
        }
        if (currentLevel === 10) {
            // Ultra Boss shoots double shots
            setTimeout(() => createBossProjectileAimed(), 150);
            if (Math.random() > 0.6) {
                setTimeout(() => createBossProjectileAimed(), 300);
            }
        }
        if (currentLevel === 15) {
            // Final Boss shoots spread pattern
            setTimeout(() => createBossProjectileSpread(), 100);
        }
    }

    // Ultra Boss special attack - spread shot
    if (currentLevel === 10 && frameCount % 400 === 0) {
        createBossProjectileSpread();
    }

    // Final Boss special attack - laser barrage
    if (currentLevel === 15 && frameCount % 350 === 0) {
        createBossLaserBarrage();
    }

    // Update boss projectiles - side scroll
    bossProjectiles.forEach((proj, index) => {
        // Move projectile toward Sonic (left)
        if (proj.userData.velocityX) proj.position.x += proj.userData.velocityX;
        if (proj.userData.velocityY) proj.position.y += proj.userData.velocityY;

        // Rotate for visual effect
        proj.rotation.z += 0.15;

        // Collision detection
        const sonicX = -5;
        const sonicY = player.y + player.jumpHeight;
        const hitboxSize = proj.userData.isLaser ? 0.7 : 0.6;

        if (Math.abs(proj.position.x - sonicX) < hitboxSize &&
            Math.abs(proj.position.y - sonicY) < hitboxSize) {

            if (player.spinning) {
                createExplosion(proj.position.x, proj.position.y, proj.position.z);
                scene.remove(proj);
                bossProjectiles.splice(index, 1);
                score += 5;
                coins += 1;
                updateCoinDisplay();
                updateUI();
            } else if (!player.invincible) {
                loseLife();
                scene.remove(proj);
                bossProjectiles.splice(index, 1);
            }
        }

        // Remove off-screen projectiles
        if (proj.position.x < -12 || proj.position.y < -2 || proj.position.y > 8) {
            scene.remove(proj);
            bossProjectiles.splice(index, 1);
        }
    });

    // Check projectile hits on boss
    projectiles.forEach((proj, index) => {
        if (bossMesh.position.distanceTo(proj.position) < 1.5) {
            bossHealth -= 5;
            createParticleEffect(proj.position.x, proj.position.y, proj.position.z, 0xFF4500, 20);
            scene.remove(proj);
            projectiles.splice(index, 1);
            score += 10;
            coins += 1;
            updateCoinDisplay();
            updateUI();
            cameraShake.intensity = 0.1;

            // Flash effect
            bossMesh.children[0].material.emissiveIntensity = 1.5;
            setTimeout(() => {
                if (bossMesh) bossMesh.children[0].material.emissiveIntensity = 0.6;
            }, 100);
        }
    });

    // Boss defeated
    if (bossHealth <= 0) {
        createExplosion(bossMesh.position.x, bossMesh.position.y, bossMesh.position.z);
        createExplosion(bossMesh.position.x + 1, bossMesh.position.y, bossMesh.position.z);
        createExplosion(bossMesh.position.x - 1, bossMesh.position.y, bossMesh.position.z);
        cameraShake.intensity = 0.5;
        scene.remove(bossMesh);
        bossMesh = null;
        score += 100;
        coins += 20;
        updateCoinDisplay();
        updateUI();
        setTimeout(() => nextLevel(), 1000);
    }
}

function loseLife() {
    lives--;
    player.invincible = true;
    player.invincibleTimer = 90;
    cameraShake.intensity = 0.3;
    updateUI();
    playHitSound();

    if (lives <= 0) {
        gameOver();
    }
}

function nextLevel() {
    currentLevel++;

    if (currentLevel > 15) {
        victory();
        return;
    }

    // Clear scene
    obstacles.forEach(obs => scene.remove(obs));
    rings.forEach(ring => scene.remove(ring));
    projectiles.forEach(proj => scene.remove(proj));
    bossProjectiles.forEach(proj => scene.remove(proj));
    if (bossMesh) scene.remove(bossMesh);

    // Clear world elements
    springs.forEach(s => scene.remove(s));
    pipes.forEach(p => scene.remove(p));
    itemBoxes.forEach(b => scene.remove(b));
    dashPanels.forEach(d => scene.remove(d));
    ramps.forEach(r => scene.remove(r));
    platforms.forEach(p => scene.remove(p));
    checkpoints.forEach(c => scene.remove(c));

    obstacles = [];
    rings = [];
    projectiles = [];
    bossProjectiles = [];
    bossMesh = null;

    springs = [];
    pipes = [];
    itemBoxes = [];
    dashPanels = [];
    ramps = [];
    platforms = [];
    checkpoints = [];

    levelProgress = 0;
    frameCount = 0;
    bossAttackTimer = 0;

    updateLevelColors();
    updateUI();
}

function gameOver() {
    gameRunning = false;
    stopBackgroundMusic();
    updateCoinDisplay();
    document.getElementById('final-score').textContent = `Final Score: ${score} rings | Total Coins: ${coins}`;
    document.getElementById('game-over-screen').classList.remove('hidden');
}

function victory() {
    gameRunning = false;
    stopBackgroundMusic();
    coins += 50;
    updateCoinDisplay();
    document.getElementById('victory-score').textContent = `Final Score: ${score} rings | Total Coins: ${coins}`;
    document.getElementById('victory-screen').classList.remove('hidden');
}

// Initialize
initThree();
initShop();
equipSkin(equippedSkin);
updateWeaponUI();

// Start game buttons
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('menu-btn').addEventListener('click', goToMainMenu);
document.getElementById('victory-menu-btn').addEventListener('click', goToMainMenu);

function goToMainMenu() {
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('victory-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
}
document.getElementById('play-again-btn').addEventListener('click', startGame);

// Music toggle button
document.getElementById('music-btn').addEventListener('click', () => {
    initAudio();
    toggleMusic();
});

// Render initial scene
if (composer) {
    composer.render();
} else {
    renderer.render(scene, camera);
}
