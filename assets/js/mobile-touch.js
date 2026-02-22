/**
 * Mobile Touch Controls - Shared module
 * Injects virtual D-pad and action buttons for touch devices.
 * Maps touch events to the game's keys object or calls action functions.
 *
 * Usage: Call initMobileControls(config) after the game loads.
 * config = {
 *   keys: {},               // reference to game's keys object
 *   dpad: true,             // show 4-direction D-pad
 *   leftRight: false,       // show only left/right (instead of full dpad)
 *   buttons: [              // action buttons
 *     { label: 'JUMP', key: 'Space', primary: true },
 *     { label: 'FIRE', key: 'KeyX' }
 *   ],
 *   actions: {},            // optional: { 'Space': functionRef } for event-based games
 *   swipe: false            // use swipe for direction (snake)
 * }
 */

function initMobileControls(config) {
    // Only show on touch devices
    if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return;

    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    // Determine relative path to assets
    const depth = window.location.pathname.split('/').filter(Boolean).length;
    let prefix = '';
    for (let i = 0; i < depth; i++) prefix += '../';
    link.href = prefix + 'assets/styles/mobile-controls.css';
    document.head.appendChild(link);

    const container = document.createElement('div');
    container.className = 'mobile-controls';

    // Left side: D-pad or Left/Right
    const leftSide = document.createElement('div');
    if (config.dpad) {
        leftSide.className = 'dpad';
        leftSide.innerHTML = `
            <div class="dpad-btn dpad-up" data-key="ArrowUp">▲</div>
            <div class="dpad-btn dpad-left" data-key="ArrowLeft">◄</div>
            <div class="dpad-btn dpad-center empty"></div>
            <div class="dpad-btn dpad-right" data-key="ArrowRight">►</div>
            <div class="dpad-btn dpad-down" data-key="ArrowDown">▼</div>
        `;
    } else if (config.leftRight) {
        leftSide.className = 'dpad';
        leftSide.innerHTML = `
            <div class="dpad-btn empty"></div>
            <div class="dpad-btn dpad-left" data-key="ArrowLeft">◄</div>
            <div class="dpad-btn empty"></div>
            <div class="dpad-btn dpad-right" data-key="ArrowRight">►</div>
            <div class="dpad-btn empty"></div>
        `;
    }

    // Right side: Action buttons
    const rightSide = document.createElement('div');
    rightSide.className = 'action-buttons';
    if (config.buttons) {
        config.buttons.forEach(btn => {
            const el = document.createElement('div');
            el.className = `action-btn${btn.primary ? ' primary' : ''}`;
            el.dataset.key = btn.key;
            el.textContent = btn.label;
            rightSide.appendChild(el);
        });
    }

    container.appendChild(leftSide);
    container.appendChild(rightSide);
    document.body.appendChild(container);

    // Touch handlers - map to keys object
    function handleTouch(el, isDown) {
        const key = el.dataset.key;
        if (!key) return;

        if (config.keys) {
            config.keys[key] = isDown;
        }

        // For event-based games (like Sonic)
        if (isDown && config.actions && config.actions[key]) {
            config.actions[key]();
        }

        // Visual feedback
        if (isDown) {
            el.classList.add('pressed');
        } else {
            el.classList.remove('pressed');
        }

        // Fire justPressed if the game uses it
        if (isDown && config.justPressed) {
            config.justPressed[key] = true;
        }
    }

    // Attach touch events to all buttons
    container.querySelectorAll('[data-key]').forEach(el => {
        el.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleTouch(el, true);
        }, { passive: false });

        el.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleTouch(el, false);
        }, { passive: false });

        el.addEventListener('touchcancel', (e) => {
            handleTouch(el, false);
        });
    });

    // Swipe controls for Snake
    if (config.swipe && config.onSwipe) {
        let startX, startY;
        const gameEl = document.getElementById('game-canvas') || document.getElementById('game-canvas-container');
        if (gameEl) {
            gameEl.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            }, { passive: true });

            gameEl.addEventListener('touchend', (e) => {
                if (!startX || !startY) return;
                const dx = e.changedTouches[0].clientX - startX;
                const dy = e.changedTouches[0].clientY - startY;
                const absDx = Math.abs(dx);
                const absDy = Math.abs(dy);
                if (Math.max(absDx, absDy) < 30) return; // too short
                if (absDx > absDy) {
                    config.onSwipe(dx > 0 ? 'right' : 'left');
                } else {
                    config.onSwipe(dy > 0 ? 'down' : 'up');
                }
                startX = startY = null;
            }, { passive: true });
        }
    }
}
