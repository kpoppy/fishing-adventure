export class GameState {
    constructor() {
        if (GameState.instance) {
            return GameState.instance;
        }

        // Scenario Progress: 'GI', 'SEUNG', 'JEON', 'GYEOL'
        this.progress = 'GI';

        // Inventory: stores gathered components and specialty items
        // Example: { 'ISOTOPE_BATTERY': 2, 'ANTI_RAD_LEAD': 5 }
        this.inventory = {};

        // Encyclopedia: set of discovered fish IDs
        this.discoveredFish = new Set();

        // Boat Upgrades: Levels (0 to Max)
        this.upgrades = {
            speed: 0,
            armor: 0,
            light: 0,
            radResist: 0
        };

        // Captured Fish: Current fish in the tank or to be processed
        this.capturedFish = [];

        // Recent Catches: Last 5 caught fish IDs for HUD display
        this.recentCatches = [];

        // Pet (Black Duck) State
        this.pet = {
            friendship: 0,
            level: 1
        };

        GameState.instance = this;
    }

    // --- Inventory Management ---
    addItem(id, amount = 1) {
        if (!this.inventory[id]) this.inventory[id] = 0;
        this.inventory[id] += amount;
        console.log(`[GameState] Added ${amount} of ${id}. Total: ${this.inventory[id]}`);
    }

    removeItem(id, amount = 1) {
        if (this.inventory[id] && this.inventory[id] >= amount) {
            this.inventory[id] -= amount;
            return true;
        }
        return false;
    }

    hasItem(id, amount = 1) {
        return (this.inventory[id] || 0) >= amount;
    }

    // --- Encyclopedia & History ---
    discoverFish(fishId) {
        if (!this.discoveredFish.has(fishId)) {
            this.discoveredFish.add(fishId);
            console.log(`[GameState] New Fish Discovered: ${fishId}`);
            return true;
        }
        return false;
    }

    addRecentCatch(fishId) {
        this.recentCatches.unshift(fishId);
        if (this.recentCatches.length > 5) {
            this.recentCatches.pop();
        }
        console.log(`[GameState] Recent Catches: ${this.recentCatches}`);
    }

    isFishDiscovered(fishId) {
        return this.discoveredFish.has(fishId);
    }

    // --- Upgrades ---
    upgradeBoat(stat) {
        if (this.upgrades.hasOwnProperty(stat)) {
            this.upgrades[stat]++;
            console.log(`[GameState] Boat ${stat} upgraded to level ${this.upgrades[stat]}`);
            return true;
        }
        return false;
    }

    // --- Scenario ---
    setProgress(stage) {
        const stages = ['GI', 'SEUNG', 'JEON', 'GYEOL'];
        if (stages.includes(stage)) {
            this.progress = stage;
            console.log(`[GameState] Scenario Progress Updated: ${stage}`);
        }
    }
}

// Export a single instance to be used throughout the game
export const gameState = new GameState();
