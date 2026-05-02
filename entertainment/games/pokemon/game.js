// Pokemon Battle 3D - Three.js
// =========================================================
// CONFIG
// =========================================================
const TYPE_CHART = {
    fire:     { grass: 2, water: 0.5, fire: 0.5, electric: 1, normal: 1, psychic: 1, ghost: 1, rock: 0.5 },
    water:    { fire: 2, grass: 0.5, water: 0.5, electric: 1, normal: 1, psychic: 1, ghost: 1, rock: 2 },
    grass:    { water: 2, fire: 0.5, grass: 0.5, electric: 1, normal: 1, psychic: 1, ghost: 1, rock: 2 },
    electric: { water: 2, grass: 0.5, fire: 1, electric: 0.5, normal: 1, psychic: 1, ghost: 1, rock: 0 },
    normal:   { fire: 1, water: 1, grass: 1, electric: 1, normal: 1, psychic: 1, ghost: 0, rock: 0.5 },
    psychic:  { fire: 1, water: 1, grass: 1, electric: 1, normal: 1, psychic: 0.5, ghost: 1, rock: 1 },
    ghost:    { fire: 1, water: 1, grass: 1, electric: 1, normal: 0, psychic: 2, ghost: 2, rock: 1 },
    rock:     { fire: 2, water: 1, grass: 1, electric: 1, normal: 1, psychic: 1, ghost: 1, rock: 1 }
};
const TYPE_COLOR = {
    fire: '#f08030', water: '#6890f0', grass: '#78c850', electric: '#f8d030',
    normal: '#a8a878', psychic: '#f85888', ghost: '#705898', rock: '#b8a038'
};
const TYPE_HEX = {
    fire: 0xf08030, water: 0x6890f0, grass: 0x78c850, electric: 0xf8d030,
    normal: 0xa8a878, psychic: 0xf85888, ghost: 0x705898, rock: 0xb8a038
};

// =========================================================
// THREE.JS SCENE
// =========================================================
let renderer, scene, camera, clock;
let playerGroup = null, enemyGroup = null;
let cameraTarget = new THREE.Vector3(0, 1.2, 0);
let cameraOrbit = { theta: -0.6, phi: 0.35, radius: 11, drag: false, lastX: 0, lastY: 0 };

function initThree() {
    const container = document.getElementById('scene');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb6dcff);
    scene.fog = new THREE.Fog(0xb6dcff, 18, 70);

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    updateCamera();

    const ambient = new THREE.HemisphereLight(0xddeeff, 0x5b4a34, 0.72);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff1c7, 1.45);
    sun.position.set(8, 18, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -24; sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 24; sun.shadow.camera.bottom = -24;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 48;
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x89b8ff, 0.72);
    rim.position.set(-8, 7, -8);
    scene.add(rim);
    createBattleArena();

    clock = new THREE.Clock();

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', e => { cameraOrbit.drag = true; cameraOrbit.lastX = e.clientX; cameraOrbit.lastY = e.clientY; });
    window.addEventListener('mouseup', () => cameraOrbit.drag = false);
    window.addEventListener('mousemove', e => {
        if (!cameraOrbit.drag) return;
        const dx = e.clientX - cameraOrbit.lastX, dy = e.clientY - cameraOrbit.lastY;
        cameraOrbit.lastX = e.clientX; cameraOrbit.lastY = e.clientY;
        cameraOrbit.theta -= dx * 0.005;
        cameraOrbit.phi = Math.max(0.1, Math.min(0.9, cameraOrbit.phi - dy * 0.005));
        updateCamera();
    });
    dom.addEventListener('wheel', e => {
        cameraOrbit.radius = Math.max(6, Math.min(20, cameraOrbit.radius + e.deltaY * 0.01));
        updateCamera();
    }, { passive: true });
    dom.addEventListener('touchstart', e => { if (e.touches.length === 1) { cameraOrbit.drag = true; cameraOrbit.lastX = e.touches[0].clientX; cameraOrbit.lastY = e.touches[0].clientY; } });
    dom.addEventListener('touchmove', e => {
        if (!cameraOrbit.drag || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - cameraOrbit.lastX, dy = e.touches[0].clientY - cameraOrbit.lastY;
        cameraOrbit.lastX = e.touches[0].clientX; cameraOrbit.lastY = e.touches[0].clientY;
        cameraOrbit.theta -= dx * 0.005;
        cameraOrbit.phi = Math.max(0.1, Math.min(0.9, cameraOrbit.phi - dy * 0.005));
        updateCamera();
    });
    dom.addEventListener('touchend', () => cameraOrbit.drag = false);
}

function updateCamera() {
    const r = cameraOrbit.radius;
    const x = Math.sin(cameraOrbit.theta) * Math.cos(cameraOrbit.phi) * r;
    const z = Math.cos(cameraOrbit.theta) * Math.cos(cameraOrbit.phi) * r;
    const y = Math.sin(cameraOrbit.phi) * r;
    camera.position.set(x, 2 + y, z);
    camera.lookAt(cameraTarget);
}

