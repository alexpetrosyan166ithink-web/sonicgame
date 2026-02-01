// Three.js 3D Game Setup with PS-Quality Graphics
let scene, camera, renderer, composer;
let sonicMesh, groundMesh;
let obstacles = [];
let rings = [];
let projectiles = [];
let bossProjectiles = [];
let particleSystem = [];
let speedTrail = [];

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

function createEnhancedSonic() {
    const sonicGroup = new THREE.Group();

    // Load real Sonic SVG as texture
    const loader = new THREE.TextureLoader();
    const sonicTexture = loader.load('sonic.svg');
    sonicTexture.magFilter = THREE.LinearFilter;
    sonicTexture.minFilter = THREE.LinearFilter;

    // Create sprite material with the SVG
    const spriteMaterial = new THREE.SpriteMaterial({
        map: sonicTexture,
        transparent: true
    });

    // Create sprite
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2.5, 3, 1);  // Adjusted for Sonic's proportions
    sonicGroup.add(sprite);

    // Also keep a simple 3D hitbox for collisions (invisible)
    const hitboxGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const hitboxMaterial = new THREE.MeshBasicMaterial({
        visible: false
    });
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

    obstacles = [];
    rings = [];
    projectiles = [];
    bossProjectiles = [];
    particleSystem = [];
    speedTrail = [];
    bossMesh = null;

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

    obstacles = [];
    rings = [];
    projectiles = [];
    bossProjectiles = [];
    bossMesh = null;

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
