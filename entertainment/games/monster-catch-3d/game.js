(() => {
    const $ = (id) => document.getElementById(id);
    const canvas = $('scene');
    const unsupported = $('unsupported');
    const startScreen = $('start-screen');
    const pauseScreen = $('pause-screen');
    const completeScreen = $('complete-screen');
    const completeText = $('completeText');
    const ballsLabel = $('ballsLabel');
    const caughtLabel = $('caughtLabel');
    const coinsLabel = $('coinsLabel');
    const targetLabel = $('targetLabel');
    const progressLabel = $('progressLabel');
    const sceneLabel = $('sceneLabel');
    const scanLabel = $('scanLabel');
    const detailSpot = $('detailSpot');
    const detailName = $('detailName');
    const detailType = $('detailType');
    const detailDesc = $('detailDesc');
    const dexGrid = $('dexGrid');
    const statusBar = $('status-bar');
    const startBtn = $('startBtn');
    const pauseBtn = $('pauseBtn');
    const resumeBtn = $('resumeBtn');
    const resetBtn = $('resetBtn');
    const restartBtn = $('restartBtn');
    const recenterBtn = $('recenterBtn');
    const continueBtn = $('continueBtn');
    const newRunBtn = $('newRunBtn');

    const SAVE_KEY = 'alex-games-monster-catch-3d-v1';
    const WORLD_LIMIT = 46;
    const BASE_RADIUS = 5.4;
    const MAX_BALLS = 30;
    const SPECIES = [
        {
            id: 'mosslet',
            name: 'Mosslet',
            type: 'Leaf',
            rarity: 'Common',
            color: 0x78d46a,
            accent: 0x355f31,
            baseCatch: 0.66,
            reward: 10,
            description: 'A shy meadow sprout that vanishes into the grass when startled.',
            spawnWeight: 4,
            model: 'mosslet'
        },
        {
            id: 'emberlit',
            name: 'Emberlit',
            type: 'Flame',
            rarity: 'Uncommon',
            color: 0xff8a4a,
            accent: 0xb64c22,
            baseCatch: 0.52,
            reward: 14,
            description: 'Warm and quick, this spark creature zigzags through the hill paths.',
            spawnWeight: 3,
            model: 'emberlit'
        },
        {
            id: 'tidepuff',
            name: 'Tidepuff',
            type: 'Wave',
            rarity: 'Common',
            color: 0x73c8ff,
            accent: 0x2b6995,
            baseCatch: 0.62,
            reward: 11,
            description: 'A floating water creature that drifts close to ponds and cool stones.',
            spawnWeight: 4,
            model: 'tidepuff'
        },
        {
            id: 'voltfox',
            name: 'Voltfox',
            type: 'Spark',
            rarity: 'Rare',
            color: 0xf6e35f,
            accent: 0xbf9e15,
            baseCatch: 0.38,
            reward: 19,
            description: 'Sharp and alert, this bright creature bolts across the field in flashes.',
            spawnWeight: 2,
            model: 'voltfox'
        },
        {
            id: 'moonkin',
            name: 'Moonkin',
            type: 'Glow',
            rarity: 'Rare',
            color: 0xd8f1e4,
            accent: 0x5bb6a0,
            baseCatch: 0.33,
            reward: 22,
            description: 'A gentle nocturnal creature that circles the field under the moonlight.',
            spawnWeight: 1,
            model: 'moonkin'
        }
    ];

    const dexState = new Map();
    SPECIES.forEach((species) => {
        dexState.set(species.id, {
            seen: false,
            caught: 0
        });
    });

    const state = {
        started: false,
        paused: false,
        finished: false,
        messageTimer: 0,
        messageTone: 'good',
        balls: 24,
        coins: 0,
        caughtTotal: 0,
        captureCombo: 0,
        scanTarget: null,
        activeTarget: null,
        respawnTimer: 0,
        savePending: false
    };

    const input = {
        keys: {},
        throwQueued: false,
        scanQueued: false,
        pauseQueued: false,
        recenterQueued: false
    };

    let scene;
    let camera;
    let renderer;
    let clock;
    let terrain;
    let baseHub;
    let player;
    let playerAim = new THREE.Vector3(0, 0, 1);
    let creatures = [];
    let capsules = [];
    let sparkles = [];
    let floatingTexts = [];
    let groundSampler = null;
    let targetMarker = null;
    let terrainReady = false;
    let cameraAngle = -0.82;
    let cameraDistance = 19.5;
    let cameraHeight = 12.5;
    let cameraResetTimer = 0;

    function loadSave() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            state.coins = Number(parsed.coins || 0);
            state.caughtTotal = Number(parsed.caughtTotal || 0);
            state.balls = Math.min(MAX_BALLS, Math.max(6, Number(parsed.balls || state.balls)));
            if (Array.isArray(parsed.dex)) {
                parsed.dex.forEach((entry) => {
                    if (!entry || !entry.id || !dexState.has(entry.id)) return;
                    const slot = dexState.get(entry.id);
                    slot.seen = Boolean(entry.seen);
                    slot.caught = Number(entry.caught || 0);
                });
            }
        } catch (error) {
            console.warn('Monster Catch save load failed', error);
        }
    }

    function saveProgress() {
        const payload = {
            coins: state.coins,
            caughtTotal: state.caughtTotal,
            balls: state.balls,
            dex: SPECIES.map((species) => ({
                id: species.id,
                seen: dexState.get(species.id).seen,
                caught: dexState.get(species.id).caught
            }))
        };
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
        } catch (error) {
            console.warn('Monster Catch save failed', error);
        }
    }

    function clearSave() {
        localStorage.removeItem(SAVE_KEY);
    }

    function setMessage(text, tone = 'good', duration = 2200) {
        statusBar.textContent = text;
        statusBar.classList.remove('good', 'warn', 'visible');
        if (tone) {
            statusBar.classList.add(tone);
        }
        requestAnimationFrame(() => statusBar.classList.add('visible'));
        state.messageTone = tone;
        state.messageTimer = duration / 1000;
    }

    function createRenderer() {
        try {
            renderer = new THREE.WebGLRenderer({
                canvas,
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance'
            });
        } catch (error) {
            unsupported.classList.remove('hidden');
            return false;
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.physicallyCorrectLights = false;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        return true;
    }

    function sampleHeight(x, z) {
        const ridge = Math.sin(x * 0.075) * 0.45 + Math.cos(z * 0.06) * 0.4;
        const ripples = Math.sin((x + z) * 0.035) * 0.2 + Math.cos((x - z) * 0.045) * 0.18;
        const baseDip = Math.max(0, 1.0 - Math.hypot(x, z) / 70) * 0.2;
        const hubBowl = Math.max(0, 1 - Math.hypot(x, z) / 12) * -0.3;
        return ridge + ripples + baseDip + hubBowl;
    }

    function createTerrain() {
        const geo = new THREE.PlaneGeometry(150, 150, 72, 72);
        const colors = [];
        const pos = geo.attributes.position;

        for (let i = 0; i < pos.count; i += 1) {
            const x = pos.getX(i);
            const z = pos.getY(i);
            const h = sampleHeight(x, z);
            pos.setZ(i, h);

            const grass = new THREE.Color(0x6bb664);
            const moss = new THREE.Color(0x2f7a47);
            const dirt = new THREE.Color(0x667048);
            const blend = Math.min(1, Math.max(0, (h + 0.8) / 1.6));
            const edge = Math.min(1, Math.hypot(x, z) / 78);
            const color = grass.clone().lerp(moss, blend * 0.45).lerp(dirt, edge * 0.25);
            colors.push(color.r, color.g, color.b);
        }

        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geo.rotateX(-Math.PI / 2);
        geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 1,
            metalness: 0,
            flatShading: true
        });

        terrain = new THREE.Mesh(geo, mat);
        terrain.receiveShadow = true;
        scene.add(terrain);

        const pond = new THREE.Mesh(
            new THREE.CircleGeometry(7.5, 32),
            new THREE.MeshStandardMaterial({
                color: 0x71c7ff,
                roughness: 0.5,
                metalness: 0.06,
                transparent: true,
                opacity: 0.9
            })
        );
        pond.rotation.x = -Math.PI / 2;
        pond.position.set(-18, sampleHeight(-18, 12) + 0.04, 12);
        pond.receiveShadow = true;
        scene.add(pond);

        const baseRing = new THREE.Mesh(
            new THREE.RingGeometry(4.8, 6.1, 32),
            new THREE.MeshStandardMaterial({
                color: 0xc9ffd5,
                emissive: 0x123c24,
                emissiveIntensity: 0.6,
                side: THREE.DoubleSide
            })
        );
        baseRing.rotation.x = -Math.PI / 2;
        baseRing.position.y = sampleHeight(0, 0) + 0.03;
        scene.add(baseRing);

        baseHub = new THREE.Group();
        const hubBase = new THREE.Mesh(
            new THREE.CylinderGeometry(1.8, 2.2, 1.2, 10, 1, false),
            new THREE.MeshStandardMaterial({ color: 0x9df3a5, flatShading: true })
        );
        hubBase.castShadow = true;
        hubBase.receiveShadow = true;
        hubBase.position.y = 0.6;
        baseHub.add(hubBase);

        const hubTop = new THREE.Mesh(
            new THREE.ConeGeometry(1.8, 2.6, 8),
            new THREE.MeshStandardMaterial({ color: 0xdfffb5, flatShading: true })
        );
        hubTop.castShadow = true;
        hubTop.position.y = 2.6;
        baseHub.add(hubTop);

        const hubGlow = new THREE.Mesh(
            new THREE.TorusGeometry(2.8, 0.18, 8, 24),
            new THREE.MeshStandardMaterial({
                color: 0x8ff6a0,
                emissive: 0x5ef086,
                emissiveIntensity: 0.35
            })
        );
        hubGlow.rotation.x = Math.PI / 2;
        hubGlow.position.y = 1.1;
        baseHub.add(hubGlow);

        baseHub.position.set(0, sampleHeight(0, 0), 0);
        scene.add(baseHub);

        groundSampler = sampleHeight;
        terrainReady = true;
    }

    function createTree(x, z, scale = 1) {
        const group = new THREE.Group();
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.28, 1.6, 5),
            new THREE.MeshStandardMaterial({ color: 0x7a5638, flatShading: true })
        );
        trunk.position.y = 0.8;
        trunk.castShadow = true;
        group.add(trunk);

        const crown = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.15, 0),
            new THREE.MeshStandardMaterial({ color: 0x54b864, flatShading: true })
        );
        crown.position.y = 2.0;
        crown.castShadow = true;
        group.add(crown);

        const tuft = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.6, 0),
            new THREE.MeshStandardMaterial({ color: 0x7adf76, flatShading: true })
        );
        tuft.position.set(0.38, 2.4, -0.1);
        tuft.castShadow = true;
        group.add(tuft);

        group.position.set(x, sampleHeight(x, z), z);
        group.scale.setScalar(scale);
        scene.add(group);
    }

    function createRock(x, z, scale = 1) {
        const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.55, 0),
            new THREE.MeshStandardMaterial({ color: 0x89968d, flatShading: true, roughness: 1 })
        );
        rock.position.set(x, sampleHeight(x, z) + 0.3, z);
        rock.rotation.set(Math.random() * 0.4, Math.random() * 0.4, Math.random() * 0.4);
        rock.scale.setScalar(scale);
        rock.castShadow = true;
        rock.receiveShadow = true;
        scene.add(rock);
    }

    function createWorldDecor() {
        const treeSlots = [];
        for (let i = 0; i < 40; i += 1) {
            const angle = (i / 40) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
            const radius = 20 + Math.random() * 25;
            const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 3;
            const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 3;
            treeSlots.push([x, z, 0.85 + Math.random() * 0.7]);
        }
        treeSlots.forEach(([x, z, scale]) => createTree(x, z, scale));

        for (let i = 0; i < 24; i += 1) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 8 + Math.random() * 34;
            createRock(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.7 + Math.random() * 0.75);
        }

        for (let i = 0; i < 26; i += 1) {
            const flower = new THREE.Mesh(
                new THREE.SphereGeometry(0.1 + Math.random() * 0.05, 6, 6),
                new THREE.MeshStandardMaterial({
                    color: [0xffd36a, 0xff8f72, 0x9bf29b, 0x73c8ff][i % 4],
                    emissive: 0x111111,
                    emissiveIntensity: 0.15
                })
            );
            const angle = Math.random() * Math.PI * 2;
            const radius = 7 + Math.random() * 32;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            flower.position.set(x, sampleHeight(x, z) + 0.07, z);
            scene.add(flower);
        }
    }

    function createPlayer() {
        player = new THREE.Group();

        const shadow = new THREE.Mesh(
            new THREE.CircleGeometry(1.15, 18),
            new THREE.MeshBasicMaterial({ color: 0x040807, transparent: true, opacity: 0.28 })
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.03;
        player.add(shadow);

        const body = new THREE.Mesh(
            new THREE.SphereGeometry(0.62, 16, 12),
            new THREE.MeshStandardMaterial({
                color: 0xf3f0d5,
                flatShading: true,
                roughness: 0.9,
                metalness: 0
            })
        );
        body.position.y = 1.0;
        body.castShadow = true;
        player.add(body);

        const visor = new THREE.Mesh(
            new THREE.TorusGeometry(0.48, 0.08, 8, 16),
            new THREE.MeshStandardMaterial({
                color: 0x73c8ff,
                emissive: 0x1e567a,
                emissiveIntensity: 0.35
            })
        );
        visor.rotation.x = Math.PI / 2;
        visor.position.y = 1.22;
        player.add(visor);

        const backpack = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.7, 0.32),
            new THREE.MeshStandardMaterial({ color: 0x8abf74, flatShading: true })
        );
        backpack.position.set(-0.28, 1.0, -0.25);
        backpack.castShadow = true;
        player.add(backpack);

        player.position.set(0, sampleHeight(0, 0), 0);
        player.castShadow = true;
        scene.add(player);

        const indicator = new THREE.Mesh(
            new THREE.TorusGeometry(1.4, 0.05, 8, 28),
            new THREE.MeshStandardMaterial({
                color: 0xd4ff8b,
                emissive: 0x7bcb53,
                emissiveIntensity: 0.55
            })
        );
        indicator.rotation.x = Math.PI / 2;
        indicator.position.y = 0.07;
        player.add(indicator);
    }

    function creatureGeometry(speciesId) {
        if (speciesId === 'mosslet') {
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(0.88, 16, 12),
                new THREE.MeshStandardMaterial({ color: 0x78d46a, flatShading: true })
            );
            body.position.y = 1.1;
            return body;
        }
        if (speciesId === 'emberlit') {
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(0.84, 16, 12),
                new THREE.MeshStandardMaterial({ color: 0xff8a4a, flatShading: true })
            );
            body.position.y = 1.05;
            return body;
        }
        if (speciesId === 'tidepuff') {
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(0.86, 16, 12),
                new THREE.MeshStandardMaterial({ color: 0x73c8ff, flatShading: true })
            );
            body.position.y = 1.06;
            return body;
        }
        if (speciesId === 'voltfox') {
            const body = new THREE.Mesh(
                new THREE.IcosahedronGeometry(0.84, 0),
                new THREE.MeshStandardMaterial({ color: 0xf6e35f, flatShading: true })
            );
            body.position.y = 1.04;
            return body;
        }
        const body = new THREE.Mesh(
            new THREE.SphereGeometry(0.88, 16, 12),
            new THREE.MeshStandardMaterial({ color: 0xd8f1e4, flatShading: true })
        );
        body.position.y = 1.08;
        return body;
    }

    function addCreatureAccessories(species, group) {
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x10231c, flatShading: true });
        const accentMat = new THREE.MeshStandardMaterial({ color: species.accent, flatShading: true });

        const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
        leftEye.position.set(-0.22, 1.18, 0.76);
        const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
        rightEye.position.set(0.22, 1.18, 0.76);
        group.add(leftEye, rightEye);

        if (species.id === 'mosslet') {
            const leafA = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.85, 5), accentMat);
            leafA.position.set(-0.38, 1.72, 0);
            leafA.rotation.z = -0.42;
            const leafB = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.85, 5), accentMat);
            leafB.position.set(0.38, 1.72, 0);
            leafB.rotation.z = 0.42;
            group.add(leafA, leafB);
        } else if (species.id === 'emberlit') {
            const flame = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.78, 6), new THREE.MeshStandardMaterial({
                color: 0xffd36a,
                emissive: 0xff9c3a,
                emissiveIntensity: 0.35,
                flatShading: true
            }));
            flame.position.set(0, 1.82, 0);
            group.add(flame);
        } else if (species.id === 'tidepuff') {
            const finA = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.06, 6, 12), accentMat);
            finA.position.set(-0.62, 1.04, 0);
            finA.rotation.z = Math.PI / 2;
            const finB = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.06, 6, 12), accentMat);
            finB.position.set(0.62, 1.04, 0);
            finB.rotation.z = Math.PI / 2;
            const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.72, 5), accentMat);
            tail.position.set(0, 1.0, -0.82);
            tail.rotation.x = Math.PI;
            group.add(finA, finB, tail);
        } else if (species.id === 'voltfox') {
            for (let i = 0; i < 6; i += 1) {
                const spike = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.65, 4), accentMat);
                const angle = (i / 6) * Math.PI * 2;
                spike.position.set(Math.cos(angle) * 0.62, 1.42, Math.sin(angle) * 0.62);
                spike.lookAt(0, 1.38, 0);
                group.add(spike);
            }
            const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.9, 4), accentMat);
            tail.position.set(0, 0.96, -0.95);
            tail.rotation.x = Math.PI * 0.95;
            tail.rotation.z = 0.25;
            group.add(tail);
        } else if (species.id === 'moonkin') {
            const moon = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.09, 8, 20, Math.PI * 1.25), accentMat);
            moon.position.set(0.36, 1.56, -0.1);
            moon.rotation.x = Math.PI / 2;
            moon.rotation.z = -0.45;
            const earA = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 5), accentMat);
            earA.position.set(-0.32, 1.74, 0.1);
            earA.rotation.z = -0.4;
            const earB = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 5), accentMat);
            earB.position.set(0.32, 1.74, 0.1);
            earB.rotation.z = 0.4;
            group.add(moon, earA, earB);
        }
    }

    function makeCreature(species, x, z) {
        const group = new THREE.Group();
        const shadow = new THREE.Mesh(
            new THREE.CircleGeometry(1.0, 18),
            new THREE.MeshBasicMaterial({ color: 0x03100b, transparent: true, opacity: 0.25 })
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.03;
        group.add(shadow);

        const body = creatureGeometry(species.id);
        body.castShadow = true;
        group.add(body);

        addCreatureAccessories(species, group);

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(1.2, 0.07, 8, 24),
            new THREE.MeshStandardMaterial({
                color: species.color,
                emissive: species.accent,
                emissiveIntensity: 0.14
            })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.15;
        ring.visible = false;
        group.add(ring);

        const creature = {
            id: `${species.id}-${Math.random().toString(36).slice(2, 9)}`,
            species,
            group,
            body,
            ring,
            x,
            z,
            y: sampleHeight(x, z),
            bob: Math.random() * Math.PI * 2,
            wanderTimer: 0.5 + Math.random() * 2.5,
            wanderAngle: Math.random() * Math.PI * 2,
            speed: 1.05 + Math.random() * 0.65,
            fleeTimer: 0,
            scanned: false,
            alertPulse: 0,
            escapeBias: 0
        };

        group.position.set(x, creature.y, z);
        group.rotation.y = Math.random() * Math.PI * 2;
        scene.add(group);
        return creature;
    }

    function weightedSpecies() {
        const pool = [];
        SPECIES.forEach((species) => {
            for (let i = 0; i < species.spawnWeight; i += 1) {
                pool.push(species);
            }
        });
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function spawnCreature(forceSpecies = null) {
        const species = forceSpecies || weightedSpecies();
        let x = 0;
        let z = 0;
        let tries = 0;
        do {
            const angle = Math.random() * Math.PI * 2;
            const radius = 12 + Math.random() * 28;
            x = Math.cos(angle) * radius;
            z = Math.sin(angle) * radius;
            tries += 1;
        } while (tries < 12 && Math.hypot(x - player.position.x, z - player.position.z) < 10);

        const creature = makeCreature(species, x, z);
        creatures.push(creature);
        markSeen(species.id);
        return creature;
    }

    function ensureCreatureCount() {
        const activeCount = creatures.length;
        const desired = 6;
        if (activeCount >= desired) return;

        for (let i = 0; i < desired - activeCount; i += 1) {
            spawnCreature();
        }
    }

    function markSeen(speciesId) {
        const slot = dexState.get(speciesId);
        if (!slot) return;
        if (!slot.seen) {
            slot.seen = true;
            state.savePending = true;
            refreshDexUI();
        }
    }

    function markCaught(speciesId) {
        const slot = dexState.get(speciesId);
        if (!slot) return;
        slot.seen = true;
        slot.caught += 1;
        state.savePending = true;
        refreshDexUI();
    }

    function refreshDexUI() {
        dexGrid.innerHTML = '';
        SPECIES.forEach((species) => {
            const slot = dexState.get(species.id);
            const item = document.createElement('div');
            item.className = `dex-item${slot.caught > 0 ? ' caught' : slot.seen ? ' seen' : ''}`;
            item.innerHTML = `
                <div class="dex-item__top">
                    <span class="dex-dot" style="background:${toHex(species.color)}"></span>
                    <span class="dex-state">${slot.caught > 0 ? 'Captured' : slot.seen ? 'Seen' : 'Unknown'}</span>
                </div>
                <div class="dex-name">${species.name}</div>
                <div class="dex-state">${species.type} - ${species.rarity}</div>
            `;
            dexGrid.appendChild(item);
        });

        const caughtCount = SPECIES.reduce((sum, species) => sum + (dexState.get(species.id).caught > 0 ? 1 : 0), 0);
        caughtLabel.textContent = `${caughtCount} / ${SPECIES.length}`;
        progressLabel.textContent = `${caughtCount} / ${SPECIES.length} captured`;
    }

    function updateSummaryUI(target = null) {
        ballsLabel.textContent = state.balls;
        coinsLabel.textContent = state.coins;
        const caughtCount = SPECIES.reduce((sum, species) => sum + (dexState.get(species.id).caught > 0 ? 1 : 0), 0);
        caughtLabel.textContent = `${caughtCount} / ${SPECIES.length}`;
        progressLabel.textContent = `${caughtCount} / ${SPECIES.length} captured`;

        if (target) {
            targetLabel.textContent = target.species.name;
            detailSpot.style.background = `
                radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.5), transparent 34%),
                linear-gradient(135deg, ${toHex(target.species.color)}, ${toHex(target.species.accent)})
            `;
            detailName.textContent = `${target.species.name} - ${target.species.type}`;
            detailType.textContent = `${target.species.rarity} creature - base catch ${(target.species.baseCatch * 100).toFixed(0)}%`;
            detailDesc.textContent = target.scanned
                ? target.species.description
                : 'Use Scan to reveal field notes and improve your capture odds.';
            scanLabel.textContent = target.scanned ? 'Scan complete' : 'Press Scan for field notes';
        } else {
            targetLabel.textContent = 'None';
            detailSpot.style.background = `
                radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.42), transparent 34%),
                linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(0, 0, 0, 0.2))
            `;
            detailName.textContent = 'No creature targeted';
            detailType.textContent = 'Walk toward a wild creature to lock the nearest one.';
            detailDesc.textContent = 'Captured creatures are saved locally and remain visible in the log after a reload.';
            scanLabel.textContent = 'Move close and press Scan';
        }
    }

    function findNearestCreature(maxDistance = 22) {
        let nearest = null;
        let nearestDistance = maxDistance;
        const px = player.position.x;
        const pz = player.position.z;
        creatures.forEach((creature) => {
            const dx = creature.group.position.x - px;
            const dz = creature.group.position.z - pz;
            const distance = Math.hypot(dx, dz);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = creature;
            }
        });
        return nearest;
    }

    function updateTargeting() {
        const target = findNearestCreature(26);
        state.activeTarget = target;
        if (target) {
            target.ring.visible = true;
            target.ring.rotation.z += 0.04;
            targetMarker = target.group;
            updateSummaryUI(target);
        } else {
            targetMarker = null;
            updateSummaryUI(null);
        }
    }

    function scanCreature() {
        const target = findNearestCreature(22);
        if (!target) {
            setMessage('No creature is close enough to scan.', 'warn');
            return;
        }
        target.scanned = true;
        markSeen(target.species.id);
        target.alertPulse = 1.5;
        setMessage(`${target.species.name} scanned. Capture chance improved.`, 'good');
        updateSummaryUI(target);
        saveProgress();
    }

    function throwCapsule() {
        if (!state.started || state.paused || state.finished) return;
        if (state.balls <= 0) {
            setMessage('No capsules left. Return to the field lab to refill.', 'warn');
            return;
        }
        const target = findNearestCreature(25);
        if (!target) {
            setMessage('No wild creature in range.', 'warn');
            return;
        }

        const start = new THREE.Vector3(player.position.x, player.position.y + 1.25, player.position.z);
        const end = new THREE.Vector3(target.group.position.x, target.group.position.y + 1.1, target.group.position.z);
        const capsule = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 12, 12),
            new THREE.MeshStandardMaterial({
                color: 0xfff7e0,
                emissive: 0xffcf6f,
                emissiveIntensity: 0.18,
                roughness: 0.4
            })
        );
        capsule.castShadow = true;
        scene.add(capsule);

        capsules.push({
            mesh: capsule,
            start,
            end,
            creatureId: target.id,
            creatureRef: target,
            progress: 0,
            duration: 0.52 + Math.random() * 0.08
        });

        state.balls -= 1;
        state.captureCombo = Math.min(9, state.captureCombo + 1);
        setMessage(`Capsule launched at ${target.species.name}.`, 'good', 1200);
        saveProgress();
    }

    function captureCreature(creature) {
        const index = creatures.findIndex((item) => item.id === creature.id);
        if (index >= 0) {
            scene.remove(creatures[index].group);
            creatures.splice(index, 1);
        }
        markCaught(creature.species.id);
        state.caughtTotal += 1;
        state.coins += creature.species.reward;
        state.balls = Math.min(MAX_BALLS, state.balls + 2);
        state.captureCombo += 1;
        createSparkBurst(creature.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), creature.species.color);
        createFloatingText(`+${creature.species.reward} coins`, creature.group.position, 'good');
        setMessage(`${creature.species.name} captured!`, 'good');
        if (creature.species.id === 'moonkin') {
            state.coins += 8;
        }
        saveProgress();
        refreshDexUI();
        updateSummaryUI(state.activeTarget);
        ensureCreatureCount();
        checkCompletion();
    }

    function failCapture(creature) {
        creature.fleeTimer = 2.3;
        creature.alertPulse = 1.4;
        creature.escapeBias = Math.min(1, creature.escapeBias + 0.2);
        state.captureCombo = 0;
        createSparkBurst(creature.group.position.clone().add(new THREE.Vector3(0, 1.0, 0)), 0xff9a74);
        createFloatingText('Broke free!', creature.group.position, 'warn');
        setMessage(`${creature.species.name} broke free!`, 'warn');
    }

    function captureChance(creature) {
        const dist = creature.group.position.distanceTo(player.position);
        const proximityBonus = Math.max(0, (20 - dist) * 0.012);
        const scanBonus = creature.scanned ? 0.12 : 0;
        const comboBonus = Math.min(0.08, state.captureCombo * 0.01);
        const chance = creature.species.baseCatch + proximityBonus + scanBonus + comboBonus - creature.escapeBias * 0.08;
        return Math.max(0.08, Math.min(0.92, chance));
    }

    function resolveCapsule(capsule) {
        const creature = creatures.find((item) => item.id === capsule.creatureId);
        scene.remove(capsule.mesh);
        capsule.mesh.geometry.dispose();
        capsule.mesh.material.dispose();
        const index = capsules.indexOf(capsule);
        if (index >= 0) {
            capsules.splice(index, 1);
        }
        if (!creature) return;

        const chance = captureChance(creature);
        if (Math.random() < chance) {
            captureCreature(creature);
        } else {
            failCapture(creature);
        }
    }

    function createSparkBurst(position, color) {
        for (let i = 0; i < 12; i += 1) {
            const spark = new THREE.Mesh(
                new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 8, 8),
                new THREE.MeshStandardMaterial({
                    color,
                    emissive: color,
                    emissiveIntensity: 0.22
                })
            );
            spark.position.copy(position);
            spark.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 7,
                1.8 + Math.random() * 2.6,
                (Math.random() - 0.5) * 7
            );
            spark.life = 0.5 + Math.random() * 0.4;
            spark.elapsed = 0;
            scene.add(spark);
            sparkles.push(spark);
        }
    }

    function createFloatingText(text, creaturePosition, tone = 'good') {
        const el = document.createElement('div');
        el.textContent = text;
        el.style.position = 'absolute';
        el.style.left = '50%';
        el.style.top = '50%';
        el.style.transform = 'translate(-50%, -50%)';
        el.style.zIndex = '8';
        el.style.pointerEvents = 'none';
        el.style.padding = '8px 12px';
        el.style.borderRadius = '999px';
        el.style.border = '1px solid rgba(255,255,255,0.12)';
        el.style.background = 'rgba(0,0,0,0.45)';
        el.style.fontSize = '12px';
        el.style.letterSpacing = '0.8px';
        el.style.color = tone === 'warn' ? '#ffd36a' : '#9bf29b';
        document.body.appendChild(el);
        floatingTexts.push({
            element: el,
            world: creaturePosition.clone().add(new THREE.Vector3(0, 2.0, 0)),
            life: 1.2,
            elapsed: 0
        });
    }

    function updateFloatingTexts(delta) {
        for (let i = floatingTexts.length - 1; i >= 0; i -= 1) {
            const text = floatingTexts[i];
            text.elapsed += delta;
            const progress = Math.min(1, text.elapsed / text.life);
            const screen = text.world.clone().add(new THREE.Vector3(0, progress * 1.1, 0));
            screen.project(camera);
            const x = (screen.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-screen.y * 0.5 + 0.5) * window.innerHeight;
            text.element.style.left = `${x}px`;
            text.element.style.top = `${y}px`;
            text.element.style.opacity = `${1 - progress}`;
            if (progress >= 1) {
                text.element.remove();
                floatingTexts.splice(i, 1);
            }
        }
    }

    function updateSparkles(delta) {
        for (let i = sparkles.length - 1; i >= 0; i -= 1) {
            const spark = sparkles[i];
            spark.elapsed += delta;
            spark.position.addScaledVector(spark.velocity, delta);
            spark.velocity.y -= 9 * delta;
            const alpha = 1 - spark.elapsed / spark.life;
            spark.material.opacity = Math.max(0, alpha);
            spark.material.transparent = true;
            if (spark.elapsed >= spark.life) {
                scene.remove(spark);
                spark.geometry.dispose();
                spark.material.dispose();
                sparkles.splice(i, 1);
            }
        }
    }

    function updateCreatures(delta) {
        const px = player.position.x;
        const pz = player.position.z;

        creatures.forEach((creature) => {
            creature.bob += delta * (2.2 + creature.speed * 0.5);
            const isNearBase = Math.hypot(creature.group.position.x, creature.group.position.z) < BASE_RADIUS + 3;
            const dx = px - creature.group.position.x;
            const dz = pz - creature.group.position.z;
            const dist = Math.hypot(dx, dz);

            if (creature.fleeTimer > 0) {
                creature.fleeTimer -= delta;
                creature.wanderAngle = Math.atan2(creature.group.position.z - pz, creature.group.position.x - px);
                creature.speed = 2.8 + creature.escapeBias * 0.6;
            } else if (dist < 12) {
                creature.wanderAngle = Math.atan2(creature.group.position.z - pz, creature.group.position.x - px);
                creature.speed = 1.0 + creature.escapeBias * 0.15;
            } else {
                creature.wanderTimer -= delta;
                if (creature.wanderTimer <= 0) {
                    creature.wanderTimer = 0.8 + Math.random() * 2.8;
                    creature.wanderAngle += (Math.random() - 0.5) * 1.4;
                    creature.speed = 0.9 + Math.random() * 0.7;
                }
            }

            if (dist < 4.5 && !creature.scanned) {
                creature.scanned = true;
                markSeen(creature.species.id);
            }

            if (isNearBase && creature.fleeTimer <= 0 && dist > 18) {
                creature.wanderAngle += Math.sin(creature.bob) * 0.01;
            }

            creature.group.position.x += Math.cos(creature.wanderAngle) * creature.speed * delta;
            creature.group.position.z += Math.sin(creature.wanderAngle) * creature.speed * delta;

            creature.group.position.x = THREE.MathUtils.clamp(creature.group.position.x, -WORLD_LIMIT, WORLD_LIMIT);
            creature.group.position.z = THREE.MathUtils.clamp(creature.group.position.z, -WORLD_LIMIT, WORLD_LIMIT);
            creature.y = sampleHeight(creature.group.position.x, creature.group.position.z);
            creature.group.position.y = creature.y;

            creature.group.rotation.y = Math.atan2(Math.sin(creature.wanderAngle), Math.cos(creature.wanderAngle)) + Math.PI * 0.5;
            creature.body.position.y = 1.02 + Math.sin(creature.bob) * 0.08;
            creature.ring.visible = creature === state.activeTarget;
            creature.ring.scale.setScalar(1 + Math.sin(creature.bob * 4) * 0.03);
            creature.ring.material.opacity = creature.scanned ? 1 : 0.82;
            creature.ring.rotation.z += delta * 0.5;
        });
    }

    function updatePlayer(delta) {
        const forward = ((input.keys.KeyW || input.keys.ArrowUp) ? 1 : 0) - ((input.keys.KeyS || input.keys.ArrowDown) ? 1 : 0);
        const strafe = ((input.keys.KeyD || input.keys.ArrowRight) ? 1 : 0) - ((input.keys.KeyA || input.keys.ArrowLeft) ? 1 : 0);
        const sprint = Boolean(input.keys.ShiftLeft || input.keys.ShiftRight);
        const moveSpeed = sprint ? 8.4 : 5.8;
        const move = new THREE.Vector3(strafe, 0, forward);
        const len = move.length();
        if (len > 0) {
            move.normalize().multiplyScalar(moveSpeed * delta);
            playerAim.copy(move).normalize();
            player.position.add(move);
            player.rotation.y = Math.atan2(playerAim.x, playerAim.z);
        }

        player.position.x = THREE.MathUtils.clamp(player.position.x, -WORLD_LIMIT, WORLD_LIMIT);
        player.position.z = THREE.MathUtils.clamp(player.position.z, -WORLD_LIMIT, WORLD_LIMIT);
        player.position.y = sampleHeight(player.position.x, player.position.z);
        const distanceFromBase = Math.hypot(player.position.x, player.position.z);
        sceneLabel.textContent = distanceFromBase < 14 ? 'Field Lab' : distanceFromBase < 30 ? 'Meadow Field' : 'Outer Meadow';

        cameraResetTimer = Math.max(0, cameraResetTimer - delta);
        if (input.recenterQueued) {
            cameraAngle = -0.82;
            cameraDistance = 19.5;
            cameraHeight = 12.5;
            cameraResetTimer = 0.4;
            input.recenterQueued = false;
            setMessage('Camera centered.', 'good', 1000);
        }

        const desired = new THREE.Vector3(
            player.position.x + Math.cos(cameraAngle) * cameraDistance,
            player.position.y + cameraHeight,
            player.position.z + Math.sin(cameraAngle) * cameraDistance
        );
        camera.position.lerp(desired, 1 - Math.pow(0.001, delta));
        camera.lookAt(player.position.x, player.position.y + 1.1, player.position.z);
    }

    function updateCapsules(delta) {
        for (let i = capsules.length - 1; i >= 0; i -= 1) {
            const capsule = capsules[i];
            capsule.progress += delta / capsule.duration;
            const t = Math.min(1, capsule.progress);
            const eased = t * (2 - t);
            const pos = capsule.start.clone().lerp(capsule.end, eased);
            pos.y += Math.sin(Math.PI * t) * 4.2;
            capsule.mesh.position.copy(pos);
            capsule.mesh.rotation.x += delta * 7;
            capsule.mesh.rotation.y += delta * 5;
            if (t >= 1) {
                resolveCapsule(capsule);
            }
        }
    }

    function updateBase(delta) {
        const distance = Math.hypot(player.position.x, player.position.z);
        if (distance < BASE_RADIUS + 1.4) {
            const refill = Math.min(MAX_BALLS, state.balls + Math.ceil(delta * 5));
            if (refill !== state.balls) {
                state.balls = refill;
                state.savePending = true;
            }
        }
        baseHub.rotation.y += delta * 0.3;
    }

    function checkCompletion() {
        const allCaught = SPECIES.every((species) => dexState.get(species.id).caught > 0);
        if (allCaught && !state.finished) {
            state.finished = true;
            completeText.textContent = `You filled the local dex with all ${SPECIES.length} creatures. Keep exploring or start a fresh run to hunt them again.`;
            completeScreen.classList.remove('hidden');
            setMessage('Local dex complete.', 'good', 2800);
        }
    }

    function resetRun(clearCollection = false) {
        creatures.forEach((creature) => scene.remove(creature.group));
        capsules.forEach((capsule) => {
            scene.remove(capsule.mesh);
            capsule.mesh.geometry.dispose();
            capsule.mesh.material.dispose();
        });
        sparkles.forEach((spark) => {
            scene.remove(spark);
            spark.geometry.dispose();
            spark.material.dispose();
        });
        floatingTexts.forEach((text) => text.element.remove());

        creatures = [];
        capsules = [];
        sparkles = [];
        floatingTexts = [];
        state.balls = 24;
        state.coins = 0;
        state.caughtTotal = 0;
        state.captureCombo = 0;
        state.scanTarget = null;
        state.activeTarget = null;
        state.respawnTimer = 0;
        state.finished = false;
        player.position.set(0, sampleHeight(0, 0), 0);
        completeScreen.classList.add('hidden');
        pauseScreen.classList.add('hidden');
        if (clearCollection) {
            SPECIES.forEach((species) => {
                const slot = dexState.get(species.id);
                slot.seen = false;
                slot.caught = 0;
            });
            clearSave();
        }
        ensureCreatureCount();
        refreshDexUI();
        updateSummaryUI(null);
        setMessage(clearCollection ? 'Fresh field log started.' : 'Run reset.', 'good', 1400);
        saveProgress();
    }

    function togglePause(force) {
        if (!state.started) return;
        state.paused = typeof force === 'boolean' ? force : !state.paused;
        pauseScreen.classList.toggle('hidden', !state.paused);
        setMessage(state.paused ? 'Paused.' : 'Resumed.', state.paused ? 'warn' : 'good', 1000);
    }

    function handleInputQueue() {
        if (input.pauseQueued) {
            input.pauseQueued = false;
            togglePause();
        }
        if (input.scanQueued) {
            input.scanQueued = false;
            scanCreature();
        }
        if (input.throwQueued) {
            input.throwQueued = false;
            throwCapsule();
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        const delta = Math.min(0.033, clock.getDelta());

        if (!state.started || state.paused) {
            renderer.render(scene, camera);
            return;
        }

        handleInputQueue();
        updatePlayer(delta);
        updateBase(delta);
        updateCreatures(delta);
        updateCapsules(delta);
        updateSparkles(delta);
        updateFloatingTexts(delta);
        updateTargeting();

        if (state.messageTimer > 0) {
            state.messageTimer -= delta;
            if (state.messageTimer <= 0) {
                statusBar.classList.remove('visible');
            }
        }

        if (state.savePending) {
            state.savePending = false;
            saveProgress();
        }

        if (cameraResetTimer > 0) {
            camera.position.x = player.position.x + 14;
            camera.position.y = player.position.y + 12;
            camera.position.z = player.position.z + 14;
        }

        renderer.render(scene, camera);
    }

    function onResize() {
        if (!renderer || !camera) return;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
    }

    function bindEvents() {
        window.addEventListener('resize', onResize);
        window.addEventListener('keydown', (event) => {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
                event.preventDefault();
            }
            input.keys[event.code] = true;
            if (event.code === 'Space') input.throwQueued = true;
            if (event.code === 'KeyE') input.scanQueued = true;
            if (event.code === 'KeyP' || event.code === 'Escape') input.pauseQueued = true;
            if (event.code === 'KeyR') resetRun(false);
            if (event.code === 'KeyC') input.recenterQueued = true;
        });
        window.addEventListener('keyup', (event) => {
            input.keys[event.code] = false;
        });

        canvas.addEventListener('click', () => {
            input.throwQueued = true;
        });
        canvas.addEventListener('contextmenu', (event) => event.preventDefault());

        startBtn.addEventListener('click', () => {
            state.started = true;
            startScreen.classList.add('hidden');
            setMessage('Explore the field and catch something wild.', 'good', 1800);
        });

        pauseBtn.addEventListener('click', () => togglePause());
        resumeBtn.addEventListener('click', () => togglePause(false));
        resetBtn.addEventListener('click', () => resetRun(false));
        restartBtn.addEventListener('click', () => resetRun(false));
        recenterBtn.addEventListener('click', () => {
            input.recenterQueued = true;
        });
        continueBtn.addEventListener('click', () => {
            state.finished = false;
            completeScreen.classList.add('hidden');
            setMessage('Continue exploring.', 'good', 1200);
        });
        newRunBtn.addEventListener('click', () => resetRun(true));

        window.addEventListener('blur', () => {
            if (state.started && !state.paused) togglePause(true);
        });
    }

    function toHex(value) {
        return `#${value.toString(16).padStart(6, '0')}`;
    }

    function init() {
        loadSave();
        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x97d2ee, 34, 126);
        scene.background = new THREE.Color(0x97d2ee);

        camera = new THREE.PerspectiveCamera(58, canvas.clientWidth / canvas.clientHeight, 0.1, 240);
        camera.position.set(14, 12, 14);

        const ambient = new THREE.AmbientLight(0xf3fffb, 0.92);
        scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xfff0c8, 1.5);
        sun.position.set(18, 24, 12);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        scene.add(sun);

        const fill = new THREE.DirectionalLight(0x8bf29f, 0.48);
        fill.position.set(-16, 10, -12);
        scene.add(fill);

        const rim = new THREE.DirectionalLight(0x73c8ff, 0.42);
        rim.position.set(-12, 15, 18);
        scene.add(rim);

        if (!createRenderer()) return;

        createTerrain();
        createWorldDecor();
        createPlayer();
        ensureCreatureCount();
        refreshDexUI();
        updateSummaryUI(null);
        bindEvents();

        if ('ontouchstart' in window || navigator.maxTouchPoints) {
            initMobileControls({
                keys: input.keys,
                dpad: true,
                buttons: [
                    { label: 'CATCH', key: 'Space', primary: true },
                    { label: 'SCAN', key: 'KeyE' },
                    { label: 'PAUSE', key: 'KeyP' }
                ],
                actions: {
                    Space: () => {
                        input.throwQueued = true;
                    },
                    KeyE: () => {
                        input.scanQueued = true;
                    },
                    KeyP: () => {
                        input.pauseQueued = true;
                    }
                }
            });
        }

        clock = new THREE.Clock();
        onResize();
        animate();

        if (SPECIES.every((species) => dexState.get(species.id).caught > 0)) {
            checkCompletion();
        }
    }

    init();
})();