// =========================================================
// MESH HELPERS
// =========================================================
function mesh(geom, color, opts = {}) {
    const mat = new THREE.MeshStandardMaterial({
        color, roughness: opts.roughness ?? 0.6, metalness: opts.metalness ?? 0.0,
        emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 0,
        transparent: opts.transparent ?? false, opacity: opts.opacity ?? 1,
        side: opts.side ?? THREE.FrontSide
    });
    const m = new THREE.Mesh(geom, mat);
    m.castShadow = true;
    m.receiveShadow = Boolean(opts.receiveShadow);
    return m;
}
function sphere(r, color, opts) { return mesh(new THREE.SphereGeometry(r, 24, 18), color, opts); }
function ellipsoid(rx, ry, rz, color, opts) { const m = sphere(1, color, opts); m.scale.set(rx, ry, rz); return m; }
function box(w, h, d, color, opts) { return mesh(new THREE.BoxGeometry(w, h, d), color, opts); }
function cylinder(rt, rb, h, color, opts) { return mesh(new THREE.CylinderGeometry(rt, rb, h, opts?.segments ?? 18), color, opts); }
function cone(r, h, color, opts) { return mesh(new THREE.ConeGeometry(r, h, opts?.segments ?? 18), color, opts); }
function addPart(group, part, pos = [0, 0, 0], rot = [0, 0, 0]) {
    part.position.set(pos[0], pos[1], pos[2]);
    part.rotation.set(rot[0], rot[1], rot[2]);
    group.add(part);
    return part;
}
function addEye(group, x, y, z, pupil = 0x202020, glow = 0) {
    addPart(group, sphere(0.105, 0xffffff, { roughness: 0.25 }), [x, y, z]);
    addPart(group, sphere(0.052, pupil, { emissive: pupil, emissiveIntensity: glow, roughness: 0.25 }), [x, y, z + 0.085]);
}
function makeWing(color, accent) {
    const wing = new THREE.Group();
    const membrane = mesh(new THREE.CircleGeometry(0.9, 3), accent, {
        roughness: 0.74,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    membrane.scale.set(1.1, 1.65, 1);
    membrane.rotation.z = Math.PI / 6;
    wing.add(membrane);
    addPart(wing, cylinder(0.045, 0.06, 1.7, color), [0.05, 0, 0], [0, 0, -0.55]);
    addPart(wing, cylinder(0.035, 0.05, 1.25, color), [0.42, -0.12, 0], [0, 0, 0.2]);
    return wing;
}

function createBattleArena() {
    const groundGeo = new THREE.CircleGeometry(42, 96);
    groundGeo.rotateX(-Math.PI / 2);
    const ground = mesh(groundGeo, 0x5f9f45, { roughness: 0.96, receiveShadow: true });
    scene.add(ground);

    const arena = mesh(new THREE.CylinderGeometry(7.2, 7.8, 0.34, 96), 0xb7955e, { roughness: 0.88, receiveShadow: true });
    arena.scale.set(1.32, 1, 0.82);
    arena.position.y = 0.12;
    scene.add(arena);

    const turf = mesh(new THREE.CylinderGeometry(6.65, 6.95, 0.13, 96), 0x6fb055, { roughness: 0.92, receiveShadow: true });
    turf.scale.set(1.24, 1, 0.74);
    turf.position.y = 0.38;
    scene.add(turf);

    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf5e8ba, transparent: true, opacity: 0.78 });
    const centerLine = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.018, 8.2), lineMat);
    centerLine.position.y = 0.47;
    centerLine.receiveShadow = true;
    scene.add(centerLine);

    const padGeo = new THREE.CylinderGeometry(2.25, 2.45, 0.22, 48);
    [['player', -3.5, 2.4, 0x4f8a35], ['enemy', 3.5, -2.4, 0x568f3c]].forEach(([, x, z, color]) => {
        const pad = mesh(padGeo, color, { roughness: 0.8, receiveShadow: true });
        pad.position.set(x, 0.55, z);
        scene.add(pad);
        const ring = mesh(new THREE.TorusGeometry(2.18, 0.035, 10, 64), 0xf8e8b0, { roughness: 0.5 });
        ring.position.set(x, 0.68, z);
        ring.rotation.x = Math.PI / 2;
        scene.add(ring);
    });

    for (let i = 0; i < 58; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 8 + Math.random() * 27;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        if (Math.abs(x) < 8 && Math.abs(z) < 6) continue;
        const blade = cone(0.08 + Math.random() * 0.06, 0.65 + Math.random() * 0.7, 0x3f7d32, { roughness: 1, segments: 6 });
        blade.position.set(x, 0.32, z);
        blade.rotation.z = (Math.random() - 0.5) * 0.35;
        scene.add(blade);
    }

    for (let i = 0; i < 22; i++) {
        const angle = (i / 22) * Math.PI * 2 + Math.random() * 0.1;
        const r = 17 + Math.random() * 9;
        const tx = Math.cos(angle) * r, tz = Math.sin(angle) * r;
        const trunk = cylinder(0.18, 0.28, 1.9 + Math.random() * 0.9, 0x6b4629, { segments: 8 });
        trunk.position.set(tx, 0.95, tz);
        const leaves = ellipsoid(1.15 + Math.random() * 0.45, 1.25, 1.05, 0x356f2e, { roughness: 0.9 });
        leaves.position.set(tx, 2.35 + Math.random() * 0.4, tz);
        scene.add(trunk); scene.add(leaves);
    }

    for (let i = 0; i < 14; i++) {
        const rock = ellipsoid(0.45 + Math.random() * 0.5, 0.24 + Math.random() * 0.25, 0.34 + Math.random() * 0.45, 0x8f8a78, { roughness: 0.95 });
        const angle = Math.random() * Math.PI * 2;
        const r = 9 + Math.random() * 12;
        rock.position.set(Math.cos(angle) * r, 0.22, Math.sin(angle) * r);
        rock.rotation.y = Math.random() * Math.PI;
        scene.add(rock);
    }

    for (let i = 0; i < 9; i++) {
        const cloud = new THREE.Group();
        for (let j = 0; j < 4; j++) {
            const puff = new THREE.Mesh(
                new THREE.SphereGeometry(0.9 + Math.random() * 0.45, 16, 10),
                new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 })
            );
            puff.position.set(j * 0.85, Math.random() * 0.25, (Math.random() - 0.5) * 0.35);
            puff.scale.y = 0.55;
            cloud.add(puff);
        }
        cloud.position.set(-24 + Math.random() * 48, 9 + Math.random() * 6, -26 + Math.random() * 42);
        cloud.scale.setScalar(1.2 + Math.random() * 0.8);
        scene.add(cloud);
    }
}

