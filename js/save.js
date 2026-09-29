/* ============================================
   SAVE SYSTEM - LocalStorage based
   Handles game progress, settings, checkpoints
   ============================================ */

const SaveManager = {
    SAVE_KEY: 'blade_fallen_kingdom_save',
    SETTINGS_KEY: 'blade_fallen_kingdom_settings',

    // Default save data
    defaultSave: {
        currentChapter: 1,
        currentCheckpoint: 0,
        playerHealth: 100,
        playerMaxHealth: 100,
        unlockedChapters: [1],
        totalDeaths: 0,
        totalEnemiesDefeated: 0,
        playTime: 0,
        lastSaveTime: null,
        chapterProgress: {
            1: { completed: false, checkpoints: [] },
            2: { completed: false, checkpoints: [] },
            3: { completed: false, checkpoints: [] },
            4: { completed: false, checkpoints: [] },
            5: { completed: false, checkpoints: [] }
        }
    },

    // Default settings
    defaultSettings: {
        musicVolume: 70,
        sfxVolume: 80,
        screenShake: true,
        particles: true,
        showFPS: false,
        language: 'en'
    },

    // Current save data in memory
    currentSave: null,
    currentSettings: null,

    // Initialize save system
    init() {
        this.loadSettings();
        this.loadGame();
        console.log('[Save] System initialized');
    },

    // --- SAVE OPERATIONS ---

    // Save game progress to localStorage
    saveGame(data) {
        try {
            if (data) {
                // Merge provided data with current save
                this.currentSave = { ...this.currentSave, ...data };
            }
            this.currentSave.lastSaveTime = Date.now();
            const saveString = JSON.stringify(this.currentSave);
            localStorage.setItem(this.SAVE_KEY, saveString);
            console.log('[Save] Game saved successfully');
            return true;
        } catch (e) {
            console.warn('[Save] Failed to save game:', e);
            return false;
        }
    },

    // Load game progress from localStorage
    loadGame() {
        try {
            const saveString = localStorage.getItem(this.SAVE_KEY);
            if (saveString) {
                const parsed = JSON.parse(saveString);
                // Merge with defaults to handle version differences
                this.currentSave = this.mergeDeep(
                    JSON.parse(JSON.stringify(this.defaultSave)),
                    parsed
                );
                console.log('[Save] Game loaded, Chapter:', this.currentSave.currentChapter);
            } else {
                this.currentSave = JSON.parse(JSON.stringify(this.defaultSave));
                console.log('[Save] No save found, using defaults');
            }
        } catch (e) {
            console.warn('[Save] Failed to load game:', e);
            this.currentSave = JSON.parse(JSON.stringify(this.defaultSave));
        }
        return this.currentSave;
    },

    // Check if a save exists
    hasSave() {
        try {
            const saveString = localStorage.getItem(this.SAVE_KEY);
            if (saveString) {
                const parsed = JSON.parse(saveString);
                return parsed && parsed.lastSaveTime !== null;
            }
        } catch (e) {}
        return false;
    },

    // Delete save data
    deleteSave() {
        try {
            localStorage.removeItem(this.SAVE_KEY);
            this.currentSave = JSON.parse(JSON.stringify(this.defaultSave));
            console.log('[Save] Save data deleted');
            return true;
        } catch (e) {
            console.warn('[Save] Failed to delete save:', e);
            return false;
        }
    },

    // Start new game (reset progress)
    newGame() {
        this.currentSave = JSON.parse(JSON.stringify(this.defaultSave));
        this.saveGame();
        console.log('[Save] New game started');
        return this.currentSave;
    },

    // --- CHECKPOINT SYSTEM ---

    // Save a checkpoint within current chapter
    saveCheckpoint(checkpointId, playerData) {
        if (!this.currentSave) this.loadGame();

        this.currentSave.currentCheckpoint = checkpointId;

        if (playerData) {
            this.currentSave.playerHealth = playerData.health || this.currentSave.playerHealth;
        }

        // Track checkpoint in chapter progress
        const chapter = this.currentSave.currentChapter;
        if (this.currentSave.chapterProgress[chapter]) {
            if (!this.currentSave.chapterProgress[chapter].checkpoints.includes(checkpointId)) {
                this.currentSave.chapterProgress[chapter].checkpoints.push(checkpointId);
            }
        }

        this.saveGame();
        console.log('[Save] Checkpoint', checkpointId, 'saved in Chapter', chapter);
    },

    // Get last checkpoint for current chapter
    getLastCheckpoint() {
        if (!this.currentSave) this.loadGame();
        return {
            chapter: this.currentSave.currentChapter,
            checkpoint: this.currentSave.currentCheckpoint,
            health: this.currentSave.playerHealth
        };
    },

    // --- CHAPTER PROGRESSION ---

    // Complete current chapter and unlock next
    completeChapter(chapterNum) {
        if (!this.currentSave) this.loadGame();

        if (this.currentSave.chapterProgress[chapterNum]) {
            this.currentSave.chapterProgress[chapterNum].completed = true;
        }

        const nextChapter = chapterNum + 1;
        if (nextChapter <= 5 && !this.currentSave.unlockedChapters.includes(nextChapter)) {
            this.currentSave.unlockedChapters.push(nextChapter);
        }

        this.currentSave.currentChapter = nextChapter <= 5 ? nextChapter : chapterNum;
        this.currentSave.currentCheckpoint = 0;

        this.saveGame();
        console.log('[Save] Chapter', chapterNum, 'completed. Unlocked:', this.currentSave.unlockedChapters);
    },

    // Set current chapter
    setChapter(chapterNum) {
        if (!this.currentSave) this.loadGame();

        if (this.currentSave.unlockedChapters.includes(chapterNum)) {
            this.currentSave.currentChapter = chapterNum;
            this.currentSave.currentCheckpoint = 0;
            this.currentSave.playerHealth = this.currentSave.playerMaxHealth;
            this.saveGame();
            return true;
        }
        return false;
    },

    // Check if chapter is unlocked
    isChapterUnlocked(chapterNum) {
        if (!this.currentSave) this.loadGame();
        return this.currentSave.unlockedChapters.includes(chapterNum);
    },

    // Check if chapter is completed
    isChapterCompleted(chapterNum) {
        if (!this.currentSave) this.loadGame();
        return this.currentSave.chapterProgress[chapterNum] &&
               this.currentSave.chapterProgress[chapterNum].completed;
    },

    // --- STATS ---

    // Record a death
    recordDeath() {
        if (!this.currentSave) this.loadGame();
        this.currentSave.totalDeaths++;
        this.saveGame();
    },

    // Record enemy defeated
    recordEnemyDefeated() {
        if (!this.currentSave) this.loadGame();
        this.currentSave.totalEnemiesDefeated++;
        // Don't save on every enemy kill for performance, save at checkpoints
    },

    // Update play time
    updatePlayTime(deltaSeconds) {
        if (!this.currentSave) this.loadGame();
        this.currentSave.playTime += deltaSeconds;
    },

    // Get stats
    getStats() {
        if (!this.currentSave) this.loadGame();
        return {
            deaths: this.currentSave.totalDeaths,
            enemiesDefeated: this.currentSave.totalEnemiesDefeated,
            playTime: this.currentSave.playTime,
            chaptersCompleted: Object.values(this.currentSave.chapterProgress)
                .filter(c => c.completed).length
        };
    },

    // --- SETTINGS ---

    // Save settings
    saveSettings(settings) {
        try {
            if (settings) {
                this.currentSettings = { ...this.currentSettings, ...settings };
            }
            const settingsString = JSON.stringify(this.currentSettings);
            localStorage.setItem(this.SETTINGS_KEY, settingsString);
            console.log('[Save] Settings saved');
            return true;
        } catch (e) {
            console.warn('[Save] Failed to save settings:', e);
            return false;
        }
    },

    // Load settings
    loadSettings() {
        try {
            const settingsString = localStorage.getItem(this.SETTINGS_KEY);
            if (settingsString) {
                const parsed = JSON.parse(settingsString);
                this.currentSettings = { ...this.defaultSettings, ...parsed };
            } else {
                this.currentSettings = { ...this.defaultSettings };
            }
        } catch (e) {
            console.warn('[Save] Failed to load settings:', e);
            this.currentSettings = { ...this.defaultSettings };
        }
        return this.currentSettings;
    },

    // Get a specific setting
    getSetting(key) {
        if (!this.currentSettings) this.loadSettings();
        return this.currentSettings[key] !== undefined
            ? this.currentSettings[key]
            : this.defaultSettings[key];
    },

    // Set a specific setting
    setSetting(key, value) {
        if (!this.currentSettings) this.loadSettings();
        this.currentSettings[key] = value;
        this.saveSettings();
    },

    // --- UTILITY ---

    // Deep merge two objects
    mergeDeep(target, source) {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {};
                    this.mergeDeep(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
        return target;
    },

    // Get formatted play time string
    getFormattedPlayTime() {
        if (!this.currentSave) this.loadGame();
        const total = Math.floor(this.currentSave.playTime);
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const seconds = total % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    },

    // Export save as JSON string (for manual backup)
    exportSave() {
        if (!this.currentSave) this.loadGame();
        return JSON.stringify(this.currentSave, null, 2);
    },

    // Import save from JSON string
    importSave(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            this.currentSave = this.mergeDeep(
                JSON.parse(JSON.stringify(this.defaultSave)),
                data
            );
            this.saveGame();
            console.log('[Save] Save imported successfully');
            return true;
        } catch (e) {
            console.warn('[Save] Failed to import save:', e);
            return false;
        }
    }
};
