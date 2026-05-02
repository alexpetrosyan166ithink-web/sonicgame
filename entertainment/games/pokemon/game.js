// Pokemon Battle 3D — Three.js
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
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0xa0c4e0, 30, 80);

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    updateCamera();

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff5d8, 1.0);
    sun.position.set(8, 16, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0xa0c0ff, 0.35);
    rim.position.set(-6, 8, -6);
    scene.add(rim);

    const grassGeo = new THREE.CircleGeometry(40, 64);
    grassGeo.rotateX(-Math.PI / 2);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x6ba03f, roughness: 0.9 });
    const ground = new THREE.Mesh(grassGeo, grassMat);
    ground.receiveShadow = true;
    scene.add(ground);

    const padGeo = new THREE.CylinderGeometry(2.2, 2.4, 0.18, 32);
    const playerPad = new THREE.Mesh(padGeo, new THREE.MeshStandardMaterial({ color: 0x4f8a2a, roughness: 0.85 }));
    playerPad.position.set(-3.5, 0.09, 2.4); playerPad.receiveShadow = true; scene.add(playerPad);
    const enemyPad = new THREE.Mesh(padGeo, new THREE.MeshStandardMaterial({ color: 0x528f30, roughness: 0.85 }));
    enemyPad.position.set(3.5, 0.09, -2.4); enemyPad.receiveShadow = true; scene.add(enemyPad);

    // distant trees
    for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * Math.PI * 2;
        const r = 16 + Math.random() * 8;
        const tx = Math.cos(angle) * r, tz = Math.sin(angle) * r;
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.22, 1.2, 6),
            new THREE.MeshStandardMaterial({ color: 0x6b4226 })
        );
        trunk.position.set(tx, 0.6, tz);
        const leaves = new THREE.Mesh(
            new THREE.SphereGeometry(0.9 + Math.random() * 0.3, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0x3d8b2e })
        );
        leaves.position.set(tx, 1.7, tz);
        scene.add(trunk); scene.add(leaves);
    }
    // clouds
    for (let i = 0; i < 8; i++) {
        const cloud = new THREE.Mesh(
            new THREE.SphereGeometry(1.5 + Math.random() * 0.8, 8, 6),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
        );
        cloud.position.set(-20 + Math.random() * 40, 10 + Math.random() * 6, -20 + Math.random() * 40);
        cloud.scale.set(2 + Math.random(), 0.8, 1.2 + Math.random() * 0.5);
        scene.add(cloud);
    }

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
        emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 0
    });
    const m = new THREE.Mesh(geom, mat);
    m.castShadow = true;
    return m;
}
function sphere(r, color, opts) { return mesh(new THREE.SphereGeometry(r, 16, 12), color, opts); }
function ellipsoid(rx, ry, rz, color, opts) { const m = sphere(1, color, opts); m.scale.set(rx, ry, rz); return m; }
function box(w, h, d, color, opts) { return mesh(new THREE.BoxGeometry(w, h, d), color, opts); }

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

    mewtwo() {
        const g = new THREE.Group();
        const body = ellipsoid(0.55, 1.0, 0.45, 0xc0c0d0); body.position.y = 1.4; g.add(body);
        const chest = ellipsoid(0.35, 0.55, 0.2, 0x9080a8); chest.position.set(0, 1.45, 0.4); g.add(chest);
        const legGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.7, 10);
        const lL = mesh(legGeo, 0xc0c0d0); lL.position.set(-0.25, 0.4, 0.05); g.add(lL);
        const lR = mesh(legGeo, 0xc0c0d0); lR.position.set(0.25, 0.4, 0.05); g.add(lR);
        const armGeo = new THREE.CylinderGeometry(0.13, 0.1, 0.7, 10);
        const aL = mesh(armGeo, 0xc0c0d0); aL.position.set(-0.7, 1.4, 0); aL.rotation.z = 0.4; g.add(aL);
        const aR = mesh(armGeo, 0xc0c0d0); aR.position.set(0.7, 1.4, 0); aR.rotation.z = -0.4; g.add(aR);
        const head = ellipsoid(0.55, 0.6, 0.55, 0xc0c0d0); head.position.set(0, 2.6, 0.05); g.add(head);
        const bulge = sphere(0.3, 0xc0c0d0); bulge.position.set(0.4, 2.55, -0.2); g.add(bulge);
        const tube = mesh(new THREE.TorusGeometry(0.4, 0.08, 8, 16, Math.PI * 0.8), 0x9080a8);
        tube.position.set(0.45, 2.15, -0.35); tube.rotation.x = Math.PI / 2; tube.rotation.z = -0.3; g.add(tube);
        const eyeGeo = new THREE.SphereGeometry(0.09, 10, 8);
        const eL = mesh(eyeGeo, 0x7050a0, { emissive: 0x7050a0, emissiveIntensity: 0.9 }); eL.position.set(-0.16, 2.65, 0.55); g.add(eL);
        const eR = mesh(eyeGeo, 0x7050a0, { emissive: 0x7050a0, emissiveIntensity: 0.9 }); eR.position.set(0.16, 2.65, 0.55); g.add(eR);
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 1.3, -0.3),
            new THREE.Vector3(0.6, 1.0, -0.9),
            new THREE.Vector3(1.2, 1.5, -0.6),
            new THREE.Vector3(1.4, 2.3, -0.2)
        ]);
        const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.1, 8, false);
        const tail = mesh(tubeGeo, 0xc0c0d0); g.add(tail);
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
    { name: 'Sleeping Giant', mons: ['snorlax'],   intro: 'A massive SNORLAX blocks your path!', wild: false },
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
    const icons = { pikachu: '⚡', charmander: '🔥', bulbasaur: '🌿', squirtle: '💧' };
    ['pikachu', 'charmander', 'bulbasaur', 'squirtle'].forEach(key => {
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
        : 'Trainer battle — you cannot run';
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
            <p>1 / 2 / 3 / 4 — pick a move during battle</p>
            <p>R — run from wild pokemon &nbsp;•&nbsp; ENTER — skip message</p>
            <p>Drag mouse — orbit camera</p>
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
    for (let i = 0; i < 14; i++) {
        const m = mesh(new THREE.SphereGeometry(0.15 + Math.random() * 0.15, 8, 6), color, { emissive: color, emissiveIntensity: 0.8 });
        m.position.set(tx + (Math.random() - 0.5) * 0.4, ty + (Math.random() - 0.5) * 0.4, tz + (Math.random() - 0.5) * 0.4);
        const v = new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.2) * 5, (Math.random() - 0.5) * 6);
        scene.add(m);
        effects.push({ mesh: m, vel: v, life: 0, ttl: 0.7 });
    }
}

function updateEffects(dt) {
    for (let i = effects.length - 1; i >= 0; i--) {
        const e = effects[i];
        e.life += dt;
        e.mesh.position.x += e.vel.x * dt;
        e.mesh.position.y += e.vel.y * dt;
        e.mesh.position.z += e.vel.z * dt;
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