// =========================================================
// POKEMON BUILDERS
// =========================================================
const BUILDERS = {
    pikachu() {
        const g = new THREE.Group();
        const body = ellipsoid(0.9, 1.0, 0.9, 0xfcd83d); body.position.y = 1.0; g.add(body);
        const belly = ellipsoid(0.65, 0.7, 0.55, 0xfff1a8); belly.position.set(0, 0.95, 0.4); g.add(belly);
        const head = sphere(0.55, 0xfcd83d); head.position.set(0, 1.85, 0.1); g.add(head);
        const earGeo = new THREE.ConeGeometry(0.18, 0.9, 8);
        const earL = mesh(earGeo, 0xfcd83d); earL.position.set(-0.3, 2.45, 0); earL.rotation.z = 0.25; g.add(earL);
        const earR = mesh(earGeo, 0xfcd83d); earR.position.set(0.3, 2.45, 0); earR.rotation.z = -0.25; g.add(earR);
        const earTipGeo = new THREE.ConeGeometry(0.18, 0.3, 8);
        const tipL = mesh(earTipGeo, 0x202020); tipL.position.set(-0.4, 2.78, 0); tipL.rotation.z = 0.25; g.add(tipL);
        const tipR = mesh(earTipGeo, 0x202020); tipR.position.set(0.4, 2.78, 0); tipR.rotation.z = -0.25; g.add(tipR);
        const cheekGeo = new THREE.SphereGeometry(0.13, 10, 8);
        const cL = mesh(cheekGeo, 0xe8443c, { emissive: 0xe8443c, emissiveIntensity: 0.3 }); cL.position.set(-0.45, 1.7, 0.45); g.add(cL);
        const cR = mesh(cheekGeo, 0xe8443c, { emissive: 0xe8443c, emissiveIntensity: 0.3 }); cR.position.set(0.45, 1.7, 0.45); g.add(cR);
        const eyeGeo = new THREE.SphereGeometry(0.08, 10, 8);
        const eL = mesh(eyeGeo, 0x202020); eL.position.set(-0.22, 1.95, 0.5); g.add(eL);
        const eR = mesh(eyeGeo, 0x202020); eR.position.set(0.22, 1.95, 0.5); g.add(eR);
        // tail
        const tail = new THREE.Group();
        const t1 = box(0.18, 0.7, 0.18, 0xfcd83d); t1.position.set(0, 0.35, 0); tail.add(t1);
        const t2 = box(0.18, 0.5, 0.18, 0xfcd83d); t2.position.set(0.3, 0.7, 0); t2.rotation.z = -0.7; tail.add(t2);
        const t3 = box(0.6, 0.18, 0.18, 0xfcd83d); t3.position.set(0.55, 0.95, 0); tail.add(t3);
        const t4 = box(0.18, 0.5, 0.18, 0x7d4a16); t4.position.set(0, 0, 0); tail.add(t4);
        tail.position.set(0, 0.3, -0.7); tail.rotation.x = -0.5; g.add(tail);
        const footL = ellipsoid(0.22, 0.12, 0.3, 0xfcd83d); footL.position.set(-0.35, 0.12, 0.15); g.add(footL);
        const footR = ellipsoid(0.22, 0.12, 0.3, 0xfcd83d); footR.position.set(0.35, 0.12, 0.15); g.add(footR);
        addPart(g, ellipsoid(0.18, 0.13, 0.12, 0xf7c83b), [-0.58, 1.0, 0.32], [0, 0, 0.45]);
        addPart(g, ellipsoid(0.18, 0.13, 0.12, 0xf7c83b), [0.58, 1.0, 0.32], [0, 0, -0.45]);
        addPart(g, ellipsoid(0.045, 0.02, 0.05, 0xffffff, { roughness: 0.18 }), [-0.19, 1.98, 0.56]);
        addPart(g, ellipsoid(0.045, 0.02, 0.05, 0xffffff, { roughness: 0.18 }), [0.25, 1.98, 0.56]);
        addPart(g, cylinder(0.025, 0.025, 0.28, 0x202020), [0, 1.68, 0.58], [Math.PI / 2, 0, 0]);
        g.scale.setScalar(1.03);
        return g;
    },

    charmander() {
        const g = new THREE.Group();
        const body = ellipsoid(0.7, 0.9, 0.7, 0xf08030); body.position.y = 1.0; g.add(body);
        const belly = ellipsoid(0.5, 0.6, 0.45, 0xfbd2a0); belly.position.set(0, 0.95, 0.4); g.add(belly);
        const head = sphere(0.6, 0xf08030); head.position.set(0, 1.95, 0.05); g.add(head);
        const snout = ellipsoid(0.32, 0.22, 0.25, 0xfbd2a0); snout.position.set(0, 1.85, 0.55); g.add(snout);
        const eyeGeo = new THREE.SphereGeometry(0.12, 10, 8);
        const eL = mesh(eyeGeo, 0xffffff); eL.position.set(-0.22, 2.15, 0.5); g.add(eL);
        const eR = mesh(eyeGeo, 0xffffff); eR.position.set(0.22, 2.15, 0.5); g.add(eR);
        const pupGeo = new THREE.SphereGeometry(0.06, 8, 6);
        const pL = mesh(pupGeo, 0x202020); pL.position.set(-0.22, 2.15, 0.6); g.add(pL);
        const pR = mesh(pupGeo, 0x202020); pR.position.set(0.22, 2.15, 0.6); g.add(pR);
        const armGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.5, 8);
        const armL = mesh(armGeo, 0xf08030); armL.position.set(-0.75, 1.1, 0.1); armL.rotation.z = 0.5; g.add(armL);
        const armR = mesh(armGeo, 0xf08030); armR.position.set(0.75, 1.1, 0.1); armR.rotation.z = -0.5; g.add(armR);
        const legGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.45, 10);
        const legL = mesh(legGeo, 0xf08030); legL.position.set(-0.3, 0.32, 0.1); g.add(legL);
        const legR = mesh(legGeo, 0xf08030); legR.position.set(0.3, 0.32, 0.1); g.add(legR);
        const ftL = ellipsoid(0.22, 0.1, 0.32, 0xfbd2a0); ftL.position.set(-0.3, 0.08, 0.18); g.add(ftL);
        const ftR = ellipsoid(0.22, 0.1, 0.32, 0xfbd2a0); ftR.position.set(0.3, 0.08, 0.18); g.add(ftR);
        const tailBase = mesh(new THREE.CylinderGeometry(0.22, 0.12, 1.0, 10), 0xf08030);
        tailBase.position.set(0, 0.95, -0.65); tailBase.rotation.x = 0.7; g.add(tailBase);
        const flameGroup = new THREE.Group();
        const flame = mesh(new THREE.ConeGeometry(0.32, 0.7, 12), 0xff7f00, { emissive: 0xff7f00, emissiveIntensity: 0.6 });
        flameGroup.add(flame);
        const flameInner = mesh(new THREE.ConeGeometry(0.18, 0.5, 12), 0xffd200, { emissive: 0xffd200, emissiveIntensity: 0.8 });
        flameInner.position.set(0, 0, 0.05); flameGroup.add(flameInner);
        flameGroup.position.set(0, 1.6, -1.3);
        g.add(flameGroup);
        g.userData.flame = flameGroup;
        return g;
    },

    bulbasaur() {
        const g = new THREE.Group();
        const body = ellipsoid(1.0, 0.7, 0.95, 0x78c850); body.position.y = 0.7; g.add(body);
        const belly = ellipsoid(0.7, 0.45, 0.5, 0xa8e090); belly.position.set(0, 0.6, 0.4); g.add(belly);
        const head = sphere(0.55, 0x78c850); head.position.set(0, 0.85, 0.85); g.add(head);
        const bulb = sphere(0.65, 0x5fa052); bulb.position.set(0, 1.2, -0.3); g.add(bulb);
        const leaf1 = mesh(new THREE.ConeGeometry(0.3, 0.6, 8), 0x7ec068); leaf1.position.set(-0.2, 1.7, -0.3); leaf1.rotation.z = 0.5; g.add(leaf1);
        const leaf2 = mesh(new THREE.ConeGeometry(0.3, 0.6, 8), 0x7ec068); leaf2.position.set(0.25, 1.65, -0.3); leaf2.rotation.z = -0.4; g.add(leaf2);
        const leaf3 = mesh(new THREE.ConeGeometry(0.25, 0.5, 8), 0x7ec068); leaf3.position.set(0, 1.75, 0); g.add(leaf3);
        const spotGeo = new THREE.SphereGeometry(0.15, 8, 6);
        const sp1 = mesh(spotGeo, 0x3b6b30); sp1.position.set(-0.6, 1.0, -0.2); sp1.scale.set(1, 0.4, 1); g.add(sp1);
        const sp2 = mesh(spotGeo, 0x3b6b30); sp2.position.set(0.55, 1.05, -0.3); sp2.scale.set(1, 0.4, 1); g.add(sp2);
        const eyeGeo = new THREE.SphereGeometry(0.1, 10, 8);
        const eL = mesh(eyeGeo, 0xffffff); eL.position.set(-0.22, 0.95, 1.3); g.add(eL);
        const eR = mesh(eyeGeo, 0xffffff); eR.position.set(0.22, 0.95, 1.3); g.add(eR);
        const pL = mesh(new THREE.SphereGeometry(0.05, 8, 6), 0xa02828); pL.position.set(-0.22, 0.95, 1.4); g.add(pL);
        const pR = mesh(new THREE.SphereGeometry(0.05, 8, 6), 0xa02828); pR.position.set(0.22, 0.95, 1.4); g.add(pR);
        const legGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.3, 8);
        for (const p of [[-0.55, 0.15, 0.4], [0.55, 0.15, 0.4], [-0.55, 0.15, -0.4], [0.55, 0.15, -0.4]]) {
            const m = mesh(legGeo, 0x78c850); m.position.set(...p); g.add(m);
        }
        return g;
    },

    squirtle() {
        const g = new THREE.Group();
        const shell = sphere(0.95, 0xa06030); shell.position.set(0, 1.0, -0.15); shell.scale.set(1, 0.8, 1); g.add(shell);
        const under = ellipsoid(0.85, 0.3, 0.7, 0xf8e0a0); under.position.set(0, 0.55, -0.1); g.add(under);
        const body = ellipsoid(0.65, 0.55, 0.55, 0x80c0f0); body.position.set(0, 0.85, 0.4); g.add(body);
        const head = sphere(0.5, 0x80c0f0); head.position.set(0, 1.2, 0.85); g.add(head);
        const eyeGeo = new THREE.SphereGeometry(0.1, 10, 8);
        const eL = mesh(eyeGeo, 0xffffff); eL.position.set(-0.18, 1.3, 1.25); g.add(eL);
        const eR = mesh(eyeGeo, 0xffffff); eR.position.set(0.18, 1.3, 1.25); g.add(eR);
        const pL = mesh(new THREE.SphereGeometry(0.05, 8, 6), 0x202020); pL.position.set(-0.18, 1.3, 1.34); g.add(pL);
        const pR = mesh(new THREE.SphereGeometry(0.05, 8, 6), 0x202020); pR.position.set(0.18, 1.3, 1.34); g.add(pR);
        const armGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.4, 8);
        const aL = mesh(armGeo, 0x80c0f0); aL.position.set(-0.65, 0.85, 0.4); aL.rotation.z = 0.5; g.add(aL);
        const aR = mesh(armGeo, 0x80c0f0); aR.position.set(0.65, 0.85, 0.4); aR.rotation.z = -0.5; g.add(aR);
        const legGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.35, 8);
        const lL = mesh(legGeo, 0x80c0f0); lL.position.set(-0.4, 0.2, 0.25); g.add(lL);
        const lR = mesh(legGeo, 0x80c0f0); lR.position.set(0.4, 0.2, 0.25); g.add(lR);
        const tail = mesh(new THREE.TorusGeometry(0.15, 0.08, 8, 16, Math.PI * 1.4), 0x80c0f0);
        tail.position.set(0, 0.9, -0.85); tail.rotation.x = Math.PI / 2; g.add(tail);
        return g;
    },

    eevee() {
        const g = new THREE.Group();
        const body = ellipsoid(0.75, 0.55, 0.85, 0xc98d50); body.position.set(0, 0.7, 0); g.add(body);
        const belly = ellipsoid(0.55, 0.35, 0.55, 0xf5e0a0); belly.position.set(0, 0.55, 0.3); g.add(belly);
        const head = sphere(0.5, 0xc98d50); head.position.set(0, 0.95, 0.85); g.add(head);
        const ruff = ellipsoid(0.55, 0.25, 0.4, 0xf5e0a0); ruff.position.set(0, 0.65, 0.55); g.add(ruff);
        const earGeo = new THREE.ConeGeometry(0.22, 0.6, 8);
        const eL = mesh(earGeo, 0xc98d50); eL.position.set(-0.3, 1.4, 0.85); eL.rotation.z = 0.3; g.add(eL);
        const eR = mesh(earGeo, 0xc98d50); eR.position.set(0.3, 1.4, 0.85); eR.rotation.z = -0.3; g.add(eR);
        const eyeGeo = new THREE.SphereGeometry(0.1, 10, 8);
        const eyeL = mesh(eyeGeo, 0x202020); eyeL.position.set(-0.18, 1.05, 1.25); g.add(eyeL);
        const eyeR = mesh(eyeGeo, 0x202020); eyeR.position.set(0.18, 1.05, 1.25); g.add(eyeR);
        const nose = mesh(new THREE.SphereGeometry(0.08, 8, 6), 0x202020); nose.position.set(0, 0.85, 1.32); g.add(nose);
        const legGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.35, 8);
        for (const p of [[-0.4, 0.2, 0.3], [0.4, 0.2, 0.3], [-0.4, 0.2, -0.3], [0.4, 0.2, -0.3]]) {
            const m = mesh(legGeo, 0xc98d50); m.position.set(...p); g.add(m);
        }
        const tail = sphere(0.4, 0xf5e0a0); tail.position.set(0, 0.85, -0.85); g.add(tail);
        const tailTip = sphere(0.25, 0xa06030); tailTip.position.set(0, 1.05, -1.05); g.add(tailTip);
        return g;
    },

    gengar() {
        const g = new THREE.Group();
        const body = ellipsoid(0.95, 0.95, 0.95, 0x705898); body.position.y = 1.05; g.add(body);
        const spikeGeo = new THREE.ConeGeometry(0.12, 0.4, 6);
        for (let i = -2; i <= 2; i++) {
            const s = mesh(spikeGeo, 0x604888); s.position.set(i * 0.3, 2.0, -0.4); g.add(s);
        }
        const armGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.5, 8);
        const aL = mesh(armGeo, 0x705898); aL.position.set(-0.95, 1.0, 0); aL.rotation.z = 0.5; g.add(aL);
        const aR = mesh(armGeo, 0x705898); aR.position.set(0.95, 1.0, 0); aR.rotation.z = -0.5; g.add(aR);
        const legGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.3, 8);
        const lL = mesh(legGeo, 0x705898); lL.position.set(-0.4, 0.18, 0.05); g.add(lL);
        const lR = mesh(legGeo, 0x705898); lR.position.set(0.4, 0.18, 0.05); g.add(lR);
        const eyeGeo = new THREE.SphereGeometry(0.13, 10, 8);
        const eL = mesh(eyeGeo, 0xffffff); eL.position.set(-0.32, 1.4, 0.78); g.add(eL);
        const eR = mesh(eyeGeo, 0xffffff); eR.position.set(0.32, 1.4, 0.78); g.add(eR);
        const pL = mesh(new THREE.SphereGeometry(0.07, 8, 6), 0xd02828, { emissive: 0xd02828, emissiveIntensity: 0.7 }); pL.position.set(-0.32, 1.4, 0.88); g.add(pL);
        const pR = mesh(new THREE.SphereGeometry(0.07, 8, 6), 0xd02828, { emissive: 0xd02828, emissiveIntensity: 0.7 }); pR.position.set(0.32, 1.4, 0.88); g.add(pR);
        const grin = box(0.7, 0.18, 0.1, 0xffffff); grin.position.set(0, 1.05, 0.85); g.add(grin);
        return g;
    },

    snorlax() {
        const g = new THREE.Group();
        const body = ellipsoid(1.6, 1.4, 1.5, 0x5878a0); body.position.y = 1.4; g.add(body);
        const belly = ellipsoid(1.2, 0.9, 0.9, 0xe0d0a0); belly.position.set(0, 1.2, 0.8); g.add(belly);
        const head = ellipsoid(0.85, 0.7, 0.85, 0x5878a0); head.position.set(0, 2.7, 0.1); g.add(head);
        const earGeo = new THREE.ConeGeometry(0.2, 0.4, 6);
        const eL = mesh(earGeo, 0x5878a0); eL.position.set(-0.6, 3.15, 0); eL.rotation.z = 0.3; g.add(eL);
        const eR = mesh(earGeo, 0x5878a0); eR.position.set(0.6, 3.15, 0); eR.rotation.z = -0.3; g.add(eR);
        const eyeL = box(0.15, 0.04, 0.04, 0x202020); eyeL.position.set(-0.28, 2.78, 0.78); g.add(eyeL);
        const eyeR = box(0.15, 0.04, 0.04, 0x202020); eyeR.position.set(0.28, 2.78, 0.78); g.add(eyeR);
        const arm = mesh(new THREE.SphereGeometry(0.5, 12, 10), 0x5878a0);
        arm.position.set(-1.6, 1.3, 0.3); g.add(arm);
        const arm2 = mesh(new THREE.SphereGeometry(0.5, 12, 10), 0x5878a0);
        arm2.position.set(1.6, 1.3, 0.3); g.add(arm2);
        const ft = mesh(new THREE.SphereGeometry(0.55, 12, 10), 0x5878a0);
        ft.position.set(-0.8, 0.3, 0.5); ft.scale.set(1, 0.5, 1.3); g.add(ft);
        const ft2 = mesh(new THREE.SphereGeometry(0.55, 12, 10), 0x5878a0);
        ft2.position.set(0.8, 0.3, 0.5); ft2.scale.set(1, 0.5, 1.3); g.add(ft2);
        const pad = mesh(new THREE.SphereGeometry(0.32, 10, 8), 0xe0d0a0);
        pad.position.set(-0.8, 0.32, 0.85); pad.scale.set(1, 0.3, 1); g.add(pad);
        const pad2 = mesh(new THREE.SphereGeometry(0.32, 10, 8), 0xe0d0a0);
        pad2.position.set(0.8, 0.32, 0.85); pad2.scale.set(1, 0.3, 1); g.add(pad2);
        return g;
    },

    charizard() {
        const g = new THREE.Group();
        const orange = 0xe66f2d;
        const cream = 0xf3d19b;
        const wingBlue = 0x3fa7d9;
        addPart(g, ellipsoid(0.9, 1.25, 0.72, orange, { roughness: 0.58 }), [0, 1.35, 0]);
        addPart(g, ellipsoid(0.58, 0.9, 0.35, cream, { roughness: 0.62 }), [0, 1.26, 0.52]);
        addPart(g, ellipsoid(0.72, 0.58, 0.62, orange, { roughness: 0.56 }), [0, 2.55, 0.14]);
        addPart(g, ellipsoid(0.38, 0.22, 0.28, cream, { roughness: 0.62 }), [0, 2.42, 0.72]);
        addEye(g, -0.24, 2.68, 0.66, 0x1c8d6a);
        addEye(g, 0.24, 2.68, 0.66, 0x1c8d6a);
        addPart(g, cone(0.14, 0.55, orange), [-0.32, 3.06, 0.02], [0.18, 0, 0.4]);
        addPart(g, cone(0.14, 0.55, orange), [0.32, 3.06, 0.02], [0.18, 0, -0.4]);

        const wingL = makeWing(orange, wingBlue);
        wingL.position.set(-0.72, 2.02, -0.38);
        wingL.rotation.set(0.15, -0.65, 0.5);
        g.add(wingL);
        const wingR = makeWing(orange, wingBlue);
        wingR.position.set(0.72, 2.02, -0.38);
        wingR.rotation.set(0.15, 0.65, -0.5);
        wingR.scale.x = -1;
        g.add(wingR);

        addPart(g, cylinder(0.13, 0.19, 0.88, orange), [-0.82, 1.45, 0.15], [0.25, 0, 0.72]);
        addPart(g, cylinder(0.13, 0.19, 0.88, orange), [0.82, 1.45, 0.15], [0.25, 0, -0.72]);
        addPart(g, cylinder(0.22, 0.28, 0.82, orange), [-0.35, 0.48, 0.1], [0.1, 0, 0]);
        addPart(g, cylinder(0.22, 0.28, 0.82, orange), [0.35, 0.48, 0.1], [0.1, 0, 0]);
        addPart(g, ellipsoid(0.36, 0.13, 0.5, cream), [-0.38, 0.12, 0.28]);
        addPart(g, ellipsoid(0.36, 0.13, 0.5, cream), [0.38, 0.12, 0.28]);
        for (const x of [-0.55, -0.35, 0.35, 0.55]) addPart(g, cone(0.055, 0.22, 0xf6f0dd), [x, 0.14, 0.72], [Math.PI / 2, 0, 0]);

        const tailCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 1.0, -0.54),
            new THREE.Vector3(0.25, 0.78, -1.18),
            new THREE.Vector3(0.72, 1.08, -1.78),
            new THREE.Vector3(0.9, 1.75, -2.18)
        ]);
        g.add(mesh(new THREE.TubeGeometry(tailCurve, 36, 0.16, 12, false), orange, { roughness: 0.56 }));
        const flameGroup = new THREE.Group();
        addPart(flameGroup, cone(0.38, 0.86, 0xff6500, { emissive: 0xff6500, emissiveIntensity: 0.9 }), [0, 0.15, 0]);
        addPart(flameGroup, cone(0.22, 0.6, 0xffe35b, { emissive: 0xffd200, emissiveIntensity: 1.1 }), [0.02, 0.04, 0.05]);
        flameGroup.position.set(0.95, 2.05, -2.28);
        flameGroup.rotation.x = -0.45;
        g.add(flameGroup);
        g.userData.flame = flameGroup;
        g.scale.setScalar(1.05);
        return g;
    },

    dragonite() {
        const g = new THREE.Group();
        const orange = 0xdf8b3f;
        const cream = 0xf3d7a4;
        const green = 0x75b86f;
        addPart(g, ellipsoid(1.12, 1.35, 0.88, orange, { roughness: 0.7 }), [0, 1.45, 0]);
        addPart(g, ellipsoid(0.68, 1.08, 0.35, cream, { roughness: 0.78 }), [0, 1.32, 0.58]);
        for (let i = 0; i < 4; i++) addPart(g, box(0.46, 0.045, 0.035, 0xd1aa78), [0, 0.86 + i * 0.28, 0.96]);
        addPart(g, ellipsoid(0.7, 0.62, 0.7, orange, { roughness: 0.66 }), [0, 2.78, 0.2]);
        addPart(g, ellipsoid(0.38, 0.22, 0.34, cream, { roughness: 0.7 }), [0, 2.63, 0.78]);
        addEye(g, -0.23, 2.88, 0.72, 0x2b7d44);
        addEye(g, 0.23, 2.88, 0.72, 0x2b7d44);
        addPart(g, cylinder(0.035, 0.045, 0.86, 0x7b5f34), [-0.22, 3.3, 0.1], [0.55, 0, 0.25]);
        addPart(g, cylinder(0.035, 0.045, 0.86, 0x7b5f34), [0.22, 3.3, 0.1], [0.55, 0, -0.25]);

        const wingL = makeWing(orange, green);
        wingL.scale.set(0.78, 0.78, 0.78);
        wingL.position.set(-0.78, 2.1, -0.48);
        wingL.rotation.set(0.2, -0.45, 0.58);
        g.add(wingL);
        const wingR = makeWing(orange, green);
        wingR.scale.set(-0.78, 0.78, 0.78);
        wingR.position.set(0.78, 2.1, -0.48);
        wingR.rotation.set(0.2, 0.45, -0.58);
        g.add(wingR);

        addPart(g, cylinder(0.18, 0.22, 0.82, orange), [-0.88, 1.42, 0.2], [0.15, 0, 0.75]);
        addPart(g, cylinder(0.18, 0.22, 0.82, orange), [0.88, 1.42, 0.2], [0.15, 0, -0.75]);
        addPart(g, cylinder(0.24, 0.31, 0.78, orange), [-0.42, 0.48, 0.05]);
        addPart(g, cylinder(0.24, 0.31, 0.78, orange), [0.42, 0.48, 0.05]);
        addPart(g, ellipsoid(0.38, 0.15, 0.48, cream), [-0.46, 0.1, 0.35]);
        addPart(g, ellipsoid(0.38, 0.15, 0.48, cream), [0.46, 0.1, 0.35]);
        const tailCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 1.05, -0.72),
            new THREE.Vector3(0.1, 0.82, -1.4),
            new THREE.Vector3(0.3, 0.92, -2.02),
            new THREE.Vector3(0.12, 1.12, -2.55)
        ]);
        g.add(mesh(new THREE.TubeGeometry(tailCurve, 36, 0.2, 12, false), orange, { roughness: 0.68 }));
        g.scale.setScalar(1.0);
        return g;
    },

    mewtwo() {
        const g = new THREE.Group();
        const pale = 0xcfd1dc;
        const purple = 0x8b6caa;
        addPart(g, ellipsoid(0.48, 1.08, 0.42, pale, { roughness: 0.42 }), [0, 1.55, 0]);
        addPart(g, ellipsoid(0.3, 0.58, 0.22, purple, { roughness: 0.5 }), [0, 1.46, 0.42]);
        addPart(g, cylinder(0.13, 0.16, 0.82, pale), [-0.27, 0.55, 0.04], [0.04, 0, 0.08]);
        addPart(g, cylinder(0.13, 0.16, 0.82, pale), [0.27, 0.55, 0.04], [0.04, 0, -0.08]);
        addPart(g, ellipsoid(0.25, 0.11, 0.42, pale), [-0.32, 0.12, 0.22]);
        addPart(g, ellipsoid(0.25, 0.11, 0.42, pale), [0.32, 0.12, 0.22]);
        addPart(g, cylinder(0.1, 0.14, 0.95, pale), [-0.63, 1.48, 0.08], [0.05, 0, 0.45]);
        addPart(g, cylinder(0.1, 0.14, 0.95, pale), [0.63, 1.48, 0.08], [0.05, 0, -0.45]);
        addPart(g, ellipsoid(0.16, 0.1, 0.2, pale), [-0.92, 1.12, 0.16]);
        addPart(g, ellipsoid(0.16, 0.1, 0.2, pale), [0.92, 1.12, 0.16]);
        addPart(g, ellipsoid(0.56, 0.68, 0.5, pale, { roughness: 0.4 }), [0, 2.68, 0.04]);
        addPart(g, ellipsoid(0.34, 0.34, 0.32, pale, { roughness: 0.4 }), [0.34, 2.7, -0.1]);
        addPart(g, ellipsoid(0.26, 0.18, 0.24, pale, { roughness: 0.4 }), [-0.38, 2.63, -0.05]);
        addPart(g, cylinder(0.08, 0.08, 1.0, purple, { roughness: 0.5 }), [0.42, 2.2, -0.28], [0.65, 0.2, -0.35]);
        addPart(g, sphere(0.085, 0x7b50df, { emissive: 0x7b50df, emissiveIntensity: 1.15 }), [-0.17, 2.7, 0.5]);
        addPart(g, sphere(0.085, 0x7b50df, { emissive: 0x7b50df, emissiveIntensity: 1.15 }), [0.17, 2.7, 0.5]);
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 1.3, -0.3),
            new THREE.Vector3(0.6, 1.0, -0.9),
            new THREE.Vector3(1.2, 1.5, -0.6),
            new THREE.Vector3(1.4, 2.3, -0.2)
        ]);
        g.add(mesh(new THREE.TubeGeometry(curve, 40, 0.13, 12, false), purple, { roughness: 0.48 }));
        return g;
    }
};

