(() => {
    const $ = (id) => document.getElementById(id);

    const canvas = $('scene');
    const unsupported = $('unsupported');
    const startScreen = $('startScreen');
    const pauseScreen = $('pauseScreen');
    const finishScreen = $('finishScreen');
    const starsScore = $('starsScore');
    const rivalsScore = $('rivalsScore');
    const clockLabel = $('clockLabel');
    const modeLabel = $('modeLabel');
    const possessionLabel = $('possessionLabel');
    const playLabel = $('playLabel');
    const activeStarLabel = $('activeStarLabel');
    const activeRivalLabel = $('activeRivalLabel');
    const finishTitle = $('finishTitle');
    const finishText = $('finishText');
    const toast = $('toast');

    const PITCH_WIDTH = 62;
    const PITCH_LENGTH = 96;
    const HALF_W = PITCH_WIDTH / 2;
    const HALF_L = PITCH_LENGTH / 2;
    const GOAL_WIDTH = 20;
    const PLAYER_RADIUS = 1.45;
    const BALL_RADIUS = 0.58;
    const MATCH_LENGTH = 180;
    const STARS_ATTACK_GOAL_Z = -HALF_L;
    const RIVALS_ATTACK_GOAL_Z = HALF_L;

    const starTeam = [
        { name: 'Neymar', number: 10, color: 0x32d583, start: [-16, 17], role: 'wing' },
        { name: 'Mbappe', number: 7, color: 0x66e3ff, start: [16, 16], role: 'striker' },
        { name: 'Messi', number: 30, color: 0xffe66d, start: [-8, 3], role: 'playmaker' },
        { name: 'Ronaldo', number: 9, color: 0xff9f43, start: [8, 9], role: 'forward' }
    ];

    const rivalTeam = [
        { name: 'Orion', number: 11, color: 0xff4d6d, start: [-13, -18], role: 'wing' },
        { name: 'Blaze', number: 8, color: 0xd946ef, start: [13, -16], role: 'striker' },
        { name: 'Atlas', number: 5, color: 0xf97316, start: [-7, -4], role: 'anchor' },
        { name: 'Nova', number: 14, color: 0x60a5fa, start: [7, 9], role: 'guard' }
    ];

    const keys = {};
    const justPressed = {};
    const tempVec = new THREE.Vector3();
    const tempVec2 = new THREE.Vector3();

    let scene;
    let camera;
    let renderer;
    let clock;
    let ballMesh;
    let ballShadow;
    let activeStarRing;
    let activeRivalRing;
    let players = [];
    let particles = [];
    let running = false;
    let paused = false;
    let mode = 'ai';
    let elapsed = 0;
    let stars = 0;
    let rivals = 0;
    let possession = null;
    let lastTouchTeam = null;
    let resetTimer = 0;
    let toastTimer = 0;
    let cameraShake = 0;
    const touchControls = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const ball = {
        pos: new THREE.Vector3(0, BALL_RADIUS, 0),
        vel: new THREE.Vector3(),
        owner: null,
        spin: 0
    };

    function renderRoster(containerId, team) {
        const container = $(containerId);
        container.innerHTML = team.map((player) => `
            <div class="player-pill">
                <span class="player-dot" style="color:#${player.color.toString(16).padStart(6, '0')}; background:#${player.color.toString(16).padStart(6, '0')}"></span>
                ${player.name} ${player.number}
            </div>
        `).join('');
    }

    function showToast(message, duration = 1.8) {
        toast.textContent = message;
        toast.classList.add('visible');
        toastTimer = duration;
    }

    function setScreen(screen, visible) {
        screen.classList.toggle('hidden', !visible);
    }

    function createRenderer() {
        try {
            renderer = new THREE.WebGLRenderer({
                canvas,
                antialias: true,
                alpha: false,
                powerPreference: 'high-performance'
            });
        } catch (error) {
            setScreen(unsupported, true);
            return false;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        return true;
    }

    function initScene() {
        if (!createRenderer()) return;
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x08171c);
        scene.fog = new THREE.Fog(0x08171c, 90, 170);

        camera = new THREE.PerspectiveCamera(46, 1, 0.1, 260);
        camera.position.set(0, 60, 78);
        camera.lookAt(0, 0, 0);

        const hemi = new THREE.HemisphereLight(0xd6fff0, 0x17301f, 1.5);
        scene.add(hemi);

        const sun = new THREE.DirectionalLight(0xffffff, 2.1);
        sun.position.set(-34, 62, 28);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.left = -90;
        sun.shadow.camera.right = 90;
        sun.shadow.camera.top = 90;
        sun.shadow.camera.bottom = -90;
        scene.add(sun);

        createPitch();
        createStadium();
        createGoals();
        createPlayers();
        createBall();
        createRings();

        clock = new THREE.Clock();
        resize();
        window.addEventListener('resize', resize);
        requestAnimationFrame(loop);
    }

    function createPitch() {
        const base = new THREE.Group();
        const stripeGeo = new THREE.PlaneGeometry(PITCH_WIDTH, PITCH_LENGTH / 8);
        for (let i = 0; i < 8; i++) {
            const mat = new THREE.MeshStandardMaterial({
                color: i % 2 === 0 ? 0x128344 : 0x0f723c,
                roughness: 0.9
            });
            const stripe = new THREE.Mesh(stripeGeo, mat);
            stripe.rotation.x = -Math.PI / 2;
            stripe.position.z = -HALF_L + (i + 0.5) * (PITCH_LENGTH / 8);
            stripe.receiveShadow = true;
            base.add(stripe);
        }
        scene.add(base);

        const lineMat = new THREE.MeshBasicMaterial({ color: 0xf4fff3 });
        addLine(0, 0, PITCH_WIDTH, 0.22, lineMat);
        addLine(0, -HALF_L + 0.5, PITCH_WIDTH, 0.22, lineMat);
        addLine(0, HALF_L - 0.5, PITCH_WIDTH, 0.22, lineMat);
        addLine(-HALF_W + 0.5, 0, 0.22, PITCH_LENGTH, lineMat);
        addLine(HALF_W - 0.5, 0, 0.22, PITCH_LENGTH, lineMat);
        addCircle(0, 0, 8.2, lineMat);
        addBoxLine(0, -HALF_L + 11, 35, 22, lineMat);
        addBoxLine(0, HALF_L - 11, 35, 22, lineMat);
        addBoxLine(0, -HALF_L + 5.5, 18, 11, lineMat);
        addBoxLine(0, HALF_L - 5.5, 18, 11, lineMat);
    }

    function addLine(x, z, w, d, mat) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), mat);
        mesh.position.set(x, 0.035, z);
        scene.add(mesh);
    }

    function addBoxLine(x, z, w, d, mat) {
        addLine(x, z - d / 2, w, 0.18, mat);
        addLine(x, z + d / 2, w, 0.18, mat);
        addLine(x - w / 2, z, 0.18, d, mat);
        addLine(x + w / 2, z, 0.18, d, mat);
    }

    function addCircle(x, z, radius, mat) {
        const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2);
        const points = curve.getPoints(96);
        const geo = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(p.x + x, 0.06, p.y + z)));
        const line = new THREE.LineLoop(geo, mat);
        scene.add(line);
    }

    function createStadium() {
        const standMat = new THREE.MeshStandardMaterial({ color: 0x182b35, roughness: 0.82 });
        const seatMats = [
            new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.75 }),
            new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.75 }),
            new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.75 }),
            new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.75 })
        ];

        [[0, -63, 76, 8], [0, 63, 76, 8], [-43, 0, 8, 116], [43, 0, 8, 116]].forEach(([x, z, w, d]) => {
            const stand = new THREE.Mesh(new THREE.BoxGeometry(w, 7, d), standMat);
            stand.position.set(x, 3.3, z);
            stand.receiveShadow = true;
            stand.castShadow = true;
            scene.add(stand);
        });

        for (let row = 0; row < 4; row++) {
            for (let i = 0; i < 26; i++) {
                const seat = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 1.2), seatMats[(i + row) % seatMats.length]);
                seat.position.set(-31 + i * 2.45, 7.2 + row * 0.75, -66 - row * 1.45);
                scene.add(seat);
                const mirror = seat.clone();
                mirror.position.z = 66 + row * 1.45;
                scene.add(mirror);
            }
        }

        for (let i = 0; i < 4; i++) {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 24, 10), new THREE.MeshStandardMaterial({ color: 0xcbd5e1 }));
            pole.position.set(i < 2 ? -37 : 37, 12, i % 2 === 0 ? -50 : 50);
            pole.castShadow = true;
            scene.add(pole);

            const light = new THREE.SpotLight(0xffffff, 1.7, 130, Math.PI / 5, 0.35, 1);
            light.position.set(pole.position.x, 24, pole.position.z);
            light.target.position.set(0, 0, 0);
            scene.add(light);
            scene.add(light.target);
        }
    }

    function createGoals() {
        const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 });
        const netMat = new THREE.MeshBasicMaterial({ color: 0xbdeaff, transparent: true, opacity: 0.28, wireframe: true });
        [-1, 1].forEach((side) => {
            const z = side * (HALF_L + 1.4);
            const group = new THREE.Group();
            const cross = new THREE.Mesh(new THREE.BoxGeometry(GOAL_WIDTH, 0.38, 0.38), postMat);
            cross.position.set(0, 5.2, z);
            const left = new THREE.Mesh(new THREE.BoxGeometry(0.38, 5.2, 0.38), postMat);
            left.position.set(-GOAL_WIDTH / 2, 2.6, z);
            const right = left.clone();
            right.position.x = GOAL_WIDTH / 2;
            const net = new THREE.Mesh(new THREE.BoxGeometry(GOAL_WIDTH, 5.1, 5), netMat);
            net.position.set(0, 2.55, z + side * 2.1);
            group.add(cross, left, right, net);
            scene.add(group);
        });
    }

    function createPlayerModel(data, team, index) {
        const group = new THREE.Group();
        const kit = new THREE.MeshStandardMaterial({
            color: team === 'stars' ? 0x083b2a : 0x461623,
            roughness: 0.62,
            metalness: 0.06
        });
        const accent = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.42 });
        const skin = new THREE.MeshStandardMaterial({ color: 0xd7a15b, roughness: 0.7 });
        const dark = new THREE.MeshStandardMaterial({ color: 0x182026, roughness: 0.8 });

        const torso = new THREE.Group();
        const torsoCore = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.05, 1.7, 16), kit);
        const torsoTop = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 8), kit);
        const torsoBottom = new THREE.Mesh(new THREE.SphereGeometry(1.02, 16, 8), kit);
        torsoCore.position.y = 2.45;
        torsoTop.position.y = 3.3;
        torsoBottom.position.y = 1.6;
        torsoCore.castShadow = true;
        torsoTop.castShadow = true;
        torsoBottom.castShadow = true;
        torso.add(torsoCore, torsoTop, torsoBottom);
        group.add(torso);

        const chest = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.72, 0.16), accent);
        chest.position.set(0, 2.75, -0.78);
        chest.castShadow = true;
        group.add(chest);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 14), skin);
        head.position.y = 4.0;
        head.castShadow = true;
        group.add(head);

        const hair = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), dark);
        hair.position.y = 4.27;
        hair.castShadow = true;
        group.add(hair);

        [-0.42, 0.42].forEach((x) => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.25, 10), dark);
            leg.position.set(x, 1.02, 0);
            leg.castShadow = true;
            group.add(leg);
        });

        const label = createLabel(`${data.name} ${data.number}`, team === 'stars' ? '#32d583' : '#ff4d6d');
        label.position.y = 5.35;
        group.add(label);

        const player = {
            ...data,
            team,
            index,
            mesh: group,
            pos: new THREE.Vector3(data.start[0], 0, data.start[1]),
            vel: new THREE.Vector3(),
            home: new THREE.Vector3(data.start[0], 0, data.start[1]),
            dir: team === 'stars' ? -1 : 1,
            cooldown: 0,
            tackleCooldown: 0,
            sprintJuice: 1,
            aiIntent: 0
        };
        group.position.copy(player.pos);
        return player;
    }

    function createLabel(text, color) {
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 256;
        labelCanvas.height = 64;
        const ctx = labelCanvas.getContext('2d');
        ctx.font = '900 28px Inter, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
        roundRect(ctx, 12, 10, 232, 44, 10);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.fillText(text, 128, 32);
        const texture = new THREE.CanvasTexture(labelCanvas);
        texture.minFilter = THREE.LinearFilter;
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
        sprite.scale.set(7.2, 1.8, 1);
        return sprite;
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function createPlayers() {
        players = [];
        starTeam.forEach((data, index) => {
            const player = createPlayerModel(data, 'stars', index);
            players.push(player);
            scene.add(player.mesh);
        });
        rivalTeam.forEach((data, index) => {
            const player = createPlayerModel(data, 'rivals', index);
            players.push(player);
            scene.add(player.mesh);
        });
    }

    function createBall() {
        const ballGroup = new THREE.Group();
        const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0.08 });
        const seamMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
        ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 28, 20), ballMat);
        ballMesh.castShadow = true;
        ballGroup.add(ballMesh);
        for (let i = 0; i < 6; i++) {
            const band = new THREE.Mesh(new THREE.TorusGeometry(BALL_RADIUS * 1.01, 0.012, 6, 48), seamMat);
            band.rotation.set(i * 0.54, i * 0.92, i * 0.37);
            ballGroup.add(band);
        }
        ballMesh = ballGroup;
        scene.add(ballMesh);

        ballShadow = new THREE.Mesh(
            new THREE.CircleGeometry(1.05, 32),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 })
        );
        ballShadow.rotation.x = -Math.PI / 2;
        scene.add(ballShadow);
    }

    function createRings() {
        const starMat = new THREE.MeshBasicMaterial({ color: 0x32d583, transparent: true, opacity: 0.86 });
        const rivalMat = new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.86 });
        activeStarRing = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.05, 8, 64), starMat);
        activeRivalRing = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.05, 8, 64), rivalMat);
        activeStarRing.rotation.x = -Math.PI / 2;
        activeRivalRing.rotation.x = -Math.PI / 2;
        activeStarRing.position.y = 0.09;
        activeRivalRing.position.y = 0.1;
        scene.add(activeStarRing, activeRivalRing);
    }

    function startMatch() {
        running = true;
        paused = false;
        elapsed = 0;
        stars = 0;
        rivals = 0;
        resetPositions();
        updateScore();
        setScreen(startScreen, false);
        setScreen(finishScreen, false);
        setScreen(pauseScreen, false);
        showToast('Kickoff!');
    }

    function resetPositions() {
        possession = null;
        lastTouchTeam = null;
        resetTimer = 0.8;
        ball.pos.set(0, BALL_RADIUS, 0);
        ball.vel.set(0, 0, 0);
        ball.owner = null;
        players.forEach((player) => {
            player.pos.copy(player.home);
            player.vel.set(0, 0, 0);
            player.cooldown = 0;
        });
    }

    function updateScore() {
        starsScore.textContent = String(stars);
        rivalsScore.textContent = String(rivals);
        modeLabel.textContent = mode === 'ai' ? 'Vs AI' : '2 Player';
    }

    function resize() {
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, rect.width);
        const height = Math.max(1, rect.height);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    function loop() {
        requestAnimationFrame(loop);
        if (!renderer) return;
        const dt = Math.min(clock.getDelta(), 0.033);
        if (running && !paused) update(dt);
        renderer.render(scene, camera);
    }

    function update(dt) {
        elapsed += dt;
        if (elapsed >= MATCH_LENGTH) {
            finishMatch();
            return;
        }

        resetTimer = Math.max(0, resetTimer - dt);
        players.forEach((player) => {
            player.cooldown = Math.max(0, player.cooldown - dt);
            player.tackleCooldown = Math.max(0, player.tackleCooldown - dt);
            player.sprintJuice = Math.min(1, player.sprintJuice + dt * 0.22);
        });

        const activeStar = nearestPlayer('stars', ball.pos);
        const activeRival = nearestPlayer('rivals', ball.pos);
        const starInput = getInputVector('p1');
        const rivalInput = getInputVector('p2');

        updateControlledTeam('stars', activeStar, starInput, dt, isPressed('ShiftLeft') || isPressed('ShiftRight'));
        if (mode === 'ai') {
            updateAiTeam(activeRival, dt);
        } else {
            updateControlledTeam('rivals', activeRival, rivalInput, dt, isPressed('Slash'));
        }

        updateSupportPlayers('stars', activeStar, dt);
        updateSupportPlayers('rivals', activeRival, dt);
        handleAction(activeStar, 'stars', consumePress('Space'));
        handleAction(activeRival, 'rivals', mode === 'ai' ? false : consumePress('Enter'));
        if (mode === 'ai') handleAiAction(activeRival);

        players.forEach((player) => movePlayer(player, dt));
        updateBall(dt);
        handleTouches();
        handleGoals();
        updateCamera(dt);
        updateUi(activeStar, activeRival);
        updateEffects(dt);
    }

    function isPressed(code) {
        return Boolean(keys[code]);
    }

    function consumePress(code) {
        const value = Boolean(justPressed[code]);
        justPressed[code] = false;
        return value;
    }

    function getInputVector(player) {
        const v = new THREE.Vector3();
        if (player === 'p1') {
            if (isPressed('KeyW')) v.z -= 1;
            if (isPressed('KeyS')) v.z += 1;
            if (isPressed('KeyA')) v.x -= 1;
            if (isPressed('KeyD')) v.x += 1;
            if (isPressed('ArrowUp') && (mode === 'ai' || touchControls)) v.z -= 1;
            if (isPressed('ArrowDown') && (mode === 'ai' || touchControls)) v.z += 1;
            if (isPressed('ArrowLeft') && (mode === 'ai' || touchControls)) v.x -= 1;
            if (isPressed('ArrowRight') && (mode === 'ai' || touchControls)) v.x += 1;
        } else {
            if (touchControls) return v;
            if (isPressed('ArrowUp')) v.z -= 1;
            if (isPressed('ArrowDown')) v.z += 1;
            if (isPressed('ArrowLeft')) v.x -= 1;
            if (isPressed('ArrowRight')) v.x += 1;
        }
        if (v.lengthSq() > 0) v.normalize();
        return v;
    }

    function updateControlledTeam(team, active, input, dt, sprintPressed) {
        const members = players.filter((p) => p.team === team);
        if (input.lengthSq() === 0) return;
        const sprinting = sprintPressed && active.sprintJuice > 0.08;
        const speed = sprinting ? 24 : 17.5;
        if (sprinting) active.sprintJuice = Math.max(0, active.sprintJuice - dt * 0.62);
        active.vel.addScaledVector(input, speed * dt * 8);
        active.facing = input.clone();
        members.forEach((player) => {
            if (player !== active && player === ball.owner) {
                player.vel.addScaledVector(input, speed * dt * 4);
            }
        });
    }

    function updateAiTeam(active, dt) {
        const ownBall = ball.owner && ball.owner.team === 'rivals';
        const target = tempVec.copy(ball.pos);
        if (ownBall) {
            target.set(clamp(ball.pos.x * 0.72, -HALF_W + 6, HALF_W - 6), 0, RIVALS_ATTACK_GOAL_Z - 12);
        } else if (ball.owner && ball.owner.team === 'stars') {
            target.copy(ball.pos);
        } else {
            target.copy(ball.pos);
        }
        const dir = target.sub(active.pos);
        if (dir.lengthSq() > 0.1) {
            dir.normalize();
            active.vel.addScaledVector(dir, 150 * dt);
            active.facing = dir.clone();
        }
    }

    function updateSupportPlayers(team, active, dt) {
        players.filter((p) => p.team === team && p !== active).forEach((player) => {
            let target = player.home.clone();
            if (ball.owner && ball.owner.team === team) {
                target.z += team === 'stars' ? -15 : 15;
                target.x += (player.index - 1.5) * 2;
            } else if (ball.owner && ball.owner.team !== team) {
                target.z += team === 'stars' ? 8 : -8;
            } else {
                target.lerp(ball.pos, 0.2);
            }
            target.x = clamp(target.x, -HALF_W + 5, HALF_W - 5);
            target.z = clamp(target.z, -HALF_L + 8, HALF_L - 8);
            tempVec.copy(target).sub(player.pos);
            if (tempVec.lengthSq() > 1.5) {
                tempVec.normalize();
                player.vel.addScaledVector(tempVec, 76 * dt);
                player.facing = tempVec.clone();
            }
        });
    }

    function movePlayer(player, dt) {
        player.vel.multiplyScalar(0.83);
        player.pos.addScaledVector(player.vel, dt);
        player.pos.x = clamp(player.pos.x, -HALF_W + PLAYER_RADIUS, HALF_W - PLAYER_RADIUS);
        player.pos.z = clamp(player.pos.z, -HALF_L + PLAYER_RADIUS, HALF_L - PLAYER_RADIUS);
        player.mesh.position.copy(player.pos);
        player.mesh.position.y = Math.sin(elapsed * 10 + player.index) * Math.min(0.18, player.vel.length() * 0.006);
        if (player.facing && player.facing.lengthSq() > 0.01) {
            player.mesh.rotation.y = Math.atan2(player.facing.x, player.facing.z);
        }
    }

    function updateBall(dt) {
        if (ball.owner) {
            const owner = ball.owner;
            const facing = owner.facing && owner.facing.lengthSq() > 0.01 ? owner.facing : new THREE.Vector3(0, 0, owner.team === 'stars' ? -1 : 1);
            ball.pos.copy(owner.pos).addScaledVector(facing, 1.75);
            ball.pos.y = BALL_RADIUS;
            ball.vel.copy(owner.vel).multiplyScalar(0.45);
            possession = owner.team;
        } else {
            ball.vel.multiplyScalar(0.986);
            ball.pos.addScaledVector(ball.vel, dt);
            ball.pos.x = clamp(ball.pos.x, -HALF_W + BALL_RADIUS, HALF_W - BALL_RADIUS);
            if (Math.abs(ball.pos.x) >= HALF_W - BALL_RADIUS - 0.02) ball.vel.x *= -0.72;
            if (Math.abs(ball.pos.z) > HALF_L + 6) {
                ball.pos.z = clamp(ball.pos.z, -HALF_L - 6, HALF_L + 6);
                ball.vel.z *= -0.45;
            }
            if (ball.vel.length() < 0.25) ball.vel.set(0, 0, 0);
            possession = null;
        }
        ball.spin += ball.vel.length() * dt * 0.7;
        ballMesh.position.copy(ball.pos);
        ballMesh.rotation.set(ball.spin * 0.7, ball.spin, ball.spin * 0.35);
        ballShadow.position.set(ball.pos.x, 0.045, ball.pos.z);
        ballShadow.scale.setScalar(1 + Math.min(1.2, ball.vel.length() * 0.025));
    }

    function handleTouches() {
        if (resetTimer > 0) return;
        players.forEach((player) => {
            const distance = flatDistance(player.pos, ball.pos);
            if (!ball.owner && distance < 2.25) {
                ball.owner = player;
                lastTouchTeam = player.team;
                playLabel.textContent = `${player.name} takes possession`;
            } else if (ball.owner && ball.owner.team !== player.team && distance < 2.1 && player.tackleCooldown <= 0) {
                player.tackleCooldown = 0.8;
                if (Math.random() < 0.42 || player.vel.length() > ball.owner.vel.length()) {
                    ball.owner = player;
                    lastTouchTeam = player.team;
                    cameraShake = 0.16;
                    spawnBurst(ball.pos, player.team === 'stars' ? 0x32d583 : 0xff4d6d);
                    playLabel.textContent = `${player.name} wins it`;
                }
            }
        });
    }

    function handleAction(player, team, pressed) {
        if (!pressed || !player || player.cooldown > 0) return;
        if (ball.owner === player) {
            kickFrom(player);
            return;
        }
        if (flatDistance(player.pos, ball.pos) < 3.5) {
            ball.owner = null;
            tempVec.copy(ball.pos).sub(player.pos).normalize();
            ball.vel.addScaledVector(tempVec, 18);
            player.cooldown = 0.45;
            spawnBurst(ball.pos, team === 'stars' ? 0x32d583 : 0xff4d6d);
            playLabel.textContent = `${player.name} tackles`;
        }
    }

    function handleAiAction(active) {
        if (!active || active.cooldown > 0 || ball.owner !== active) return;
        const nearGoal = ball.pos.z < -HALF_L + 25 && Math.abs(ball.pos.x) < 21;
        const pressured = players.some((p) => p.team === 'stars' && flatDistance(p.pos, active.pos) < 5.4);
        if (nearGoal || pressured) {
            kickFrom(active);
        }
    }

    function kickFrom(player) {
        const attackingGoal = player.team === 'stars' ? STARS_ATTACK_GOAL_Z : RIVALS_ATTACK_GOAL_Z;
        const nearGoal = Math.abs(attackingGoal - player.pos.z) < 32 && Math.abs(player.pos.x) < 23;
        const target = new THREE.Vector3(0, BALL_RADIUS, attackingGoal);
        let power = nearGoal ? 43 : 29;
        let label = nearGoal ? `${player.name} shoots` : `${player.name} passes`;

        if (!nearGoal) {
            const mate = bestPassingTarget(player);
            if (mate) {
                target.copy(mate.pos);
                target.z += player.team === 'stars' ? -5 : 5;
            } else {
                target.set(player.pos.x * 0.65, BALL_RADIUS, player.pos.z + (player.team === 'stars' ? -18 : 18));
            }
        } else {
            target.x = clamp(player.pos.x * -0.15 + (Math.random() - 0.5) * 8, -GOAL_WIDTH / 2 + 1, GOAL_WIDTH / 2 - 1);
            label += '!';
        }

        ball.owner = null;
        tempVec.copy(target).sub(ball.pos);
        tempVec.y = 0;
        if (tempVec.lengthSq() === 0) tempVec.set(0, 0, player.team === 'stars' ? -1 : 1);
        tempVec.normalize();
        ball.vel.copy(tempVec).multiplyScalar(power);
        ball.vel.x += (Math.random() - 0.5) * 2.2;
        player.cooldown = 0.55;
        lastTouchTeam = player.team;
        playLabel.textContent = label;
        spawnBurst(ball.pos, player.team === 'stars' ? 0x32d583 : 0xff4d6d);
    }

    function bestPassingTarget(player) {
        let best = null;
        let score = -Infinity;
        players.filter((p) => p.team === player.team && p !== player).forEach((mate) => {
            const forward = player.team === 'stars' ? player.pos.z - mate.pos.z : mate.pos.z - player.pos.z;
            const dist = flatDistance(player.pos, mate.pos);
            const pressure = players.filter((p) => p.team !== player.team).reduce((min, rival) => Math.min(min, flatDistance(rival.pos, mate.pos)), 99);
            const value = forward * 0.7 + pressure * 1.4 - dist * 0.12;
            if (value > score) {
                score = value;
                best = mate;
            }
        });
        return best;
    }

    function handleGoals() {
        if (Math.abs(ball.pos.x) > GOAL_WIDTH / 2) return;
        if (ball.pos.z < -HALF_L - 0.6) {
            stars += 1;
            scoreGoal('stars');
        } else if (ball.pos.z > HALF_L + 0.6) {
            rivals += 1;
            scoreGoal('rivals');
        }
    }

    function scoreGoal(team) {
        updateScore();
        const scorer = lastTouchTeam === team && ball.owner ? ball.owner.name : team === 'stars' ? 'Stars' : 'Rivals';
        showToast(`${team === 'stars' ? 'Stars' : 'Rivals'} goal!`);
        playLabel.textContent = `${scorer} scores`;
        cameraShake = 0.55;
        spawnBurst(new THREE.Vector3(0, 1, team === 'stars' ? STARS_ATTACK_GOAL_Z : RIVALS_ATTACK_GOAL_Z), team === 'stars' ? 0x32d583 : 0xff4d6d, 32);
        resetPositions();
    }

    function finishMatch() {
        running = false;
        setScreen(finishScreen, true);
        if (stars > rivals) {
            finishTitle.textContent = 'Stars Win';
            finishText.textContent = `Neymar, Mbappe, Messi, and Ronaldo finish ${stars}-${rivals}.`;
        } else if (rivals > stars) {
            finishTitle.textContent = 'Rivals Win';
            finishText.textContent = `The rival squad takes it ${rivals}-${stars}.`;
        } else {
            finishTitle.textContent = 'Draw';
            finishText.textContent = `Full time ends ${stars}-${rivals}.`;
        }
    }

    function nearestPlayer(team, point) {
        let best = null;
        let bestDist = Infinity;
        players.forEach((player) => {
            if (player.team !== team) return;
            const dist = flatDistance(player.pos, point);
            if (dist < bestDist) {
                bestDist = dist;
                best = player;
            }
        });
        return best;
    }

    function updateCamera(dt) {
        const targetZ = clamp(ball.pos.z * 0.38, -21, 21);
        const targetX = clamp(ball.pos.x * 0.22, -9, 9);
        tempVec.set(targetX, 60, 78 + targetZ * 0.1);
        camera.position.lerp(tempVec, dt * 1.7);
        tempVec2.set(targetX * 0.55, 0, targetZ);
        if (cameraShake > 0) {
            cameraShake = Math.max(0, cameraShake - dt);
            tempVec2.x += (Math.random() - 0.5) * cameraShake * 2.4;
            tempVec2.z += (Math.random() - 0.5) * cameraShake * 2.4;
        }
        camera.lookAt(tempVec2);
    }

    function updateUi(activeStar, activeRival) {
        const remaining = Math.max(0, MATCH_LENGTH - elapsed);
        const minutes = Math.floor(remaining / 60);
        const seconds = Math.floor(remaining % 60).toString().padStart(2, '0');
        clockLabel.textContent = `${minutes}:${seconds}`;
        possessionLabel.textContent = possession === 'stars' ? 'Stars' : possession === 'rivals' ? 'Rivals' : 'Open Ball';
        activeStarLabel.textContent = activeStar ? activeStar.name : '-';
        activeRivalLabel.textContent = activeRival ? activeRival.name : '-';
        activeStarRing.position.set(activeStar.pos.x, 0.1, activeStar.pos.z);
        activeRivalRing.position.set(activeRival.pos.x, 0.11, activeRival.pos.z);
    }

    function spawnBurst(origin, color, amount = 12) {
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
        for (let i = 0; i < amount; i++) {
            const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat.clone());
            mesh.position.copy(origin);
            mesh.position.y = 1.2;
            scene.add(mesh);
            particles.push({
                mesh,
                life: 0.55 + Math.random() * 0.45,
                vel: new THREE.Vector3((Math.random() - 0.5) * 9, Math.random() * 5 + 2, (Math.random() - 0.5) * 9)
            });
        }
    }

    function updateEffects(dt) {
        if (toastTimer > 0) {
            toastTimer -= dt;
            if (toastTimer <= 0) toast.classList.remove('visible');
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= dt;
            p.vel.y -= 10 * dt;
            p.mesh.position.addScaledVector(p.vel, dt);
            p.mesh.material.opacity = Math.max(0, p.life);
            if (p.life <= 0) {
                scene.remove(p.mesh);
                particles.splice(i, 1);
            }
        }
    }

    function flatDistance(a, b) {
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function setMode(nextMode) {
        mode = nextMode;
        $('aiModeBtn').classList.toggle('active', mode === 'ai');
        $('twoPlayerModeBtn').classList.toggle('active', mode === 'two');
        updateScore();
    }

    function bindEvents() {
        document.addEventListener('keydown', (event) => {
            if (!keys[event.code]) justPressed[event.code] = true;
            keys[event.code] = true;
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
                event.preventDefault();
            }
            if (event.code === 'KeyP' && running) {
                paused = !paused;
                setScreen(pauseScreen, paused);
            }
        });
        document.addEventListener('keyup', (event) => {
            keys[event.code] = false;
        });
        $('aiModeBtn').addEventListener('click', () => setMode('ai'));
        $('twoPlayerModeBtn').addEventListener('click', () => setMode('two'));
        $('startBtn').addEventListener('click', startMatch);
        $('resumeBtn').addEventListener('click', () => {
            paused = false;
            setScreen(pauseScreen, false);
        });
        $('restartBtn').addEventListener('click', startMatch);
        $('playAgainBtn').addEventListener('click', startMatch);
        $('switchModeBtn').addEventListener('click', () => {
            setScreen(finishScreen, false);
            setScreen(startScreen, true);
        });
        canvas.addEventListener('pointerdown', () => {
            if (mode === 'ai') justPressed.Space = true;
        });

        if (window.initMobileControls) {
            window.initMobileControls({
                keys,
                justPressed,
                dpad: true,
                buttons: [
                    { label: 'KICK', key: 'Space', primary: true },
                    { label: 'SPRINT', key: 'ShiftLeft' }
                ]
            });
        }
    }

    renderRoster('starsRoster', starTeam);
    renderRoster('rivalsRoster', rivalTeam);
    bindEvents();
    initScene();
    if (new URLSearchParams(window.location.search).get('autostart') === '1') {
        window.setTimeout(startMatch, 250);
    }
})();
