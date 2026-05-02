(() => {
    const $ = (id) => document.getElementById(id);
    const canvas = $('scene');
    const unsupported = $('unsupported');
    const turnLabel = $('turnLabel');
    const statusLabel = $('statusLabel');
    const modeLabel = $('modeLabel');
    const modeBtn = $('modeBtn');
    const undoBtn = $('undoBtn');
    const resetBtn = $('resetBtn');
    const cameraBtn = $('cameraBtn');
    const whiteCaptured = $('whiteCaptured');
    const blackCaptured = $('blackCaptured');
    const moveList = $('moveList');
    const promotion = $('promotion');

    const SQ = 1.5;
    const BOARD = SQ * 8;
    const WHITE = 'w';
    const BLACK = 'b';
    const PIECE_NAMES = { k: 'King', q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight', p: 'Pawn' };
    const PIECE_VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
    const FILES = 'abcdefgh';
    const initialBack = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

    let device;
    let context;
    let format;
    let pipeline;
    let meshPipeline;
    let bindGroup;
    let meshBindGroup;
    let vertexBuffer;
    let instanceBuffer;
    let uniformBuffer;
    let meshUniformBuffer;
    let depthTexture;
    let maxInstances = 5200;

    let board = createInitialBoard();
    let turn = WHITE;
    let selected = null;
    let legalMoves = [];
    let enPassant = null;
    let history = [];
    let moveLog = [];
    let captured = { w: [], b: [] };
    let pendingPromotion = null;
    let vsAI = false;
    let aiThinking = false;
    let gameOver = false;
    let fxEvents = [];
    let modelAssets = null;
    let modelStatus = 'procedural';

    const camera = {
        theta: Math.PI * 0.25,
        phi: 0.88,
        dist: 18,
        target: [0, 0.2, 0],
        eye: [0, 0, 0]
    };
    let dragging = false;
    let lastPointer = [0, 0];
    let downPointer = [0, 0];
    let lastTouchDist = 0;
    let hoverSquare = null;

    function createInitialBoard() {
        const b = Array.from({ length: 8 }, () => Array(8).fill(null));
        for (let c = 0; c < 8; c++) {
            b[0][c] = piece(BLACK, initialBack[c]);
            b[1][c] = piece(BLACK, 'p');
            b[6][c] = piece(WHITE, 'p');
            b[7][c] = piece(WHITE, initialBack[c]);
        }
        return b;
    }

    function piece(color, type) {
        return { color, type, moved: false };
    }

    function cloneBoard(src) {
        return src.map(row => row.map(p => p ? { ...p } : null));
    }

    function snapshot() {
        return {
            board: cloneBoard(board),
            turn,
            enPassant: enPassant ? { ...enPassant } : null,
            moveLog: moveLog.slice(),
            captured: { w: captured.w.slice(), b: captured.b.slice() },
            selected: selected ? { ...selected } : null,
            gameOver
        };
    }

    function restore(s) {
        board = cloneBoard(s.board);
        turn = s.turn;
        enPassant = s.enPassant ? { ...s.enPassant } : null;
        moveLog = s.moveLog.slice();
        captured = { w: s.captured.w.slice(), b: s.captured.b.slice() };
        selected = null;
        legalMoves = [];
        gameOver = s.gameOver;
        fxEvents = [];
        pendingPromotion = null;
        promotion.classList.add('hidden');
        updateHud();
    }

    function inBounds(r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    function squareName(r, c) {
        return FILES[c] + (8 - r);
    }

    function sameSquare(a, b) {
        return a && b && a.r === b.r && a.c === b.c;
    }

    function generatePseudoMoves(b, r, c, state, attacksOnly = false) {
        const p = b[r][c];
        if (!p) return [];
        const moves = [];
        const add = (tr, tc, extra = {}) => {
            if (!inBounds(tr, tc)) return false;
            const target = b[tr][tc];
            if (target && target.color === p.color) return false;
            moves.push({ from: { r, c }, to: { r: tr, c: tc }, ...extra });
            return !target;
        };
        const slide = (dirs) => {
            for (const [dr, dc] of dirs) {
                let tr = r + dr;
                let tc = c + dc;
                while (inBounds(tr, tc)) {
                    const target = b[tr][tc];
                    if (target) {
                        if (target.color !== p.color) add(tr, tc);
                        break;
                    }
                    add(tr, tc);
                    tr += dr;
                    tc += dc;
                }
            }
        };

        if (p.type === 'p') {
            const dir = p.color === WHITE ? -1 : 1;
            const start = p.color === WHITE ? 6 : 1;
            const promoteRow = p.color === WHITE ? 0 : 7;
            for (const dc of [-1, 1]) {
                const tr = r + dir;
                const tc = c + dc;
                if (!inBounds(tr, tc)) continue;
                const target = b[tr][tc];
                if (attacksOnly || (target && target.color !== p.color)) {
                    add(tr, tc, tr === promoteRow ? { promotion: 'q' } : {});
                } else if (state.enPassant && state.enPassant.r === tr && state.enPassant.c === tc) {
                    moves.push({ from: { r, c }, to: { r: tr, c: tc }, isEnPassant: true });
                }
            }
            if (!attacksOnly && inBounds(r + dir, c) && !b[r + dir][c]) {
                add(r + dir, c, r + dir === promoteRow ? { promotion: 'q' } : {});
                if (r === start && !b[r + dir * 2][c]) {
                    add(r + dir * 2, c, { isDoublePawn: true });
                }
            }
        } else if (p.type === 'n') {
            [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].forEach(([dr, dc]) => add(r + dr, c + dc));
        } else if (p.type === 'b') {
            slide([[-1, -1], [-1, 1], [1, -1], [1, 1]]);
        } else if (p.type === 'r') {
            slide([[-1, 0], [1, 0], [0, -1], [0, 1]]);
        } else if (p.type === 'q') {
            slide([[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]);
        } else if (p.type === 'k') {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr || dc) add(r + dr, c + dc);
                }
            }
            if (!attacksOnly && !p.moved && !isKingInCheck(b, p.color, state)) {
                for (const side of [-1, 1]) {
                    const rookCol = side < 0 ? 0 : 7;
                    const rook = b[r][rookCol];
                    const between = side < 0 ? [1, 2, 3] : [5, 6];
                    const kingPath = side < 0 ? [3, 2] : [5, 6];
                    if (!rook || rook.type !== 'r' || rook.color !== p.color || rook.moved) continue;
                    if (between.some(col => b[r][col])) continue;
                    if (kingPath.some(col => isSquareAttacked(b, r, col, opposite(p.color), state))) continue;
                    moves.push({ from: { r, c }, to: { r, c: side < 0 ? 2 : 6 }, isCastle: true });
                }
            }
        }
        return moves;
    }

    function generateLegalMovesFor(b, r, c, state) {
        const p = b[r][c];
        if (!p) return [];
        return generatePseudoMoves(b, r, c, state).filter(m => {
            const next = cloneBoard(b);
            const nextState = { enPassant: state.enPassant ? { ...state.enPassant } : null };
            applyMoveToBoard(next, m, nextState, m.promotion || 'q');
            return !isKingInCheck(next, p.color, nextState);
        });
    }

    function allLegalMoves(color, b = board, state = { enPassant }) {
        const moves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = b[r][c];
                if (p && p.color === color) moves.push(...generateLegalMovesFor(b, r, c, state));
            }
        }
        return moves;
    }

    function isSquareAttacked(b, r, c, byColor, state) {
        for (let sr = 0; sr < 8; sr++) {
            for (let sc = 0; sc < 8; sc++) {
                const p = b[sr][sc];
                if (!p || p.color !== byColor) continue;
                if (generatePseudoMoves(b, sr, sc, state, true).some(m => m.to.r === r && m.to.c === c)) return true;
            }
        }
        return false;
    }

    function isKingInCheck(b, color, state) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = b[r][c];
                if (p && p.color === color && p.type === 'k') {
                    return isSquareAttacked(b, r, c, opposite(color), state);
                }
            }
        }
        return true;
    }

    function opposite(color) {
        return color === WHITE ? BLACK : WHITE;
    }

    function applyMoveToBoard(b, move, state, promotionType) {
        const p = b[move.from.r][move.from.c];
        const target = b[move.to.r][move.to.c];
        let capturedPiece = target;
        b[move.from.r][move.from.c] = null;

        if (move.isEnPassant) {
            const capRow = p.color === WHITE ? move.to.r + 1 : move.to.r - 1;
            capturedPiece = b[capRow][move.to.c];
            b[capRow][move.to.c] = null;
        }

        if (move.isCastle) {
            const rookFrom = move.to.c === 6 ? 7 : 0;
            const rookTo = move.to.c === 6 ? 5 : 3;
            b[move.to.r][rookTo] = b[move.to.r][rookFrom];
            b[move.to.r][rookFrom] = null;
            b[move.to.r][rookTo].moved = true;
        }

        const placed = { ...p, moved: true };
        if (p.type === 'p' && (move.to.r === 0 || move.to.r === 7)) placed.type = promotionType || move.promotion || 'q';
        b[move.to.r][move.to.c] = placed;

        state.enPassant = null;
        if (p.type === 'p' && Math.abs(move.to.r - move.from.r) === 2) {
            state.enPassant = { r: (move.to.r + move.from.r) / 2, c: move.from.c };
        }
        return capturedPiece;
    }

    function makeMove(move, promotionType = 'q', save = true) {
        if (gameOver || aiThinking) return;
        if (save) history.push(snapshot());
        const mover = board[move.from.r][move.from.c];
        const beforeTarget = move.isEnPassant
            ? board[mover.color === WHITE ? move.to.r + 1 : move.to.r - 1][move.to.c]
            : board[move.to.r][move.to.c];
        const state = { enPassant };
        const capturedPiece = applyMoveToBoard(board, move, state, promotionType);
        enPassant = state.enPassant;
        if (capturedPiece) captured[mover.color].push(capturedPiece.type);
        fxEvents.push({
            from: { ...move.from },
            to: { ...move.to },
            capture: Boolean(capturedPiece),
            castle: Boolean(move.isCastle),
            promotion: mover.type === 'p' && (move.to.r === 0 || move.to.r === 7),
            start: performance.now() / 1000
        });
        if (fxEvents.length > 12) fxEvents.shift();
        moveLog.push(formatMove(move, mover, beforeTarget, promotionType));
        turn = opposite(turn);
        selected = null;
        legalMoves = [];
        evaluateGameState();
        updateHud();
        if (vsAI && turn === BLACK && !gameOver) {
            aiThinking = true;
            statusLabel.textContent = 'AI is thinking';
            setTimeout(playAiMove, 260);
        }
    }

    function formatMove(move, mover, target, promotionType) {
        if (move.isCastle) return move.to.c === 6 ? 'O-O' : 'O-O-O';
        const name = mover.type === 'p' ? '' : mover.type.toUpperCase();
        const captureMark = target || move.isEnPassant ? 'x' : '-';
        const promo = mover.type === 'p' && (move.to.r === 0 || move.to.r === 7) ? '=' + promotionType.toUpperCase() : '';
        return `${name}${squareName(move.from.r, move.from.c)}${captureMark}${squareName(move.to.r, move.to.c)}${promo}`;
    }

    function evaluateGameState() {
        const legal = allLegalMoves(turn);
        const check = isKingInCheck(board, turn, { enPassant });
        if (legal.length === 0 && check) {
            gameOver = true;
            statusLabel.textContent = `${turn === WHITE ? 'White' : 'Black'} checkmated`;
        } else if (legal.length === 0) {
            gameOver = true;
            statusLabel.textContent = 'Stalemate';
        } else if (check) {
            statusLabel.textContent = 'Check';
        } else {
            statusLabel.textContent = selected ? `${PIECE_NAMES[board[selected.r][selected.c].type]} selected` : 'Select a piece';
        }
    }

    function updateHud() {
        turnLabel.textContent = turn === WHITE ? 'White' : 'Black';
        modeLabel.textContent = vsAI ? 'Vs AI' : 'Two Player';
        modeBtn.textContent = vsAI ? 'Two Player' : 'Play Vs AI';
        undoBtn.disabled = history.length === 0 || aiThinking;
        whiteCaptured.textContent = captured.w.map(t => t.toUpperCase()).join(' ');
        blackCaptured.textContent = captured.b.map(t => t.toUpperCase()).join(' ');
        moveList.innerHTML = '';
        for (let i = 0; i < moveLog.length; i += 2) {
            const li = document.createElement('li');
            li.textContent = `${moveLog[i]}${moveLog[i + 1] ? '  ' + moveLog[i + 1] : ''}`;
            moveList.appendChild(li);
        }
        moveList.scrollTop = moveList.scrollHeight;
        if (!gameOver) evaluateGameState();
    }

    function selectSquare(r, c) {
        if (pendingPromotion || aiThinking || gameOver) return;
        const p = board[r][c];
        const chosen = legalMoves.find(m => m.to.r === r && m.to.c === c);
        if (selected && chosen) {
            const mover = board[selected.r][selected.c];
            if (mover.type === 'p' && (chosen.to.r === 0 || chosen.to.r === 7) && (!vsAI || mover.color === WHITE)) {
                pendingPromotion = chosen;
                promotion.classList.remove('hidden');
            } else {
                makeMove(chosen, 'q');
            }
            return;
        }
        if (p && p.color === turn && (!vsAI || turn === WHITE)) {
            selected = { r, c };
            legalMoves = generateLegalMovesFor(board, r, c, { enPassant });
            statusLabel.textContent = `${PIECE_NAMES[p.type]} selected`;
        } else {
            selected = null;
            legalMoves = [];
            evaluateGameState();
        }
    }

    function resetGame() {
        board = createInitialBoard();
        turn = WHITE;
        selected = null;
        legalMoves = [];
        enPassant = null;
        history = [];
        moveLog = [];
        captured = { w: [], b: [] };
        pendingPromotion = null;
        aiThinking = false;
        gameOver = false;
        fxEvents = [];
        promotion.classList.add('hidden');
        updateHud();
    }

    function undoMove() {
        if (history.length === 0 || aiThinking) return;
        const count = vsAI && turn === WHITE && history.length >= 2 ? 2 : 1;
        let snap = null;
        for (let i = 0; i < count; i++) snap = history.pop();
        if (snap) restore(snap);
    }

    function playAiMove() {
        const move = chooseAiMove();
        aiThinking = false;
        if (move) makeMove(move, 'q');
        else evaluateGameState();
    }

    function chooseAiMove() {
        const moves = allLegalMoves(BLACK);
        if (moves.length === 0) return null;
        let best = moves[0];
        let bestScore = -Infinity;
        for (const move of moves) {
            const b = cloneBoard(board);
            const state = { enPassant: enPassant ? { ...enPassant } : null };
            applyMoveToBoard(b, move, state, 'q');
            const score = minimax(b, WHITE, state, 2, -Infinity, Infinity);
            if (score > bestScore || (score === bestScore && Math.random() < 0.25)) {
                bestScore = score;
                best = move;
            }
        }
        return best;
    }

    function minimax(b, color, state, depth, alpha, beta) {
        const moves = allLegalMoves(color, b, state);
        const check = isKingInCheck(b, color, state);
        if (moves.length === 0) {
            if (!check) return 0;
            return color === BLACK ? -999999 - depth : 999999 + depth;
        }
        if (depth === 0) return evaluateBoard(b, BLACK);

        if (color === BLACK) {
            let best = -Infinity;
            for (const move of moves) {
                const nb = cloneBoard(b);
                const ns = { enPassant: state.enPassant ? { ...state.enPassant } : null };
                applyMoveToBoard(nb, move, ns, 'q');
                const score = minimax(nb, WHITE, ns, depth - 1, alpha, beta);
                best = Math.max(best, score);
                alpha = Math.max(alpha, score);
                if (alpha >= beta) break;
            }
            return best;
        }

        let best = Infinity;
        for (const move of moves) {
            const nb = cloneBoard(b);
            const ns = { enPassant: state.enPassant ? { ...state.enPassant } : null };
            applyMoveToBoard(nb, move, ns, 'q');
            const score = minimax(nb, BLACK, ns, depth - 1, alpha, beta);
            best = Math.min(best, score);
            beta = Math.min(beta, score);
            if (alpha >= beta) break;
        }
        return best;
    }

    function evaluateBoard(b, perspective) {
        let score = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = b[r][c];
                if (!p) continue;
                const center = 14 - (Math.abs(3.5 - r) + Math.abs(3.5 - c)) * 3;
                const advance = p.type === 'p' ? (p.color === WHITE ? 6 - r : r - 1) * 7 : 0;
                const val = PIECE_VALUE[p.type] + center + advance;
                score += p.color === perspective ? val : -val;
            }
        }
        return score;
    }

    const cubeVerts = new Float32Array([
        -0.5,-0.5,0.5,0,0,1, 0.5,-0.5,0.5,0,0,1, 0.5,0.5,0.5,0,0,1, -0.5,-0.5,0.5,0,0,1, 0.5,0.5,0.5,0,0,1, -0.5,0.5,0.5,0,0,1,
        -0.5,-0.5,-0.5,0,0,-1, -0.5,0.5,-0.5,0,0,-1, 0.5,0.5,-0.5,0,0,-1, -0.5,-0.5,-0.5,0,0,-1, 0.5,0.5,-0.5,0,0,-1, 0.5,-0.5,-0.5,0,0,-1,
        -0.5,0.5,-0.5,0,1,0, -0.5,0.5,0.5,0,1,0, 0.5,0.5,0.5,0,1,0, -0.5,0.5,-0.5,0,1,0, 0.5,0.5,0.5,0,1,0, 0.5,0.5,-0.5,0,1,0,
        -0.5,-0.5,-0.5,0,-1,0, 0.5,-0.5,-0.5,0,-1,0, 0.5,-0.5,0.5,0,-1,0, -0.5,-0.5,-0.5,0,-1,0, 0.5,-0.5,0.5,0,-1,0, -0.5,-0.5,0.5,0,-1,0,
        0.5,-0.5,-0.5,1,0,0, 0.5,0.5,-0.5,1,0,0, 0.5,0.5,0.5,1,0,0, 0.5,-0.5,-0.5,1,0,0, 0.5,0.5,0.5,1,0,0, 0.5,-0.5,0.5,1,0,0,
        -0.5,-0.5,-0.5,-1,0,0, -0.5,-0.5,0.5,-1,0,0, -0.5,0.5,0.5,-1,0,0, -0.5,-0.5,-0.5,-1,0,0, -0.5,0.5,0.5,-1,0,0, -0.5,0.5,-0.5,-1,0,0
    ]);

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

    async function initGpu() {
        if (!navigator.gpu) {
            unsupported.classList.remove('hidden');
            return false;
        }
        const adapter = await navigator.gpu.requestAdapter();
        device = adapter && await adapter.requestDevice();
        if (!device) {
            unsupported.classList.remove('hidden');
            return false;
        }
        context = canvas.getContext('webgpu');
        format = navigator.gpu.getPreferredCanvasFormat();
        context.configure({ device, format, alphaMode: 'opaque' });

        vertexBuffer = device.createBuffer({ size: cubeVerts.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
        device.queue.writeBuffer(vertexBuffer, 0, cubeVerts);
        instanceBuffer = device.createBuffer({ size: maxInstances * 48, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
        uniformBuffer = device.createBuffer({ size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        meshUniformBuffer = device.createBuffer({ size: 160, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

        const shader = device.createShaderModule({ code: `
struct U { vp: mat4x4<f32>, cam: vec4<f32>, light: vec4<f32> }
@group(0) @binding(0) var<uniform> u: U;
struct O { @builtin(position) pos: vec4<f32>, @location(0) wp: vec3<f32>, @location(1) n: vec3<f32>, @location(2) c: vec3<f32>, @location(3) flags: vec3<f32> }
@vertex fn vs(@location(0) p: vec3<f32>, @location(1) n: vec3<f32>, @location(2) ip: vec3<f32>, @location(3) is: vec3<f32>, @location(4) ic: vec3<f32>, @location(5) im: vec3<f32>) -> O {
 var o: O; let w = p * is + ip; o.pos = u.vp * vec4<f32>(w, 1); o.wp = w; o.n = normalize(n / max(is, vec3<f32>(0.001))); o.c = ic; o.flags = im; return o;
}
fn h(p: vec2<f32>) -> f32 { return fract(sin(dot(p, vec2<f32>(127.1,311.7))) * 43758.5453); }
@fragment fn fs(i: O) -> @location(0) vec4<f32> {
 let l = max(dot(normalize(i.n), normalize(-u.light.xyz)), 0.0);
 let v = normalize(u.cam.xyz - i.wp);
 let rim = pow(1.0 - max(dot(normalize(i.n), v), 0.0), 2.0);
 let sparkle = h(floor(i.wp.xz * 11.0 + vec2<f32>(i.wp.y * 3.0, i.wp.y * 3.0))) * 0.045;
 let spec = pow(max(dot(reflect(normalize(u.light.xyz), normalize(i.n)), v), 0.0), mix(18.0, 88.0, clamp(i.flags.y, 0.0, 1.0))) * (0.12 + i.flags.y * 1.45);
 let fresnel = rim * (0.08 + i.flags.y * 0.22);
 let torch = vec3<f32>(1.0, 0.45, 0.12) * max(0.0, 1.0 - distance(i.wp.xz, vec2<f32>(-6.8, -6.8)) * 0.16) * 0.45;
 let glow = i.c * i.flags.z;
 let fog = clamp((distance(u.cam.xyz, i.wp) - 11.0) / 28.0, 0.0, 1.0);
 let lit = i.c * (0.28 + l * 0.98 + sparkle) + vec3<f32>(spec) + fresnel + glow + torch;
 lit = mix(lit, vec3<f32>(0.045, 0.046, 0.058), fog * 0.34);
 return vec4<f32>(lit, max(0.18, i.flags.x));
}` });

        pipeline = device.createRenderPipeline({
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
        bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
        });
        initMeshPipeline();
        return true;
    }

    function initMeshPipeline() {
        const shader = device.createShaderModule({ code: `
struct U {
 vp: mat4x4<f32>,
 cam: vec4<f32>,
 light: vec4<f32>,
 xform: vec4<f32>,
 color: vec4<f32>,
 flags: vec4<f32>
}
@group(0) @binding(0) var<uniform> u: U;
struct O { @builtin(position) pos: vec4<f32>, @location(0) wp: vec3<f32>, @location(1) n: vec3<f32>, @location(2) c: vec4<f32>, @location(3) flags: vec4<f32> }
@vertex fn vs(@location(0) p: vec3<f32>, @location(1) n: vec3<f32>) -> O {
 var o: O;
 let w = vec3<f32>(p.x * u.xform.w + u.xform.x, p.y * u.xform.w + u.xform.y, p.z * u.xform.w + u.xform.z);
 o.pos = u.vp * vec4<f32>(w, 1.0);
 o.wp = w;
 o.n = normalize(n);
 o.c = u.color;
 o.flags = u.flags;
 return o;
}
fn h(p: vec2<f32>) -> f32 { return fract(sin(dot(p, vec2<f32>(41.7,289.3))) * 12758.5453); }
@fragment fn fs(i: O) -> @location(0) vec4<f32> {
 let l = max(dot(normalize(i.n), normalize(-u.light.xyz)), 0.0);
 let v = normalize(u.cam.xyz - i.wp);
 let rim = pow(1.0 - max(dot(normalize(i.n), v), 0.0), 2.0);
 let spec = pow(max(dot(reflect(normalize(u.light.xyz), normalize(i.n)), v), 0.0), 72.0) * i.flags.y;
 let micro = h(floor(i.wp.xz * 14.0)) * 0.035;
 let fresnel = rim * (0.14 + i.flags.y * 0.22);
 return vec4<f32>(i.c.rgb * (0.34 + l * 0.95 + micro) + vec3<f32>(spec) + fresnel + i.c.rgb * i.flags.z, i.c.a);
}` });
        meshPipeline = device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: shader,
                entryPoint: 'vs',
                buffers: [{ arrayStride: 24, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x3' }] }]
            },
            fragment: { module: shader, entryPoint: 'fs', targets: [{ format }] },
            primitive: { topology: 'triangle-list', cullMode: 'back' },
            depthStencil: { depthWriteEnabled: true, depthCompare: 'less', format: 'depth24plus' }
        });
        meshBindGroup = device.createBindGroup({
            layout: meshPipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: meshUniformBuffer } }]
        });
    }

    async function loadPieceModels() {
        modelStatus = 'loading';
        try {
            const manifestRes = await fetchWithTimeout('assets/models/manifest.json', { cache: 'no-store' }, 3500);
            if (!manifestRes.ok) throw new Error('No model manifest');
            const manifest = await manifestRes.json();
            if (manifest.enabled === false) throw new Error('Model manifest disabled');
            const pieces = manifest.pieces || {};
            const loaded = {};
            for (const type of ['p', 'r', 'n', 'b', 'q', 'k']) {
                const entry = pieces[type];
                if (!entry || !entry.src) continue;
                const src = new URL(entry.src, new URL('assets/models/manifest.json', location.href)).toString();
                try {
                    loaded[type] = await loadGlbMesh(src, entry);
                } catch (assetErr) {
                    console.info(`3D Royal Chess could not load ${type} model:`, assetErr.message);
                }
            }
            if (Object.keys(loaded).length === 0) throw new Error('No usable GLB pieces');
            modelAssets = loaded;
            modelStatus = 'glb';
        } catch (err) {
            modelAssets = null;
            modelStatus = 'procedural';
            console.info('3D Royal Chess using procedural pieces:', err.message);
        }
    }

    async function loadGlbMesh(src, config) {
        const res = await fetchWithTimeout(src, {}, 5000);
        if (!res.ok) throw new Error(`Could not load ${src}`);
        const buffer = await res.arrayBuffer();
        const parsed = parseGlb(buffer);
        const meshes = [];
        for (const mesh of parsed.json.meshes || []) {
            for (const primitive of mesh.primitives || []) {
                const posAccessor = primitive.attributes && primitive.attributes.POSITION;
                if (posAccessor === undefined) continue;
                const positions = readAccessor(parsed, posAccessor);
                const normals = primitive.attributes.NORMAL !== undefined
                    ? readAccessor(parsed, primitive.attributes.NORMAL)
                    : createFallbackNormals(positions.count);
                const packed = new Float32Array(positions.count * 6);
                for (let i = 0; i < positions.count; i++) {
                    packed.set(positions.data.subarray(i * 3, i * 3 + 3), i * 6);
                    packed.set(normals.data.subarray(i * 3, i * 3 + 3), i * 6 + 3);
                }
                const vertex = device.createBuffer({ size: packed.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
                device.queue.writeBuffer(vertex, 0, packed);
                let index = null;
                let indexCount = 0;
                let indexFormat = 'uint16';
                if (primitive.indices !== undefined) {
                    const indices = readAccessor(parsed, primitive.indices);
                    const indexArray = indices.componentType === 5125 ? new Uint32Array(indices.data) : new Uint16Array(indices.data);
                    indexFormat = indices.componentType === 5125 ? 'uint32' : 'uint16';
                    index = device.createBuffer({ size: indexArray.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
                    device.queue.writeBuffer(index, 0, indexArray);
                    indexCount = indexArray.length;
                }
                meshes.push({ vertex, index, indexCount, vertexCount: positions.count, indexFormat });
            }
        }
        if (meshes.length === 0) throw new Error(`No mesh primitives in ${src}`);
        return {
            primitives: meshes,
            scale: Number(config.scale || 1),
            yOffset: Number(config.yOffset || 0),
            colorBoost: Number(config.colorBoost || 1)
        };
    }

    async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await fetch(url, { ...options, signal: controller.signal });
        } finally {
            clearTimeout(timer);
        }
    }

    function parseGlb(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        if (view.getUint32(0, true) !== 0x46546c67) throw new Error('Not a GLB file');
        let offset = 12;
        let json = null;
        let bin = null;
        while (offset < arrayBuffer.byteLength) {
            const length = view.getUint32(offset, true);
            const type = view.getUint32(offset + 4, true);
            offset += 8;
            const chunk = arrayBuffer.slice(offset, offset + length);
            if (type === 0x4e4f534a) {
                json = JSON.parse(new TextDecoder().decode(chunk));
            } else if (type === 0x004e4942) {
                bin = chunk;
            }
            offset += length;
        }
        if (!json || !bin) throw new Error('GLB missing JSON or BIN chunk');
        return { json, bin };
    }

    function readAccessor(parsed, accessorIndex) {
        const accessor = parsed.json.accessors[accessorIndex];
        const view = parsed.json.bufferViews[accessor.bufferView];
        const componentCount = accessor.type === 'VEC3' ? 3 : accessor.type === 'VEC2' ? 2 : 1;
        const componentSize = accessor.componentType === 5126 || accessor.componentType === 5125 ? 4 : accessor.componentType === 5123 ? 2 : 1;
        const stride = view.byteStride || componentCount * componentSize;
        const byteOffset = (view.byteOffset || 0) + (accessor.byteOffset || 0);
        const dataView = new DataView(parsed.bin, byteOffset, view.byteLength - (accessor.byteOffset || 0));
        if (accessor.componentType === 5126) {
            const out = new Float32Array(accessor.count * componentCount);
            for (let i = 0; i < accessor.count; i++) {
                for (let c = 0; c < componentCount; c++) out[i * componentCount + c] = dataView.getFloat32(i * stride + c * 4, true);
            }
            normalizeAccessor(out, componentCount);
            return { data: out, count: accessor.count, componentType: accessor.componentType };
        }
        if (accessor.componentType === 5125) {
            const out = new Uint32Array(accessor.count * componentCount);
            for (let i = 0; i < accessor.count; i++) {
                for (let c = 0; c < componentCount; c++) out[i * componentCount + c] = dataView.getUint32(i * stride + c * 4, true);
            }
            return { data: out, count: accessor.count, componentType: accessor.componentType };
        }
        if (accessor.componentType === 5123) {
            const out = new Uint16Array(accessor.count * componentCount);
            for (let i = 0; i < accessor.count; i++) {
                for (let c = 0; c < componentCount; c++) out[i * componentCount + c] = dataView.getUint16(i * stride + c * 2, true);
            }
            return { data: out, count: accessor.count, componentType: accessor.componentType };
        }
        if (accessor.componentType === 5121) {
            const out = new Uint16Array(accessor.count * componentCount);
            for (let i = 0; i < accessor.count; i++) {
                for (let c = 0; c < componentCount; c++) out[i * componentCount + c] = dataView.getUint8(i * stride + c);
            }
            return { data: out, count: accessor.count, componentType: accessor.componentType };
        }
        throw new Error(`Unsupported accessor component type ${accessor.componentType}`);
    }

    function normalizeAccessor(data, componentCount) {
        if (componentCount !== 3) return;
        for (let i = 0; i < data.length; i += 3) {
            const len = Math.hypot(data[i], data[i + 1], data[i + 2]);
            if (len > 2.5) return;
        }
    }

    function createFallbackNormals(count) {
        const data = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) data.set([0, 1, 0], i * 3);
        return { data, count, componentType: 5126 };
    }

    function pushBox(out, x, y, z, sx, sy, sz, color, alpha = 1, shine = 0.15, glow = 0) {
        out.push(x, y, z, sx, sy, sz, color[0], color[1], color[2], alpha, shine, glow);
    }

    function pushColumn(out, x, y, z, radius, height, color, shine = 0.3, glow = 0) {
        const steps = 8;
        for (let i = 0; i < steps; i++) {
            const a = (i / steps) * Math.PI * 2;
            const sx = radius * (0.58 + Math.abs(Math.cos(a)) * 0.42);
            const sz = radius * (0.58 + Math.abs(Math.sin(a)) * 0.42);
            pushBox(out, x + Math.cos(a) * radius * 0.18, y, z + Math.sin(a) * radius * 0.18, sx, height, sz, color, 1, shine, glow);
        }
    }

    function pushGem(out, x, y, z, size, color, glow = 0.25) {
        pushBox(out, x, y, z, size, size, size, color, 1, 0.9, glow);
        pushBox(out, x, y + size * 0.55, z, size * 0.66, size * 0.34, size * 0.66, color, 1, 1.0, glow);
    }

    function squareCenter(r, c) {
        return [(c - 3.5) * SQ, (r - 3.5) * SQ];
    }

    function buildInstances(time) {
        const out = [];
        pushBox(out, 0, -0.74, 0, BOARD + 8, 0.12, BOARD + 8, [0.035, 0.035, 0.045], 1, 0.18, 0);
        pushBox(out, 0, -0.48, 0, BOARD + 2.6, 0.72, BOARD + 2.6, [0.09, 0.055, 0.032], 1, 0.45, 0);
        pushBox(out, 0, -0.16, 0, BOARD + 0.42, 0.16, BOARD + 0.42, [0.9, 0.63, 0.25], 1, 0.95, 0.04);
        for (const sx of [-1, 1]) {
            for (const sz of [-1, 1]) {
                const px = sx * (BOARD * 0.5 + 1.4);
                const pz = sz * (BOARD * 0.5 + 1.4);
                pushColumn(out, px, 0.18, pz, 0.28, 1.65, [0.22, 0.17, 0.13], 0.35, 0);
                pushBox(out, px, 1.18, pz, 0.34, 0.24, 0.34, [0.95, 0.55, 0.12], 1, 0.7, 0.35 + Math.sin(time * 4 + px) * 0.08);
                pushBox(out, px, 1.42 + Math.sin(time * 5 + pz) * 0.05, pz, 0.18, 0.5, 0.18, [1.0, 0.32, 0.08], 1, 0.35, 0.65);
            }
        }
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const [x, z] = squareCenter(r, c);
                const light = (r + c) % 2 === 0;
                pushBox(out, x, -0.02, z, SQ * 0.96, 0.16, SQ * 0.96, light ? [0.86, 0.76, 0.58] : [0.18, 0.13, 0.095], 1, light ? 0.62 : 0.28, 0);
                pushBox(out, x, 0.08, z, SQ * 0.88, 0.018, SQ * 0.88, light ? [1.0, 0.88, 0.66] : [0.28, 0.2, 0.14], 0.6, light ? 0.75 : 0.45, 0.015);
            }
        }
        for (const m of legalMoves) {
            const [x, z] = squareCenter(m.to.r, m.to.c);
            const cap = board[m.to.r][m.to.c] || m.isEnPassant;
            pushBox(out, x, 0.09, z, SQ * 0.82, 0.06, SQ * 0.82, cap ? [0.95, 0.24, 0.14] : [0.24, 0.8, 0.38], 0.74, 0.1, cap ? 0.25 : 0.18);
        }
        if (selected) {
            const [x, z] = squareCenter(selected.r, selected.c);
            pushBox(out, x, 0.14, z, SQ * 0.98, 0.07, SQ * 0.98, [0.95, 0.75, 0.22], 0.9, 0.2, 0.22);
        }
        if (hoverSquare && inBounds(hoverSquare.r, hoverSquare.c)) {
            const [x, z] = squareCenter(hoverSquare.r, hoverSquare.c);
            pushBox(out, x, 0.19, z, SQ * 0.92, 0.04, SQ * 0.92, [0.46, 0.75, 0.95], 0.55, 0.15, 0.14);
        }
        addMoveEffects(out, time);
        addImportedModelAdornments(out, time);
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (!p) continue;
                if (modelAssets && modelAssets[p.type]) continue;
                const [x, z] = squareCenter(r, c);
                addPiece(out, p, x, z, time, selected && selected.r === r && selected.c === c);
            }
        }
        return new Float32Array(out.slice(0, maxInstances * 12));
    }

    function addImportedModelAdornments(out, time) {
        if (!modelAssets) return;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (!p || !modelAssets[p.type]) continue;
                const [x, z] = squareCenter(r, c);
                const white = p.color === WHITE;
                const metal = white ? [1.0, 0.78, 0.22] : [0.55, 0.62, 0.75];
                const team = white ? [0.25, 0.46, 0.95] : [0.62, 0.06, 0.08];
                const glow = selected && selected.r === r && selected.c === c ? 0.18 : 0.03;
                pushBox(out, x, 0.12, z, 0.92, 0.08, 0.92, metal, 1, 0.8, glow);
                if (p.type === 'p') {
                    pushBox(out, x - 0.34, 0.82, z - 0.2, 0.13, 0.42, 0.08, metal, 1, 0.6, 0.02);
                    pushBox(out, x - 0.34, 1.08, z - 0.2, 0.38, 0.26, 0.07, team, 1, 0.45, 0.02);
                } else if (p.type === 'r') {
                    pushBox(out, x, 1.65, z, 0.92, 0.14, 0.92, metal, 1, 0.85, 0.05);
                    for (const dx of [-0.34, 0, 0.34]) pushBox(out, x + dx, 1.9, z, 0.14, 0.38, 0.62, metal, 1, 0.75, 0.03);
                    pushBox(out, x, 2.25, z, 0.12, 0.8, 0.12, metal, 1, 0.8, 0.04);
                    pushBox(out, x + 0.32, 2.45, z, 0.56, 0.32, 0.06, team, 1, 0.45, 0.05);
                } else if (p.type === 'n') {
                    pushBox(out, x, 0.96, z, 0.82, 0.16, 0.54, team, 1, 0.5, 0.04);
                    pushBox(out, x, 1.14, z - 0.18, 0.18, 0.44, 0.12, metal, 1, 0.8, 0.06);
                    pushGem(out, x, 1.42, z - 0.18, 0.18, metal, 0.22);
                } else if (p.type === 'b') {
                    pushBox(out, x - 0.36, 0.95, z, 0.12, 1.12, 0.12, metal, 1, 0.75, 0.06);
                    pushGem(out, x - 0.36, 1.62 + Math.sin(time * 3) * 0.05, z, 0.22, [0.45, 0.82, 1.0], 0.55);
                    pushBox(out, x + 0.26, 0.75, z, 0.2, 0.6, 0.08, team, 1, 0.45, 0.05);
                } else if (p.type === 'q') {
                    pushBox(out, x, 1.58, z, 0.58, 0.13, 0.58, metal, 1, 0.9, 0.08);
                    for (const dx of [-0.24, 0, 0.24]) pushGem(out, x + dx, 1.82 + Math.abs(dx) * 0.35, z, 0.15, metal, 0.28);
                    pushBox(out, x, 0.86, z + 0.36, 0.72, 0.62, 0.08, team, 1, 0.35, 0.05);
                } else if (p.type === 'k') {
                    pushBox(out, x, 1.62, z, 0.62, 0.14, 0.62, metal, 1, 0.95, 0.1);
                    pushBox(out, x, 1.9, z, 0.14, 0.5, 0.14, metal, 1, 0.95, 0.16);
                    pushBox(out, x, 2.08, z, 0.44, 0.11, 0.11, metal, 1, 0.95, 0.14);
                    pushBox(out, x, 0.9, z + 0.38, 0.74, 0.78, 0.09, team, 1, 0.35, 0.05);
                }
            }
        }
    }

    function addMoveEffects(out, time) {
        fxEvents = fxEvents.filter(fx => time - fx.start < 1.35);
        for (const fx of fxEvents) {
            const age = time - fx.start;
            const t = Math.min(1, age / 0.7);
            const [fx0, fz0] = squareCenter(fx.from.r, fx.from.c);
            const [fx1, fz1] = squareCenter(fx.to.r, fx.to.c);
            const mx = fx0 + (fx1 - fx0) * t;
            const mz = fz0 + (fz1 - fz0) * t;
            const pulse = Math.max(0, 1 - age / 1.35);
            pushBox(out, mx, 1.85 + Math.sin(t * Math.PI) * 0.8, mz, 0.24 + t * 0.5, 0.24, 0.24 + t * 0.5, [0.82, 0.9, 1.0], 0.9, 0.8, 0.35 * pulse);
            const ring = SQ * (0.5 + age * 1.1);
            pushBox(out, fx1, 0.26, fz1, ring, 0.035, 0.08, fx.capture ? [1.0, 0.2, 0.08] : [0.35, 0.75, 1.0], 0.85, 0.5, 0.35 * pulse);
            pushBox(out, fx1, 0.27, fz1, 0.08, 0.035, ring, fx.capture ? [1.0, 0.2, 0.08] : [0.35, 0.75, 1.0], 0.85, 0.5, 0.35 * pulse);
            if (fx.capture || fx.promotion) {
                for (let i = 0; i < 8; i++) {
                    const a = i * Math.PI * 0.25 + age * 1.8;
                    const d = 0.35 + age * 1.25;
                    pushGem(out, fx1 + Math.cos(a) * d, 0.75 + pulse * 0.9, fz1 + Math.sin(a) * d, 0.12 * pulse + 0.04, fx.promotion ? [1.0, 0.82, 0.22] : [1.0, 0.16, 0.08], 0.6 * pulse);
                }
            }
        }
    }

    function addPiece(out, p, x, z, time, isSelected) {
        const white = p.color === WHITE;
        const main = white ? [0.92, 0.82, 0.62] : [0.08, 0.095, 0.12];
        const cloth = white ? [0.25, 0.46, 0.9] : [0.58, 0.08, 0.08];
        const metal = white ? [1.0, 0.78, 0.28] : [0.45, 0.52, 0.62];
        const skin = white ? [0.86, 0.62, 0.42] : [0.38, 0.26, 0.2];
        const y = 0.15 + (isSelected ? Math.sin(time * 5) * 0.05 + 0.08 : 0);
        const shine = white ? 0.46 : 0.76;
        pushBox(out, x, y + 0.08, z, 1.0, 0.18, 1.0, metal, 1, shine, isSelected ? 0.08 : 0);
        if (p.type === 'p') addPawn(out, x, y, z, main, cloth, skin, shine);
        else if (p.type === 'r') addRook(out, x, y, z, main, metal, shine);
        else if (p.type === 'n') addHorse(out, x, y, z, main, skin, metal, shine);
        else if (p.type === 'b') addBishop(out, x, y, z, main, cloth, metal, shine);
        else if (p.type === 'q') addRoyal(out, x, y, z, main, cloth, skin, metal, shine, false);
        else if (p.type === 'k') addRoyal(out, x, y, z, main, cloth, skin, metal, shine, true);
    }

    function addPawn(out, x, y, z, main, cloth, skin, shine) {
        pushBox(out, x, y + 0.5, z, 0.5, 0.65, 0.42, cloth, 1, shine);
        pushBox(out, x, y + 0.98, z, 0.38, 0.34, 0.36, skin, 1, shine);
        pushBox(out, x - 0.28, y + 0.56, z, 0.16, 0.48, 0.18, main, 1, shine);
        pushBox(out, x + 0.28, y + 0.56, z, 0.16, 0.48, 0.18, main, 1, shine);
        pushBox(out, x - 0.15, y + 0.18, z, 0.16, 0.32, 0.18, main, 1, shine);
        pushBox(out, x + 0.15, y + 0.18, z, 0.16, 0.32, 0.18, main, 1, shine);
    }

    function addRook(out, x, y, z, main, metal, shine) {
        pushBox(out, x, y + 0.55, z, 0.68, 0.95, 0.68, main, 1, shine);
        pushBox(out, x, y + 1.12, z, 0.84, 0.22, 0.84, metal, 1, shine);
        for (const dx of [-0.28, 0, 0.28]) pushBox(out, x + dx, y + 1.35, z, 0.16, 0.28, 0.78, metal, 1, shine);
        for (const dz of [-0.28, 0.28]) pushBox(out, x, y + 1.35, z + dz, 0.78, 0.28, 0.16, metal, 1, shine);
    }

    function addHorse(out, x, y, z, main, skin, metal, shine) {
        pushBox(out, x, y + 0.48, z + 0.05, 0.86, 0.5, 0.42, main, 1, shine);
        pushBox(out, x - 0.28, y + 0.16, z - 0.14, 0.16, 0.42, 0.14, skin, 1, shine);
        pushBox(out, x + 0.28, y + 0.16, z - 0.14, 0.16, 0.42, 0.14, skin, 1, shine);
        pushBox(out, x - 0.28, y + 0.16, z + 0.28, 0.16, 0.42, 0.14, skin, 1, shine);
        pushBox(out, x + 0.28, y + 0.16, z + 0.28, 0.16, 0.42, 0.14, skin, 1, shine);
        pushBox(out, x, y + 0.88, z - 0.22, 0.36, 0.7, 0.32, main, 1, shine);
        pushBox(out, x, y + 1.2, z - 0.52, 0.46, 0.36, 0.58, skin, 1, shine);
        pushBox(out, x - 0.13, y + 1.47, z - 0.68, 0.12, 0.28, 0.1, metal, 1, shine);
        pushBox(out, x + 0.13, y + 1.47, z - 0.68, 0.12, 0.28, 0.1, metal, 1, shine);
        pushBox(out, x, y + 1.06, z + 0.38, 0.16, 0.46, 0.12, metal, 1, shine);
        pushBox(out, x - 0.13, y + 1.22, z - 0.78, 0.08, 0.08, 0.06, [0.02, 0.02, 0.02], 1, 0);
        pushBox(out, x + 0.13, y + 1.22, z - 0.78, 0.08, 0.08, 0.06, [0.02, 0.02, 0.02], 1, 0);
    }

    function addBishop(out, x, y, z, main, cloth, metal, shine) {
        pushBox(out, x, y + 0.45, z, 0.62, 0.72, 0.52, cloth, 1, shine);
        pushBox(out, x, y + 0.98, z, 0.46, 0.5, 0.42, main, 1, shine);
        pushBox(out, x, y + 1.32, z, 0.32, 0.28, 0.34, metal, 1, shine);
        pushBox(out, x + 0.12, y + 1.52, z, 0.12, 0.34, 0.12, metal, 1, shine);
        pushBox(out, x - 0.18, y + 0.83, z, 0.14, 0.56, 0.12, metal, 1, shine);
    }

    function addRoyal(out, x, y, z, main, cloth, skin, metal, shine, king) {
        pushBox(out, x, y + 0.48, z, 0.6, 0.76, 0.46, cloth, 1, shine);
        pushBox(out, x - 0.38, y + 0.62, z, 0.14, 0.58, 0.16, main, 1, shine);
        pushBox(out, x + 0.38, y + 0.62, z, 0.14, 0.58, 0.16, main, 1, shine);
        pushBox(out, x, y + 1.04, z, 0.42, 0.38, 0.38, skin, 1, shine);
        pushBox(out, x, y + 1.32, z, 0.52, 0.16, 0.52, metal, 1, shine);
        for (const dx of [-0.2, 0, 0.2]) pushBox(out, x + dx, y + 1.52, z, 0.12, 0.32, 0.12, metal, 1, shine);
        if (king) {
            pushBox(out, x, y + 1.82, z, 0.12, 0.42, 0.12, metal, 1, shine);
            pushBox(out, x, y + 1.98, z, 0.38, 0.1, 0.1, metal, 1, shine);
        } else {
            pushBox(out, x, y + 1.75, z, 0.22, 0.28, 0.22, metal, 1, shine);
        }
    }

    function resize() {
        const dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.2 : 1.7);
        const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
        const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        if (canvas.width === width && canvas.height === height) return;
        canvas.width = width;
        canvas.height = height;
        if (device) depthTexture = device.createTexture({ size: [width, height], format: 'depth24plus', usage: GPUTextureUsage.RENDER_ATTACHMENT });
    }

    function updateCamera() {
        camera.phi = Math.max(0.25, Math.min(1.32, camera.phi));
        camera.dist = Math.max(10, Math.min(28, camera.dist));
        const cp = Math.cos(camera.phi);
        camera.eye = [
            camera.target[0] + Math.sin(camera.theta) * cp * camera.dist,
            camera.target[1] + Math.sin(camera.phi) * camera.dist,
            camera.target[2] + Math.cos(camera.theta) * cp * camera.dist
        ];
    }

    function render(now) {
        resize();
        updateCamera();
        const time = now / 1000;
        const proj = new Float32Array(16);
        const view = new Float32Array(16);
        const vp = new Float32Array(16);
        const uniforms = new Float32Array(24);
        math3d.perspective(proj, Math.PI / 4.2, canvas.width / canvas.height, 0.1, 120);
        math3d.lookAt(view, camera.eye, camera.target, [0, 1, 0]);
        math3d.mul(vp, proj, view);
        uniforms.set(vp, 0);
        uniforms.set([camera.eye[0], camera.eye[1], camera.eye[2], 1], 16);
        uniforms.set([-0.45, -0.9, -0.22, 0], 20);
        device.queue.writeBuffer(uniformBuffer, 0, uniforms);

        const instances = buildInstances(time);
        device.queue.writeBuffer(instanceBuffer, 0, instances);

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
            colorAttachments: [{ view: context.getCurrentTexture().createView(), clearValue: { r: 0.035, g: 0.038, b: 0.048, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
            depthStencilAttachment: { view: depthTexture.createView(), depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store' }
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.setVertexBuffer(0, vertexBuffer);
        pass.setVertexBuffer(1, instanceBuffer);
        pass.draw(36, instances.length / 12);
        drawModelPieces(pass, vp);
        pass.end();
        device.queue.submit([encoder.finish()]);
        requestAnimationFrame(render);
    }

    function drawModelPieces(pass, vp) {
        if (!modelAssets) return;
        pass.setPipeline(meshPipeline);
        pass.setBindGroup(0, meshBindGroup);
        const uniforms = new Float32Array(40);
        uniforms.set(vp, 0);
        uniforms.set([camera.eye[0], camera.eye[1], camera.eye[2], 1], 16);
        uniforms.set([-0.45, -0.9, -0.22, 0], 20);
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (!p || !modelAssets[p.type]) continue;
                const asset = modelAssets[p.type];
                const [x, z] = squareCenter(r, c);
                const y = 0.16 + asset.yOffset + (selected && selected.r === r && selected.c === c ? 0.11 : 0);
                const white = p.color === WHITE;
                const color = white ? [0.92, 0.82, 0.62, 1] : [0.08, 0.095, 0.12, 1];
                const shine = white ? 0.66 : 0.92;
                uniforms.set([x, y, z, asset.scale], 24);
                uniforms.set(color, 28);
                uniforms.set([1, shine, selected && selected.r === r && selected.c === c ? 0.12 : 0.02, 0], 32);
                device.queue.writeBuffer(meshUniformBuffer, 0, uniforms);
                for (const primitive of asset.primitives) {
                    pass.setVertexBuffer(0, primitive.vertex);
                    if (primitive.index) {
                        pass.setIndexBuffer(primitive.index, primitive.indexFormat);
                        pass.drawIndexed(primitive.indexCount);
                    } else {
                        pass.draw(primitive.vertexCount);
                    }
                }
            }
        }
    }

    function pickSquare(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
        const ny = 1 - ((clientY - rect.top) / rect.height) * 2;
        const fwd = norm(sub(camera.target, camera.eye));
        const right = norm(cross(fwd, [0, 1, 0]));
        const up = norm(cross(right, fwd));
        const tan = Math.tan(Math.PI / 4.2 / 2);
        const aspect = canvas.width / canvas.height;
        const dir = norm(add(add(fwd, scale(right, nx * tan * aspect)), scale(up, ny * tan)));
        if (Math.abs(dir[1]) < 0.0001) return null;
        const t = (0.1 - camera.eye[1]) / dir[1];
        if (t < 0) return null;
        const hit = add(camera.eye, scale(dir, t));
        const c = Math.floor((hit[0] + BOARD / 2) / SQ);
        const r = Math.floor((hit[2] + BOARD / 2) / SQ);
        return inBounds(r, c) ? { r, c } : null;
    }

    function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
    function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
    function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
    function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
    function norm(a) {
        const l = Math.hypot(a[0], a[1], a[2]) || 1;
        return [a[0] / l, a[1] / l, a[2] / l];
    }

    function bindEvents() {
        canvas.addEventListener('pointerdown', e => {
            dragging = true;
            lastPointer = [e.clientX, e.clientY];
            downPointer = [e.clientX, e.clientY];
            canvas.setPointerCapture(e.pointerId);
        });
        canvas.addEventListener('pointermove', e => {
            hoverSquare = pickSquare(e.clientX, e.clientY);
            if (!dragging) return;
            const dx = e.clientX - lastPointer[0];
            const dy = e.clientY - lastPointer[1];
            if (Math.abs(dx) + Math.abs(dy) > 2) {
                camera.theta -= dx * 0.008;
                camera.phi += dy * 0.006;
            }
            lastPointer = [e.clientX, e.clientY];
        });
        canvas.addEventListener('pointerup', e => {
            const moved = Math.hypot(e.clientX - downPointer[0], e.clientY - downPointer[1]);
            const sq = pickSquare(e.clientX, e.clientY);
            dragging = false;
            if (moved < 6 && sq) selectSquare(sq.r, sq.c);
        });
        canvas.addEventListener('wheel', e => {
            e.preventDefault();
            camera.dist += e.deltaY * 0.015;
        }, { passive: false });
        canvas.addEventListener('touchmove', e => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const d = Math.hypot(dx, dy);
                if (lastTouchDist) camera.dist += (lastTouchDist - d) * 0.035;
                lastTouchDist = d;
            }
        }, { passive: true });
        canvas.addEventListener('touchend', () => { lastTouchDist = 0; }, { passive: true });

        modeBtn.addEventListener('click', () => {
            vsAI = !vsAI;
            resetGame();
        });
        undoBtn.addEventListener('click', undoMove);
        resetBtn.addEventListener('click', resetGame);
        cameraBtn.addEventListener('click', () => {
            camera.theta = Math.PI * 0.25;
            camera.phi = 0.88;
            camera.dist = 18;
        });
        promotion.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!pendingPromotion) return;
                const move = pendingPromotion;
                pendingPromotion = null;
                promotion.classList.add('hidden');
                makeMove(move, btn.dataset.promote || 'q');
            });
        });
    }

    async function boot() {
        bindEvents();
        updateHud();
        if (await initGpu()) {
            resize();
            requestAnimationFrame(render);
            loadPieceModels().catch(err => {
                modelStatus = 'procedural';
                console.info('3D Royal Chess model loading skipped:', err.message);
            });
        }
    }

    boot();
})();