// =========================================================
// POKEMON DATA
// =========================================================
const POKEDEX = {
    pikachu:    { name: 'Pikachu',    type: 'electric', maxHp: 80,  builder: 'pikachu',
                  moves: [ {name:'Thunderbolt', type:'electric', power:25}, {name:'Quick Attack', type:'normal', power:18}, {name:'Iron Tail', type:'normal', power:22}, {name:'Thunder', type:'electric', power:32}] },
    charmander: { name: 'Charmander', type: 'fire', maxHp: 85, builder: 'charmander',
                  moves: [ {name:'Ember', type:'fire', power:22}, {name:'Scratch', type:'normal', power:16}, {name:'Flamethrower', type:'fire', power:30}, {name:'Slash', type:'normal', power:24}] },
    bulbasaur:  { name: 'Bulbasaur',  type: 'grass', maxHp: 90, builder: 'bulbasaur',
                  moves: [ {name:'Vine Whip', type:'grass', power:22}, {name:'Tackle', type:'normal', power:18}, {name:'Razor Leaf', type:'grass', power:28}, {name:'Solar Beam', type:'grass', power:34}] },
    squirtle:   { name: 'Squirtle',   type: 'water', maxHp: 88, builder: 'squirtle',
                  moves: [ {name:'Water Gun', type:'water', power:22}, {name:'Tackle', type:'normal', power:18}, {name:'Bubble Beam', type:'water', power:26}, {name:'Hydro Pump', type:'water', power:34}] },
    eevee:      { name: 'Eevee',      type: 'normal', maxHp: 75, builder: 'eevee',
                  moves: [ {name:'Tackle', type:'normal', power:18}, {name:'Quick Attack', type:'normal', power:20}, {name:'Bite', type:'normal', power:22}] },
    gengar:     { name: 'Gengar',     type: 'ghost', maxHp: 95, builder: 'gengar',
                  moves: [ {name:'Shadow Ball', type:'ghost', power:28}, {name:'Lick', type:'ghost', power:18}, {name:'Hypnosis', type:'psychic', power:22}] },
    snorlax:    { name: 'Snorlax',    type: 'normal', maxHp: 130, builder: 'snorlax',
                  moves: [ {name:'Body Slam', type:'normal', power:26}, {name:'Headbutt', type:'normal', power:20}, {name:'Hyper Beam', type:'normal', power:34}] },
    charizard:  { name: 'Charizard',  type: 'fire', maxHp: 125, builder: 'charizard',
                  moves: [ {name:'Flamethrower', type:'fire', power:32}, {name:'Wing Strike', type:'normal', power:24}, {name:'Fire Spin', type:'fire', power:26}, {name:'Dragon Claw', type:'normal', power:30}] },
    dragonite:  { name: 'Dragonite',  type: 'normal', maxHp: 135, builder: 'dragonite',
                  moves: [ {name:'Dragon Rush', type:'normal', power:32}, {name:'Thunder Punch', type:'electric', power:27}, {name:'Aqua Tail', type:'water', power:28}, {name:'Fire Punch', type:'fire', power:27}] },
    mewtwo:     { name: 'Mewtwo',     type: 'psychic', maxHp: 140, builder: 'mewtwo',
                  moves: [ {name:'Psychic', type:'psychic', power:32}, {name:'Shadow Ball', type:'ghost', power:26}, {name:'Aura Sphere', type:'normal', power:28}, {name:'Recover', type:'psychic', power:0, heal:40}] }
};

