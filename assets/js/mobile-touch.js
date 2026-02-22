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

// Store script src at parse time (document.currentScript is only available during initial script execution)
var _mobileTouchScriptSrc = (document.currentScript && document.currentScript.src) || '';

function initMobileControls(config) {
    // Only show on touch devices
    if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return;

    // Load CSS - compute path from this script's location
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    if (_mobileTouchScriptSrc) {
        link.href = _mobileTouchScriptSrc.replace('js/mobile-touch.js', 'styles/mobile-controls.css');
    } else {
        link.href = '../../../assets/styles/mobile-controls.css';
    }
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

    // Add active class as fallback for CSS media query detection
    container.classList.add('active');

    // Add bottom padding to game container so controls don't cover gameplay
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.style.paddingBottom = '150px';
    }

    // Touch handlers - map to keys object AND dispatch keyboard events
    function handleTouch(el, isDown) {
        const key = el.dataset.key;
        if (!key) return;

        if (config.keys) {
            config.keys[key] = isDown;
        }

        // Dispatch real keyboard events so event-based games (Snake, etc.) respond
        try {
            const eventType = isDown ? 'keydown' : 'keyup';
            document.dispatchEvent(new KeyboardEvent(eventType, {
                code: key,
                key: key === 'Space' ? ' ' : key.replace('Arrow', '').replace('Key', ''),
                bubbles: true,
                cancelable: true
            }));
        } catch(e) {}

        // For event-based games (like Sonic) - call action functions directly
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

        // Also handle mouse events for testing in desktop browsers
        el.addEventListener('mousedown', (e) => {
            e.preventDefault();
            handleTouch(el, true);
        });
        el.addEventListener('mouseup', (e) => {
            e.preventDefault();
            handleTouch(el, false);
        });
        el.addEventListener('mouseleave', (e) => {
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
