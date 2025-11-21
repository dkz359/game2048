document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.querySelector('.grid-container');
    const tileContainer = document.querySelector('.tile-container');
    const scoreElement = document.getElementById('score');
    const bestScoreElement = document.getElementById('best-score');
    const messageContainer = document.querySelector('.game-message');
    const messageText = messageContainer.querySelector('p');
    const retryButton = document.querySelector('.retry-button');
    const keepPlayingButton = document.querySelector('.keep-playing-button');
    const newGameButton = document.getElementById('new-game-btn');
    const undoButton = document.getElementById('undo-btn');
    const soundToggleButton = document.getElementById('sound-toggle-btn');
    const themeToggleButton = document.getElementById('theme-toggle-btn');

    // Safe LocalStorage helper
    const safeStorage = {
        getItem(key) {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                console.warn('LocalStorage access denied', e);
                return null;
            }
        },
        setItem(key, value) {
            try {
                localStorage.setItem(key, value);
            } catch (e) {
                console.warn('LocalStorage access denied', e);
            }
        }
    };

    let grid = [];
    let score = 0;
    let bestScore = safeStorage.getItem('bestScore') || 0;
    let won = false;
    let keepPlaying = false;
    let gameHistory = [];

    const gridSize = 4;

    // Sound Manager
    const SoundManager = {
        ctx: null,
        muted: false,

        init() {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this.ctx = new AudioContext();
                }
            } catch (e) {
                console.warn('Web Audio API not supported', e);
            }

            // Load mute state
            this.muted = safeStorage.getItem('soundMuted') === 'true';
            this.updateButton();
        },

        toggleMute() {
            this.muted = !this.muted;
            safeStorage.setItem('soundMuted', this.muted);
            this.updateButton();

            // Resume context if suspended (browser policy)
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        },

        updateButton() {
            if (this.muted) {
                soundToggleButton.textContent = '🔇';
                soundToggleButton.classList.add('muted');
            } else {
                soundToggleButton.textContent = '🔊';
                soundToggleButton.classList.remove('muted');
            }
        },

        playTone(freq, type, duration, startTime = 0) {
            if (this.muted || !this.ctx) return;

            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = type;
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

                gain.gain.setValueAtTime(0.1, this.ctx.currentTime + startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(this.ctx.currentTime + startTime);
                osc.stop(this.ctx.currentTime + startTime + duration);
            } catch (e) {
                console.warn('Audio playback failed', e);
            }
        },

        playMove() {
            // Low pop sound
            this.playTone(150, 'triangle', 0.1);
        },

        playMerge() {
            // Higher chime
            this.playTone(400, 'sine', 0.15);
            this.playTone(600, 'sine', 0.15, 0.05);
        },

        playWin() {
            // Fanfare
            this.playTone(523.25, 'square', 0.2, 0); // C5
            this.playTone(659.25, 'square', 0.2, 0.2); // E5
            this.playTone(783.99, 'square', 0.4, 0.4); // G5
        },

        playGameOver() {
            // Sad descent
            this.playTone(400, 'sawtooth', 0.3, 0);
            this.playTone(300, 'sawtooth', 0.3, 0.3);
            this.playTone(200, 'sawtooth', 0.5, 0.6);
        }
    };

    SoundManager.init();
    if (soundToggleButton) {
        soundToggleButton.addEventListener('click', () => SoundManager.toggleMute());
    }

    // Dark Mode
    let isDarkMode = safeStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        themeToggleButton.textContent = '☀️';
    }

    themeToggleButton.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        document.body.classList.toggle('dark-mode', isDarkMode);
        themeToggleButton.textContent = isDarkMode ? '☀️' : '🌙';
        safeStorage.setItem('darkMode', isDarkMode);
    });

    bestScoreElement.textContent = bestScore;

    function saveState() {
        if (gameHistory.length > 10) gameHistory.shift(); // Limit history
        gameHistory.push({
            grid: JSON.parse(JSON.stringify(grid)), // Deep copy
            score: score,
            won: won,
            keepPlaying: keepPlaying
        });
        undoButton.disabled = false;
    }

    function undo() {
        if (gameHistory.length === 0) return;

        const previousState = gameHistory.pop();
        grid = previousState.grid;
        score = previousState.score;
        won = previousState.won;
        keepPlaying = previousState.keepPlaying;

        scoreElement.textContent = score;

        // Re-render grid
        clearTiles();
        grid.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell) {
                    // Re-create tile element
                    const tile = document.createElement('div');
                    tile.classList.add('tile', `tile-${cell.value}`);
                    if (cell.merged) tile.classList.add('tile-merged');
                    tile.textContent = cell.value;
                    setTilePosition(tile, r, c);
                    tileContainer.appendChild(tile);
                    cell.element = tile; // Update reference
                }
            });
        });

        if (gameHistory.length === 0) {
            undoButton.disabled = true;
        }

        // Hide messages if we undid a game over/win
        if (!won && !gameHistory.some(s => s.won)) {
            messageContainer.style.display = 'none';
            messageContainer.classList.remove('game-won', 'game-over');
        }
    }

    function initGame() {
        grid = Array(gridSize).fill().map(() => Array(gridSize).fill(null));
        score = 0;
        won = false;
        keepPlaying = false;
        gameHistory = [];
        undoButton.disabled = true;
        updateScore(0);
        clearTiles();
        messageContainer.style.display = 'none';
        messageContainer.classList.remove('game-won', 'game-over');

        addRandomTile();
        addRandomTile();
    }

    function clearTiles() {
        tileContainer.innerHTML = '';
    }

    function addRandomTile() {
        const emptyCells = [];
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (!grid[r][c]) {
                    emptyCells.push({ r, c });
                }
            }
        }

        if (emptyCells.length > 0) {
            const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const value = Math.random() < 0.9 ? 2 : 4;
            createTile(r, c, value);
        }
    }

    function createTile(r, c, value) {
        const tile = document.createElement('div');
        tile.classList.add('tile', `tile-${value}`, 'tile-new');
        tile.textContent = value;
        setTilePosition(tile, r, c);
        tileContainer.appendChild(tile);
        grid[r][c] = { value, element: tile, merged: false };
        return tile;
    }

    function setTilePosition(tile, r, c) {
        // Calculate position based on grid layout
        // We need to find the correct cell. Since grid-container has rows, we need to query all cells.
        const cells = gridContainer.querySelectorAll('.grid-cell');
        const cell = cells[r * 4 + c];

        if (!cell) return; // Safety check

        // Let's be safer and use getBoundingClientRect.
        const gridRect = gridContainer.getBoundingClientRect();
        const cellRect = cell.getBoundingClientRect();

        const left = cellRect.left - gridRect.left;
        const top = cellRect.top - gridRect.top;

        tile.style.left = `${left}px`;
        tile.style.top = `${top}px`;
    }

    function updateScore(add) {
        score += add;
        scoreElement.textContent = score;
        if (score > bestScore) {
            bestScore = score;
            bestScoreElement.textContent = bestScore;
            safeStorage.setItem('bestScore', bestScore);
        }
    }

    function move(direction) {
        if (won && !keepPlaying) return;
        if (messageContainer.style.display === 'flex' && !keepPlaying) return;

        // Resume audio context on first interaction if needed
        if (SoundManager.ctx && SoundManager.ctx.state === 'suspended') {
            SoundManager.ctx.resume();
        }

        let moved = false;
        let merged = false;
        const vector = getVector(direction);
        const traversals = buildTraversals(vector);

        // Save state before moving (if move is valid)
        // We can't know if it's valid until we try, but we can check if anything changed.
        // Actually, let's save state first, and if nothing moved, we pop it back? 
        // Or better: calculate move, if moved, THEN save state (of the BEFORE move).
        // So we need to capture state at the start of move() but only commit it if moved=true.

        const stateBeforeMove = {
            grid: JSON.parse(JSON.stringify(grid)),
            score: score,
            won: won,
            keepPlaying: keepPlaying
        };

        // Reset merged status
        grid.forEach(row => row.forEach(cell => { if (cell) cell.merged = false; }));

        traversals.x.forEach(r => {
            traversals.y.forEach(c => {
                const cell = grid[r][c];
                if (cell) {
                    const positions = findFarthestPosition(r, c, vector);
                    const next = getCell(positions.next);

                    if (next && next.value === cell.value && !next.merged) {
                        // Merge
                        const mergedValue = cell.value * 2;
                        const mergedTile = document.createElement('div');
                        mergedTile.classList.add('tile', `tile-${mergedValue}`, 'tile-merged');
                        mergedTile.textContent = mergedValue;
                        setTilePosition(mergedTile, positions.next.r, positions.next.c);

                        // Remove old tiles
                        tileContainer.removeChild(cell.element);
                        tileContainer.removeChild(next.element);

                        // Add new tile
                        tileContainer.appendChild(mergedTile);

                        // Update grid
                        grid[r][c] = null;
                        grid[positions.next.r][positions.next.c] = {
                            value: mergedValue,
                            element: mergedTile,
                            merged: true
                        };

                        updateScore(mergedValue);

                        if (mergedValue === 2048 && !won) {
                            won = true;
                            messageText.textContent = 'You Win!';
                            messageContainer.classList.add('game-won');
                            messageContainer.style.display = 'flex';
                            keepPlayingButton.style.display = 'inline-block';
                            SoundManager.playWin();
                        }
                        moved = true;
                        merged = true;
                    } else {
                        // Move
                        if (positions.farthest.r !== r || positions.farthest.c !== c) {
                            setTilePosition(cell.element, positions.farthest.r, positions.farthest.c);
                            grid[r][c] = null;
                            grid[positions.farthest.r][positions.farthest.c] = cell;
                            moved = true;
                        }
                    }
                }
            });
        });

        if (moved) {
            // Commit history
            if (gameHistory.length > 10) gameHistory.shift();
            gameHistory.push(stateBeforeMove);
            undoButton.disabled = false;

            if (merged) {
                SoundManager.playMerge();
            } else {
                SoundManager.playMove();
            }

            setTimeout(() => {
                addRandomTile();
                if (!movesAvailable()) {
                    gameOver();
                }
            }, 100); // Wait for animation
        }
    }

    function getVector(direction) {
        const map = {
            'ArrowUp': { x: -1, y: 0 },
            'ArrowRight': { x: 0, y: 1 },
            'ArrowDown': { x: 1, y: 0 },
            'ArrowLeft': { x: 0, y: -1 }
        };
        return map[direction];
    }

    function buildTraversals(vector) {
        const traversals = { x: [], y: [] };
        for (let i = 0; i < gridSize; i++) {
            traversals.x.push(i);
            traversals.y.push(i);
        }

        if (vector.x === 1) traversals.x.reverse();
        if (vector.y === 1) traversals.y.reverse();

        return traversals;
    }

    function findFarthestPosition(r, c, vector) {
        let previous;
        do {
            previous = { r, c };
            r += vector.x;
            c += vector.y;
        } while (withinBounds(r, c) && !grid[r][c]);

        return {
            farthest: previous,
            next: { r, c } // Used to check if we hit a mergeable tile
        };
    }

    function withinBounds(r, c) {
        return r >= 0 && r < gridSize && c >= 0 && c < gridSize;
    }

    function getCell(pos) {
        if (withinBounds(pos.r, pos.c)) {
            return grid[pos.r][pos.c];
        }
        return null;
    }

    function movesAvailable() {
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (!grid[r][c]) return true;

                const current = grid[r][c].value;
                const neighbors = [
                    { r: r - 1, c: c },
                    { r: r + 1, c: c },
                    { r: r, c: c - 1 },
                    { r: r, c: c + 1 }
                ];

                for (const n of neighbors) {
                    if (withinBounds(n.r, n.c)) {
                        const neighbor = grid[n.r][n.c];
                        if (neighbor && neighbor.value === current) return true;
                    }
                }
            }
        }
        return false;
    }

    function gameOver() {
        messageText.textContent = 'Game Over!';
        messageContainer.classList.add('game-over');
        messageContainer.style.display = 'flex';
        keepPlayingButton.style.display = 'none';
        SoundManager.playGameOver();
    }

    // Input handling
    document.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(e.key)) {
            e.preventDefault();
            move(e.key);
        }
    });

    retryButton.addEventListener('click', initGame);
    newGameButton.addEventListener('click', initGame);
    undoButton.addEventListener('click', undo);
    keepPlayingButton.addEventListener('click', () => {
        keepPlaying = true;
        messageContainer.style.display = 'none';
    });

    // Touch support (simple swipe)
    let touchStartX = 0;
    let touchStartY = 0;
    let mouseStartX = 0;
    let mouseStartY = 0;
    let isMouseDown = false;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        if (!e.changedTouches.length) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
    }, { passive: false });

    // Mouse support for swipe
    document.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        mouseStartX = e.clientX;
        mouseStartY = e.clientY;
    });

    document.addEventListener('mouseup', (e) => {
        if (!isMouseDown) return;
        isMouseDown = false;
        const mouseEndX = e.clientX;
        const mouseEndY = e.clientY;
        handleSwipe(mouseStartX, mouseStartY, mouseEndX, mouseEndY);
    });

    document.addEventListener('mouseleave', () => {
        isMouseDown = false;
    });

    function handleSwipe(startX, startY, endX, endY) {
        const dx = endX - startX;
        const dy = endY - startY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (Math.max(absDx, absDy) > 20) { // Swipe threshold
            if (absDx > absDy) {
                if (dx > 0) move('ArrowRight');
                else move('ArrowLeft');
            } else {
                if (dy > 0) move('ArrowDown');
                else move('ArrowUp');
            }
        } else {
            // Tap/Click handling (if swipe is too short)
            // Determine direction based on click position relative to grid center
            const gridRect = gridContainer.getBoundingClientRect();
            const centerX = gridRect.left + gridRect.width / 2;
            const centerY = gridRect.top + gridRect.height / 2;

            // Use end coordinates for tap check
            const tapX = endX;
            const tapY = endY;

            // Check if tap is inside grid
            if (tapX >= gridRect.left && tapX <= gridRect.right &&
                tapY >= gridRect.top && tapY <= gridRect.bottom) {

                const diffX = tapX - centerX;
                const diffY = tapY - centerY;

                if (Math.abs(diffX) > Math.abs(diffY)) {
                    if (diffX > 0) move('ArrowRight');
                    else move('ArrowLeft');
                } else {
                    if (diffY > 0) move('ArrowDown');
                    else move('ArrowUp');
                }
            }
        }
    }

    // Handle window resize to update tile positions
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Re-calculate positions for all existing tiles
            grid.forEach((row, r) => {
                row.forEach((cell, c) => {
                    if (cell) {
                        setTilePosition(cell.element, r, c);
                    }
                });
            });
        }, 100);
    });

    initGame();
});