function makePokemon(key) {
    const base = POKEDEX[key];
    return { key, name: base.name, type: base.type, hp: base.maxHp, maxHp: base.maxHp, moves: base.moves, builder: base.builder };
}

// =========================================================
// GAME STATE
// =========================================================
let state = 'pick';
let player = null, enemy = null;
let trainerIndex = 0;
let messageQueue = [];
let currentMessage = null;
let messageTimer = 0;
let busy = false;

let playerAnim = { lunge: 0, hurt: 0, baseX: -3.5, baseZ: 2.4 };
let enemyAnim  = { lunge: 0, hurt: 0, baseX: 3.5, baseZ: -2.4 };
let effects = [];

const TRAINERS = [
    { name: 'Wild Eevee',     mons: ['eevee'],     intro: 'A wild EEVEE appeared!', wild: true },
    { name: 'Wild Bulbasaur', mons: ['bulbasaur'], intro: 'A wild BULBASAUR appeared!', wild: true },
    { name: 'Wild Squirtle',  mons: ['squirtle'],  intro: 'A wild SQUIRTLE appeared!', wild: true },
    { name: 'Ghost Trainer',  mons: ['gengar'],    intro: 'GHOST TRAINER sent out GENGAR!', wild: false },
    { name: 'Fire Ace',       mons: ['charizard'], intro: 'FIRE ACE sent out CHARIZARD!', wild: false },
    { name: 'Dragon Master',  mons: ['dragonite'], intro: 'DRAGON MASTER sent out DRAGONITE!', wild: false },
    { name: 'Champion',       mons: ['mewtwo'],    intro: 'CHAMPION sent out MEWTWO!', wild: false }
];

