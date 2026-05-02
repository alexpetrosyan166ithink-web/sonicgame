(async () => {
    const $ = (id) => document.getElementById(id);
    const canvas = $('scene');
    const unsupported = $('unsupported');
    const modeLabel = $('modeLabel');
    const hpLabel = $('speedLabel');
    const scoreLabel = $('heightLabel');
    const fpsLabel = $('fpsLabel');
    const pauseBtn = $('pauseBtn');

    if (!navigator.gpu) {
        unsupported.classList.remove('hidden');
        fpsLabel.textContent = 'Unavailable';
        return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    const device = adapter && await adapter.requestDevice();
    if (!device) {
        unsupported.classList.remove('hidden');
        fpsLabel.textContent = 'Unavailable';
        return;
    }

    const context = canvas.getContext('webgpu');
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'opaque' });

    const cubeVerts = new Float32Array([
        -0.5,-0.5,0.5,0,0,1, 0.5,-0.5,0.5,0,0,1, 0.5,0.5,0.5,0,0,1, -0.5,-0.5,0.5,0,0,1, 0.5,0.5,0.5,0,0,1, -0.5,0.5,0.5,0,0,1,
        -0.5,-0.5,-0.5,0,0,-1, -0.5,0.5,-0.5,0,0,-1, 0.5,0.5,-0.5,0,0,-1, -0.5,-0.5,-0.5,0,0,-1, 0.5,0.5,-0.5,0,0,-1, 0.5,-0.5,-0.5,0,0,-1,
        -0.5,0.5,-0.5,0,1,0, -0.5,0.5,0.5,0,1,0, 0.5,0.5,0.5,0,1,0, -0.5,0.5,-0.5,0,1,0, 0.5,0.5,0.5,0,1,0, 0.5,0.5,-0.5,0,1,0,
        -0.5,-0.5,-0.5,0,-1,0, 0.5,-0.5,-0.5,0,-1,0, 0.5,-0.5,0.5,0,-1,0, -0.5,-0.5,-0.5,0,-1,0, 0.5,-0.5,0.5,0,-1,0, -0.5,-0.5,0.5,0,-1,0,
        0.5,-0.5,-0.5,1,0,0, 0.5,0.5,-0.5,1,0,0, 0.5,0.5,0.5,1,0,0, 0.5,-0.5,-0.5,1,0,0, 0.5,0.5,0.5,1,0,0, 0.5,-0.5,0.5,1,0,0,
        -0.5,-0.5,-0.5,-1,0,0, -0.5,-0.5,0.5,-1,0,0, -0.5,0.5,0.5,-1,0,0, -0.5,-0.5,-0.5,-1,0,0, -0.5,0.5,0.5,-1,0,0, -0.5,0.5,-0.5,-1,0,0
    ]);
    const cubeBuffer = device.createBuffer({ size: cubeVerts.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(cubeBuffer, 0, cubeVerts);

    const maxInstances = 1400;
    const instanceBuffer = device.createBuffer({ size: maxInstances * 48, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    const uniformBuffer = device.createBuffer({ size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    const shader = device.createShaderModule({ code: `
struct U { vp: mat4x4<f32>, cam: vec4<f32>, light: vec4<f32> }
@group(0) @binding(0) var<uniform> u: U;
struct O { @builtin(position) pos: vec4<f32>, @location(0) wp: vec3<f32>, @location(1) n: vec3<f32>, @location(2) c: vec3<f32>, @location(3) t: f32, @location(4) g: f32 }
@vertex fn vs(@location(0) p: vec3<f32>, @location(1) n: vec3<f32>, @location(2) ip: vec3<f32>, @location(3) is: vec3<f32>, @location(4) ic: vec3<f32>, @location(5) im: vec3<f32>) -> O {
 var o: O; let w = p * is + ip; o.pos = u.vp * vec4<f32>(w, 1); o.wp = w; o.n = normalize(n / max(is, vec3<f32>(0.001))); o.c = ic; o.t = im.x; o.g = im.y; return o;
}
fn h(p: vec2<f32>) -> f32 { return fract(sin(dot(p, vec2<f32>(127.1,311.7))) * 43758.5453); }
@fragment fn fs(i: O) -> @location(0) vec4<f32> {
 let l = max(dot(normalize(i.n), normalize(-u.light.xyz)), 0.0);
 let v = normalize(u.cam.xyz - i.wp);
 let f = pow(1.0 - max(dot(normalize(i.n), v), 0.0), 2.0);
 var b = i.c; var e = vec3<f32>(0.0);
 if (i.t < 0.5) {
  if (abs(i.n.y) < 0.2) {
   let lit = step(0.57, h(floor(vec2<f32>(i.wp.x * 2.3 + i.wp.z * 0.8, i.wp.y * 1.6))));
   e = vec3<f32>(1.0, 0.84, 0.5) * lit * i.g;
  }
 } else if (i.t < 1.5) {
  e = vec3<f32>(1.0, 0.25, 0.2) * i.g;
 } else if (i.t < 2.5) {
  e = vec3<f32>(0.95, 0.85, 0.55) * step(abs(fract(i.wp.z * 0.1) - 0.5), 0.045) * 0.5;
 } else if (i.t < 3.5) {
  e = vec3<f32>(0.12, 0.5, 0.9) * f * 0.45;
 } else if (i.t < 4.5) {
  b = mix(b, vec3<f32>(0.08, 0.28, 0.52), 0.45);
 } else {
  e = i.c * i.g;
 }
 let s = pow(max(dot(reflect(normalize(u.light.xyz), normalize(i.n)), v), 0.0), 24.0) * 0.15;
 return vec4<f32>(b * (0.3 + l * 0.9) + e + f * 0.06 + s, 1.0);
}` });

    const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: shader,
            entryPoint: 'vs',
            buffers: [
                { arrayStride: 24, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x3' }] },
                { arrayStride: 48, stepMode: 'instance', attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x3' }, { shaderLocation: 3, offset: 12, format: 'float32x3' }, { shaderLocation: 4, offset: 24, format: 'float32x3' }, { shaderLocation: 5, offset: 36, format: 'float32x3' }] }
            ]
        },
        fragment: { module: shader, entryPoint: 'fs', targets: [{ format }] },
        primitive: { topology: 'triangle-list', cullMode: 'back' },
        depthStencil: { depthWriteEnabled: true, depthCompare: 'less', format: 'depth24plus' }
    });

    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
    });

    const math3d = {
        perspective(o, f, a, n, fa) {
            const t = 1 / Math.tan(f / 2);
            o.set([t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, fa / (n - fa), -1, 0, 0, (n * fa) / (n - fa), 0]);
        },
        lookAt(o, e, c, up) {
            let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2];
            let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
            let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
            l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
            const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
            o.set([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]);
        },
        mul(o, a, b) {
            for (let c = 0; c < 4; c++) {
                for (let r = 0; r < 4; r++) {
                    o[c * 4 + r] = a[r] * b[c * 4] + a[r + 4] * b[c * 4 + 1] + a[r + 8] * b[c * 4 + 2] + a[r + 12] * b[c * 4 + 3];
                }
            }
        }
    };

    const lanes = [-3.6, 0, 3.6];
    const state = {
        lane: 1,
        x: 0,
        z: 0,
        speed: 11,
        hp: 100,
        score: 0,
        wave: 1,
        paused: false,
        jumpY: 0,
        jumpV: 0,
        shootCd: 0,
        spawnTimer: 0
    };

    const keys = Object.create(null);
    const zombies = [];
    const obstacles = [];
    const bullets = [];
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    function updateHud() {
        modeLabel.textContent = String(state.wave);
        hpLabel.textContent = String(Math.max(0, Math.round(state.hp)));
        scoreLabel.textContent = String(Math.floor(state.score));
        pauseBtn.textContent = state.paused ? 'Resume' : 'Pause';
    }

    function spawnZombie(extraZ = 72) {
        zombies.push({ lane: Math.floor(Math.random() * 3), z: state.z + extraZ + Math.random() * 28, hp: 2 + Math.floor(state.wave * 0.5), bob: Math.random() * Math.PI * 2 });
    }

    function spawnObstacle(extraZ = 50) {
        const typeRoll = Math.random();
        obstacles.push({ lane: Math.floor(Math.random() * 3), z: state.z + extraZ + Math.random() * 22, type: typeRoll < 0.45 ? 'barrier' : typeRoll < 0.8 ? 'crate' : 'gap' });
    }

    for (let i = 0; i < 6; i++) spawnZombie(36 + i * 18);
    for (let i = 0; i < 8; i++) spawnObstacle(24 + i * 14);

    function jump() {
        if (state.jumpY <= 0.01) state.jumpV = 9.5;
    }

    function shoot() {
        if (state.shootCd > 0 || state.paused || state.hp <= 0) return;
        bullets.push({ x: state.x, z: state.z + 4.5, life: 0.9 });
        state.shootCd = 0.22;
    }

    $('slowerBtn').addEventListener('click', () => { state.lane = clamp(state.lane - 1, 0, 2); });
    $('fasterBtn').addEventListener('click', () => { state.lane = clamp(state.lane + 1, 0, 2); });
    $('lowerBtn').addEventListener('click', jump);
    $('higherBtn').addEventListener('click', shoot);
    pauseBtn.addEventListener('click', () => { state.paused = !state.paused; updateHud(); });
    canvas.addEventListener('pointerdown', shoot);

    addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Space') {
            e.preventDefault();
            jump();
        }
        if (e.code === 'Enter' || e.code === 'KeyJ') shoot();
        if (e.code === 'KeyP') {
            state.paused = !state.paused;
            updateHud();
        }
    });
    addEventListener('keyup', (e) => { keys[e.code] = false; });

    let depthTexture;
    function resize() {
        const dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.25 : 1.8);
        const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
        const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        if (canvas.width === width && canvas.height === height) return;
        canvas.width = width;
        canvas.height = height;
        depthTexture = device.createTexture({ size: [width, height], format: 'depth24plus', usage: GPUTextureUsage.RENDER_ATTACHMENT });
    }
    addEventListener('resize', resize);
    resize();
    updateHud();

    function updateGame(dt) {
        if (state.paused || state.hp <= 0) return;

        if (keys.ArrowLeft || keys.KeyA) { state.lane = clamp(state.lane - 1, 0, 2); keys.ArrowLeft = keys.KeyA = false; }
        if (keys.ArrowRight || keys.KeyD) { state.lane = clamp(state.lane + 1, 0, 2); keys.ArrowRight = keys.KeyD = false; }
        if (keys.ArrowUp || keys.KeyW) state.speed = clamp(state.speed + dt * 4, 9, 17);
        else state.speed = clamp(state.speed - dt * 1.5, 9, 17);

        state.x += (lanes[state.lane] - state.x) * Math.min(1, dt * 10);
        state.z += state.speed * dt;
        state.score += dt * 14 + state.speed * 0.12;
        state.wave = 1 + Math.floor(state.score / 180);
        state.shootCd = Math.max(0, state.shootCd - dt);

        state.jumpV -= 24 * dt;
        state.jumpY = Math.max(0, state.jumpY + state.jumpV * dt);
        if (state.jumpY === 0) state.jumpV = 0;

        state.spawnTimer += dt;
        if (state.spawnTimer > Math.max(0.55, 1.5 - state.wave * 0.08)) {
            state.spawnTimer = 0;
            if (Math.random() < 0.58) spawnZombie();
            else spawnObstacle();
        }

        for (const bullet of bullets) {
            bullet.z += 42 * dt;
            bullet.life -= dt;
        }
        for (const zombie of zombies) {
            zombie.z -= (4.5 + state.wave * 0.18) * dt;
            zombie.bob += dt * 5;
            if (Math.abs(lanes[zombie.lane] - state.x) < 1.1 && zombie.z < state.z + 2.2) state.hp -= 18 * dt;
        }

        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            let hit = false;
            for (let j = zombies.length - 1; j >= 0; j--) {
                const zombie = zombies[j];
                if (Math.abs(bullet.z - zombie.z) < 1.8 && Math.abs(bullet.x - lanes[zombie.lane]) < 1.6) {
                    zombie.hp -= 1;
                    bullets.splice(i, 1);
                    hit = true;
                    if (zombie.hp <= 0) {
                        zombies.splice(j, 1);
                        state.score += 25;
                    }
                    break;
                }
            }
            if (!hit && bullet.life <= 0) bullets.splice(i, 1);
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obstacle = obstacles[i];
            if (obstacle.z < state.z - 12) {
                obstacles.splice(i, 1);
                continue;
            }
            const closeLane = Math.abs(lanes[obstacle.lane] - state.x) < 1.25;
            const closeZ = Math.abs(obstacle.z - state.z) < 1.6;
            if (closeLane && closeZ) {
                if (obstacle.type === 'gap') {
                    if (state.jumpY < 1.3) state.hp -= 40 * dt;
                } else if (state.jumpY < 1.0) {
                    state.hp -= 30 * dt;
                    state.speed = 8.5;
                }
            }
        }

        for (let i = zombies.length - 1; i >= 0; i--) if (zombies[i].z < state.z - 8) zombies.splice(i, 1);
        if (state.hp <= 0) {
            state.hp = 0;
            fpsLabel.textContent = 'Game Over';
        }
        updateHud();
    }

    function buildInstances() {
        const out = [];
        const push = (x, y, z, sx, sy, sz, r, g, b, type, glow) => out.push(x, y, z, sx, sy, sz, r, g, b, type, glow, 0);

        push(0, -0.65, state.z + 35, 38, 0.5, 150, 0.05, 0.08, 0.11, 4, 0);
        push(0, -0.52, state.z + 35, 10, 0.08, 150, 0.11, 0.12, 0.14, 2, 0.2);
        push(-3.2, -0.5, state.z + 35, 0.18, 0.05, 150, 0.95, 0.82, 0.55, 2, 0.7);
        push(3.2, -0.5, state.z + 35, 0.18, 0.05, 150, 0.95, 0.82, 0.55, 2, 0.7);
        push(-14, -0.64, state.z + 35, 14, 0.35, 150, 0.06, 0.12, 0.18, 4, 0);
        push(14, -0.64, state.z + 35, 14, 0.35, 150, 0.06, 0.12, 0.18, 4, 0);

        const zoneStart = Math.floor((state.z - 10) / 12) * 12;
        for (let zi = 0; zi < 14; zi++) {
            const z = zoneStart + zi * 12;
            for (const side of [-1, 1]) {
                for (let row = 0; row < 2; row++) {
                    const x = side * (9 + row * 4.5);
                    const h = 5 + ((zi + row + (side > 0 ? 1 : 0)) % 5) * 2.5;
                    push(x, h * 0.5 - 0.5, z, 3.2, h, 5.5, 0.18, 0.28 + row * 0.1, 0.4 + zi % 3 * 0.06, 0, 0.85);
                    if ((zi + row) % 2 === 0) push(x, h + 0.7, z, 0.7, 1.4, 0.7, 0.8, 0.92, 1.0, 5, 1.0);
                }
            }
        }

        push(state.x, state.jumpY + 0.75, state.z, 1.1, 1.5, 1.1, 0.25, 0.7, 0.98, 3, 0);
        push(state.x, state.jumpY + 1.95, state.z, 0.85, 0.95, 0.8, 0.98, 0.86, 0.48, 3, 0);
        push(state.x, state.jumpY + 2.75, state.z - 0.2, 0.45, 0.45, 0.45, 0.95, 0.74, 0.34, 1, 0.4);

        for (const zombie of zombies) {
            const x = lanes[zombie.lane];
            const bob = Math.sin(zombie.bob) * 0.08;
            push(x, 0.8 + bob, zombie.z, 1.0, 1.6, 1.0, 0.2, 0.8, 0.24, 3, 0);
            push(x, 2.0 + bob, zombie.z, 0.8, 0.9, 0.8, 0.48, 0.95, 0.44, 1, 0.45);
            push(x - 0.3, 2.1 + bob, zombie.z + 0.42, 0.18, 0.18, 0.18, 1.0, 0.12, 0.12, 1, 0.5);
            push(x + 0.3, 2.1 + bob, zombie.z + 0.42, 0.18, 0.18, 0.18, 1.0, 0.12, 0.12, 1, 0.5);
        }

        for (const obstacle of obstacles) {
            const x = lanes[obstacle.lane];
            if (obstacle.type === 'barrier') push(x, 0.7, obstacle.z, 2.2, 1.4, 1.2, 0.92, 0.42, 0.18, 1, 0.18);
            else if (obstacle.type === 'crate') push(x, 0.65, obstacle.z, 1.5, 1.3, 1.5, 0.52, 0.34, 0.2, 3, 0);
            else {
                push(x, -0.66, obstacle.z, 2.6, 0.18, 2.2, 0.01, 0.02, 0.03, 4, 0);
                push(x, -0.52, obstacle.z, 2.2, 0.04, 2.0, 0.98, 0.18, 0.18, 1, 0.28);
            }
        }

        for (const bullet of bullets) push(bullet.x, 1.8, bullet.z, 0.14, 0.14, 0.8, 1.0, 0.95, 0.4, 5, 1.2);
        return new Float32Array(out);
    }

    let lastTime = performance.now();
    let fpsAccum = 0;
    let fpsFrames = 0;
    const proj = new Float32Array(16);
    const view = new Float32Array(16);
    const vp = new Float32Array(16);
    const uniforms = new Float32Array(24);

    function frame(now) {
        resize();
        const dt = Math.min(0.033, (now - lastTime) / 1000);
        lastTime = now;
        updateGame(dt);

        const eye = [state.x * 0.35, 6.5 + state.jumpY * 0.25, state.z - 10];
        const target = [state.x * 0.6, 1.9 + state.jumpY * 0.18, state.z + 12];
        math3d.perspective(proj, Math.PI / 3.2, canvas.width / canvas.height, 0.1, 220);
        math3d.lookAt(view, eye, target, [0, 1, 0]);
        math3d.mul(vp, proj, view);
        uniforms.set(vp, 0);
        uniforms.set([eye[0], eye[1], eye[2], 1], 16);
        uniforms.set([0.35, 0.95, 0.25, 0], 20);
        device.queue.writeBuffer(uniformBuffer, 0, uniforms);

        const instances = buildInstances();
        device.queue.writeBuffer(instanceBuffer, 0, instances);

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
            colorAttachments: [{ view: context.getCurrentTexture().createView(), clearValue: { r: 0.04, g: 0.08, b: 0.14, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
            depthStencilAttachment: { view: depthTexture.createView(), depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store' }
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.setVertexBuffer(0, cubeBuffer);
        pass.setVertexBuffer(1, instanceBuffer);
        pass.draw(36, instances.length / 12);
        pass.end();
        device.queue.submit([encoder.finish()]);

        fpsAccum += dt;
        fpsFrames += 1;
        if (fpsAccum >= 0.5 && state.hp > 0) {
            fpsLabel.textContent = `${Math.round(fpsFrames / fpsAccum)} FPS`;
            fpsAccum = 0;
            fpsFrames = 0;
        }
        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
})();