// =========================================================
// DOM
// =========================================================
const $ = id => document.getElementById(id);
const screenEl = $('screen');
const hudEl = $('hud');
const bottomEl = $('bottomPanel');
const moveBoxEl = $('moveBox');
const messageBoxEl = $('messageBox');

function buildStarterPicker() {
    const c = $('starterPick');
    c.innerHTML = '';
    const icons = { pikachu: 'P', charizard: 'C', dragonite: 'D', mewtwo: 'M' };
    ['pikachu', 'charizard', 'dragonite', 'mewtwo'].forEach(key => {
        const p = POKEDEX[key];
        const div = document.createElement('div');
        div.className = 'starter';
        div.innerHTML = `
            <div class="icon">${icons[key]}</div>
            <p>${p.name}</p>
            <span class="type-pill" style="background:${TYPE_COLOR[p.type]}">${p.type.toUpperCase()}</span>
            <p class="hp-text">HP ${p.maxHp}</p>
        `;
        div.onclick = () => pickStarter(key);
        c.appendChild(div);
    });
}

function showStartScreen() {
    screenEl.classList.remove('hidden');
    hudEl.classList.add('hidden');
    bottomEl.classList.add('hidden');
}
function hideStartScreen() {
    screenEl.classList.add('hidden');
    hudEl.classList.remove('hidden');
    bottomEl.classList.remove('hidden');
}

function updateHud() {
    if (!player || !enemy) return;
    $('playerName').textContent = player.name;
    $('enemyName').textContent = enemy.name;
    $('playerType').textContent = player.type.toUpperCase();
    $('enemyType').textContent = enemy.type.toUpperCase();
    $('playerType').style.background = TYPE_COLOR[player.type];
    $('enemyType').style.background = TYPE_COLOR[enemy.type];
    $('playerHpNum').textContent = `${player.hp}/${player.maxHp}`;
    $('enemyHpNum').textContent = `${enemy.hp}/${enemy.maxHp}`;
    const pr = player.hp / player.maxHp;
    const er = enemy.hp / enemy.maxHp;
    const pf = $('playerHpFill'), ef = $('enemyHpFill');
    pf.style.width = (pr * 100) + '%';
    ef.style.width = (er * 100) + '%';
    pf.style.background = pr < 0.2 ? '#e04030' : pr < 0.5 ? '#f0c020' : '#48c020';
    ef.style.background = er < 0.2 ? '#e04030' : er < 0.5 ? '#f0c020' : '#48c020';
}

function showMoveBox() {
    moveBoxEl.classList.remove('hidden');
    messageBoxEl.classList.add('hidden');
    const c = $('moves');
    c.innerHTML = '';
    player.moves.forEach((m, i) => {
        const btn = document.createElement('div');
        btn.className = 'move-btn';
        btn.innerHTML = `
            <div class="move-key">${i + 1}</div>
            <div class="move-name">${m.name}</div>
            <div class="move-type" style="background:${TYPE_COLOR[m.type]}">${m.type.toUpperCase()}</div>
            <div class="move-pow">${m.heal ? `+${m.heal}` : `Pow ${m.power}`}</div>
        `;
        btn.onclick = () => playerUseMove(i);
        c.appendChild(btn);
    });
    $('runHint').textContent = TRAINERS[trainerIndex].wild
        ? 'Press R to run from this wild battle'
        : 'Trainer battle - you cannot run';
}

function showMessageBox(text) {
    moveBoxEl.classList.add('hidden');
    messageBoxEl.classList.remove('hidden');
    $('messageText').textContent = text;
}

// =========================================================
// SPAWN
// =========================================================
function spawnPlayer(key) {
    if (playerGroup) scene.remove(playerGroup);
    playerGroup = BUILDERS[POKEDEX[key].builder]();
    playerGroup.position.set(playerAnim.baseX, 0.2, playerAnim.baseZ);
    playerGroup.rotation.y = Math.PI * 0.7;
    scene.add(playerGroup);
}
function spawnEnemy(key) {
    if (enemyGroup) scene.remove(enemyGroup);
    enemyGroup = BUILDERS[POKEDEX[key].builder]();
    enemyGroup.position.set(enemyAnim.baseX, 0.2, enemyAnim.baseZ);
    enemyGroup.rotation.y = Math.PI * 1.7;
    enemyGroup.scale.set(0.01, 0.01, 0.01);
    scene.add(enemyGroup);
}

// =========================================================
// FLOW
// =========================================================
function pickStarter(key) {
    player = makePokemon(key);
    trainerIndex = 0;
    spawnPlayer(key);
    hideStartScreen();
    startNextBattle();
}

function startNextBattle() {
    if (trainerIndex >= TRAINERS.length) { showWinScreen(); return; }
    const t = TRAINERS[trainerIndex];
    enemy = makePokemon(t.mons[0]);
    spawnEnemy(t.mons[0]);
    updateHud();
    queueMessage(t.intro);
    queueMessage(`Go, ${player.name}!`, () => { state = 'choose'; showMoveBox(); });
}

function queueMessage(text, after) {
    messageQueue.push({ text, after });
    if (!currentMessage) advanceMessage();
}

function advanceMessage() {
    if (messageQueue.length === 0) {
        currentMessage = null;
        busy = false;
        return;
    }
    currentMessage = messageQueue.shift();
    messageTimer = 110;
    busy = true;
    showMessageBox(currentMessage.text);
}

// =========================================================
// COMBAT
// =========================================================
function calcDamage(attacker, defender, move) {
    const eff = TYPE_CHART[move.type] && TYPE_CHART[move.type][defender.type];
    const e = eff === undefined ? 1 : eff;
    const variance = 0.85 + Math.random() * 0.3;
    const dmg = Math.max(1, Math.floor(move.power * e * variance));
    return { dmg, eff: e };
}

function playerUseMove(idx) {
    if (state !== 'choose' || busy) return;
    const move = player.moves[idx];
    if (!move) return;
    busy = true;
    state = 'playerAttack';
    playerAnim.lunge = 1.0;
    spawnEffect('player', move.type);
    setTimeout(() => {
        if (move.heal) {
            const h = Math.min(move.heal, player.maxHp - player.hp);
            player.hp += h; updateHud();
            queueMessage(`${player.name} used ${move.name}! Recovered ${h} HP.`, afterPlayerMove);
        } else {
            const r = calcDamage(player, enemy, move);
            enemy.hp = Math.max(0, enemy.hp - r.dmg);
            enemyAnim.hurt = 1.0;
            updateHud();
            queueMessage(`${player.name} used ${move.name}!`);
            if (r.eff > 1) queueMessage("It's super effective!");
            else if (r.eff === 0) queueMessage('It had no effect...');
            else if (r.eff < 1) queueMessage("It's not very effective...");
            queueMessage(`Dealt ${r.dmg} damage.`, afterPlayerMove);
        }
    }, 500);
}

function afterPlayerMove() {
    if (enemy.hp <= 0) {
        queueMessage(`${enemy.name} fainted!`, () => {
            if (enemyGroup) scene.remove(enemyGroup);
            enemyGroup = null;
            trainerIndex++;
            if (trainerIndex >= TRAINERS.length) showWinScreen();
            else queueMessage('You won the battle!', startNextBattle);
        });
        return;
    }
    state = 'enemyAttack';
    setTimeout(enemyTurn, 500);
}

function enemyTurn() {
    let best = enemy.moves[0], bestScore = -1;
    for (const m of enemy.moves) {
        if (m.heal && enemy.hp < enemy.maxHp * 0.35) { best = m; break; }
        const eff = TYPE_CHART[m.type] && TYPE_CHART[m.type][player.type];
        const e = eff === undefined ? 1 : eff;
        const score = m.power * e;
        if (score > bestScore) { bestScore = score; best = m; }
    }
    enemyAnim.lunge = 1.0;
    spawnEffect('enemy', best.type);
    setTimeout(() => {
        if (best.heal) {
            const h = Math.min(best.heal, enemy.maxHp - enemy.hp);
            enemy.hp += h; updateHud();
            queueMessage(`Foe ${enemy.name} used ${best.name}! Recovered ${h} HP.`, afterEnemyMove);
        } else {
            const r = calcDamage(enemy, player, best);
            player.hp = Math.max(0, player.hp - r.dmg);
            playerAnim.hurt = 1.0;
            updateHud();
            queueMessage(`Foe ${enemy.name} used ${best.name}!`);
            if (r.eff > 1) queueMessage("It's super effective!");
            else if (r.eff === 0) queueMessage('It had no effect...');
            else if (r.eff < 1) queueMessage("It's not very effective...");
            queueMessage(`You took ${r.dmg} damage.`, afterEnemyMove);
        }
    }, 500);
}

function afterEnemyMove() {
    if (player.hp <= 0) { queueMessage(`${player.name} fainted!`, showLoseScreen); return; }
    state = 'choose';
    busy = false;
    showMoveBox();
}

function tryRun() {
    if (state !== 'choose' || busy) return;
    if (!TRAINERS[trainerIndex].wild) {
        busy = true;
        queueMessage("Can't run from a trainer battle!", () => { state = 'choose'; showMoveBox(); });
        return;
    }
    busy = true;
    if (Math.random() < 0.6) {
        queueMessage('Got away safely!', () => {
            if (enemyGroup) scene.remove(enemyGroup);
            enemyGroup = null;
            trainerIndex++;
            if (trainerIndex >= TRAINERS.length) showWinScreen();
            else startNextBattle();
        });
    } else {
        queueMessage("Couldn't escape!", () => {
            state = 'enemyAttack';
            setTimeout(enemyTurn, 400);
        });
    }
}

function showWinScreen() {
    state = 'win';
    screenEl.classList.remove('hidden');
    hudEl.classList.add('hidden');
    bottomEl.classList.add('hidden');
    screenEl.innerHTML = `
        <h1>YOU WON!</h1>
        <p>You defeated all trainers including the Champion's MEWTWO!</p>
        <p>${player.name} is now a true legend!</p>
        <p style="margin-top:20px;color:#aaa;">Press ENTER to play again</p>
    `;
}

function showLoseScreen() {
    state = 'defeat';
    screenEl.classList.remove('hidden');
    hudEl.classList.add('hidden');
    bottomEl.classList.add('hidden');
    screenEl.innerHTML = `
        <h1>YOU LOST...</h1>
        <p>${player.name} fainted against ${enemy.name}.</p>
        <p style="margin-top:20px;color:#aaa;">Press ENTER to try again</p>
    `;
}

function resetToPicker() {
    if (playerGroup) { scene.remove(playerGroup); playerGroup = null; }
    if (enemyGroup) { scene.remove(enemyGroup); enemyGroup = null; }
    state = 'pick'; player = null; enemy = null; trainerIndex = 0;
    messageQueue = []; currentMessage = null; busy = false;
    screenEl.innerHTML = `
        <h1>POKEMON BATTLE 3D</h1>
        <p>Choose your starter!</p>
        <div class="starters" id="starterPick"></div>
        <div id="controls">
            <p>1 / 2 / 3 / 4 - pick a move during battle</p>
            <p>R - run from wild pokemon &nbsp;|&nbsp; ENTER - skip message</p>
            <p>Drag mouse - orbit camera</p>
        </div>
    `;
    showStartScreen();
    buildStarterPicker();
}

// =========================================================
// EFFECTS
// =========================================================
function spawnEffect(who, moveType) {
    const target = who === 'player' ? enemyGroup : playerGroup;
    if (!target) return;
    const color = TYPE_HEX[moveType] || 0xffffff;
    const tx = target.position.x, ty = 1.4, tz = target.position.z;
    const count = moveType === 'electric' ? 18 : moveType === 'psychic' || moveType === 'ghost' ? 12 : 22;
    for (let i = 0; i < count; i++) {
        let geom;
        if (moveType === 'electric') geom = new THREE.CylinderGeometry(0.025, 0.025, 0.75 + Math.random() * 0.5, 6);
        else if (moveType === 'grass') geom = new THREE.ConeGeometry(0.1, 0.45, 5);
        else if (moveType === 'water') geom = new THREE.SphereGeometry(0.1 + Math.random() * 0.09, 10, 8);
        else if (moveType === 'rock' || moveType === 'normal') geom = new THREE.DodecahedronGeometry(0.14 + Math.random() * 0.12);
        else geom = new THREE.SphereGeometry(0.13 + Math.random() * 0.16, 10, 8);
        const m = mesh(geom, color, { emissive: color, emissiveIntensity: moveType === 'normal' || moveType === 'rock' ? 0.1 : 0.85, roughness: 0.42 });
        m.position.set(tx + (Math.random() - 0.5) * 0.65, ty + (Math.random() - 0.5) * 0.65, tz + (Math.random() - 0.5) * 0.65);
        m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        const v = new THREE.Vector3((Math.random() - 0.5) * 7, (Math.random() - 0.05) * 5.4, (Math.random() - 0.5) * 7);
        scene.add(m);
        effects.push({ mesh: m, vel: v, life: 0, ttl: 0.65 + Math.random() * 0.25, spin: new THREE.Vector3(Math.random() * 7, Math.random() * 7, Math.random() * 7) });
    }
    if (moveType === 'psychic' || moveType === 'ghost') {
        for (let i = 0; i < 3; i++) {
            const ring = mesh(new THREE.TorusGeometry(0.55 + i * 0.28, 0.025, 8, 48), color, {
                emissive: color,
                emissiveIntensity: 0.9,
                transparent: true,
                opacity: 0.78
            });
            ring.position.set(tx, ty + i * 0.18, tz);
            ring.rotation.x = Math.PI / 2;
            scene.add(ring);
            effects.push({ mesh: ring, vel: new THREE.Vector3(0, 0.65, 0), life: 0, ttl: 0.85, spin: new THREE.Vector3(0, 1.5, 0) });
        }
    }
}

function updateEffects(dt) {
    for (let i = effects.length - 1; i >= 0; i--) {
        const e = effects[i];
        e.life += dt;
        e.mesh.position.x += e.vel.x * dt;
        e.mesh.position.y += e.vel.y * dt;
        e.mesh.position.z += e.vel.z * dt;
        if (e.spin) {
            e.mesh.rotation.x += e.spin.x * dt;
            e.mesh.rotation.y += e.spin.y * dt;
            e.mesh.rotation.z += e.spin.z * dt;
        }
        e.vel.y -= 8 * dt;
        const k = 1 - e.life / e.ttl;
        e.mesh.scale.setScalar(Math.max(0.01, k));
        if (e.life >= e.ttl) {
            scene.remove(e.mesh);
            effects.splice(i, 1);
        }
    }
}

// =========================================================
// LOOP
// =========================================================
function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;

    if (enemyGroup) {
        const s = enemyGroup.scale.x;
        if (s < 1) enemyGroup.scale.setScalar(Math.min(1, s + dt * 4));
    }

    if (playerGroup) {
        const bob = Math.sin(t * 2.5) * 0.08;
        let lungeOffset = 0;
        if (playerAnim.lunge > 0) {
            const k = 1 - Math.abs(playerAnim.lunge - 0.5) * 2;
            lungeOffset = Math.max(0, k) * 1.5;
            playerAnim.lunge = Math.max(0, playerAnim.lunge - dt * 2);
        }
        playerGroup.position.y = 0.2 + bob;
        playerGroup.position.x = playerAnim.baseX + lungeOffset * 0.7;
        playerGroup.position.z = playerAnim.baseZ - lungeOffset * 0.5;
        if (playerAnim.hurt > 0) {
            playerGroup.position.x += (Math.random() - 0.5) * 0.25;
            playerGroup.position.z += (Math.random() - 0.5) * 0.25;
            playerAnim.hurt = Math.max(0, playerAnim.hurt - dt * 2);
        }
        if (playerGroup.userData.flame) {
            playerGroup.userData.flame.scale.y = 1 + Math.sin(t * 18) * 0.15;
        }
    }
    if (enemyGroup) {
        const bob = Math.sin(t * 2.5 + 1.3) * 0.08;
        let lungeOffset = 0;
        if (enemyAnim.lunge > 0) {
            const k = 1 - Math.abs(enemyAnim.lunge - 0.5) * 2;
            lungeOffset = Math.max(0, k) * 1.5;
            enemyAnim.lunge = Math.max(0, enemyAnim.lunge - dt * 2);
        }
        enemyGroup.position.y = 0.2 + bob;
        enemyGroup.position.x = enemyAnim.baseX - lungeOffset * 0.7;
        enemyGroup.position.z = enemyAnim.baseZ + lungeOffset * 0.5;
        if (enemyAnim.hurt > 0) {
            enemyGroup.position.x += (Math.random() - 0.5) * 0.25;
            enemyGroup.position.z += (Math.random() - 0.5) * 0.25;
            enemyAnim.hurt = Math.max(0, enemyAnim.hurt - dt * 2);
        }
        if (enemyGroup.userData.flame) {
            enemyGroup.userData.flame.scale.y = 1 + Math.sin(t * 18) * 0.15;
        }
    }

    if (currentMessage && messageTimer > 0) {
        messageTimer--;
        if (messageTimer === 0) {
            const after = currentMessage.after;
            currentMessage = null;
            if (messageQueue.length > 0) advanceMessage();
            else { busy = false; }
            if (after) after();
        }
    } else if (!currentMessage && messageQueue.length > 0) {
        advanceMessage();
    }

    updateEffects(dt);
    renderer.render(scene, camera);
}

// =========================================================
// INPUT
// =========================================================
window.addEventListener('keydown', (e) => {
    if (state === 'pick') return;
    if (state === 'win' || state === 'defeat') {
        if (e.key === 'Enter') resetToPicker();
        return;
    }
    if (e.key === 'Enter' && currentMessage) {
        messageTimer = 1;
        return;
    }
    if (state === 'choose' && !busy) {
        if (e.key === '1') playerUseMove(0);
        else if (e.key === '2') playerUseMove(1);
        else if (e.key === '3') playerUseMove(2);
        else if (e.key === '4') playerUseMove(3);
        else if (e.key.toLowerCase() === 'r') tryRun();
    }
});

// =========================================================
// BOOT
// =========================================================
initThree();
buildStarterPicker();
animate();

