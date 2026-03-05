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
            level: 1,
            hunger: 100,
            maxHunger: 100,
            lastInteractionTime: 0
        };

        // --- Survival Stats ---
        this.survival = {
            hp: 100,            // Health Points
            maxHp: 100,
            hunger: 100,        // Hunger (Seesaw with HP)
            maxHunger: 100,
            fuel: 100,          // Fuel for the boat
            maxFuel: 100,
            radiation: 0,       // Accumulated Radiation
            maxRadiation: 100,
            sanity: 100,        // Mental State
            maxSanity: 100
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

            // 업그레이드에 따른 최대 스탯 확장
            if (stat === 'armor') {
                this.survival.maxHp = 100 + (this.upgrades.armor * 20);
                this.survival.hp = Math.min(this.survival.hp + 20, this.survival.maxHp);
            }
            if (stat === 'speed') {
                this.survival.maxFuel = 100 + (this.upgrades.speed * 20);
                this.survival.fuel = Math.min(this.survival.fuel + 20, this.survival.maxFuel);
            }

            console.log(`[GameState] Boat ${stat} upgraded to level ${this.upgrades[stat]}`);
            return true;
        }
        return false;
    }

    // --- Survival Stat Logic ---
    updateSurvivalStats(delta, isMoving = false) {
        // Delta is in ms (from Phaser update)
        const seconds = delta / 1000;

        // 1. Hunger (Gulp) decreases over time
        // Base rate: 1 unit per 10 seconds
        const hungerDecay = 0.1 * seconds;
        this.survival.hunger = Math.max(0, this.survival.hunger - hungerDecay);

        // 2. Fuel decreases when moving
        if (isMoving) {
            // Base consumption: 0.5 units per second
            // Efficiency improves with speed upgrade
            const efficiency = 1.0 - (this.upgrades.speed * 0.05); // 5% improvement per level
            const fuelDecay = 0.5 * seconds * efficiency;
            this.survival.fuel = Math.max(0, this.survival.fuel - fuelDecay);
        }

        // 3. HP Logic
        if (this.survival.hunger <= 0) {
            // Starvation: lose 1 HP per 2 seconds
            this.survival.hp = Math.max(0, this.survival.hp - (0.5 * seconds));
        }

        // 4. Radiation Logic (Placeholder for depth-based)
        // Radiation resist reduces gain
        const radResistFactor = Math.max(0.1, 1.0 - (this.upgrades.radResist * 0.15));

        // Radiation Penalty: If radiation > 80%, lose HP gradually
        if (this.survival.radiation > 80) {
            // Severe radiation: lose 1 HP per 1 second
            this.survival.hp = Math.max(0, this.survival.hp - (1.0 * seconds));
        }

        // --- Game Over Checks ---
        if (this.survival.hp <= 0) {
            return { gameOver: true, reason: "reason_hp" };
        }
        if (this.survival.hunger <= 0) {
            return { gameOver: true, reason: "reason_hunger" };
        }
        if (this.survival.radiation >= this.survival.maxRadiation) {
            return { gameOver: true, reason: "reason_rad" };
        }

        return { gameOver: false };
    }

    useItem(id) {
        if (!this.hasItem(id, 1)) return null;

        let result = { type: null, amount: 0, message: "" };

        // Item Effects Logic
        switch (id) {
            case "RATIONS":
                this.feed(40);
                result = { type: "hunger", amount: 40, message: "restored_hunger" };
                break;
            case "FUEL_CELL":
                this.restoreFuel(30);
                result = { type: "fuel", amount: 30, message: "restored_fuel" };
                break;
            case "REPAIR_KIT":
                this.restoreHP(20);
                result = { type: "hp", amount: 20, message: "restored_hp" };
                break;
            case "METAL_SCRAP":
                this.restoreHP(5);
                result = { type: "hp", amount: 5, message: "restored_hp" };
                break;
            case "MUTANT_SCALE":
            case "TOXIC_FIN":
                this.feed(20);
                this.survival.radiation = Math.min(this.survival.maxRadiation, this.survival.radiation + 5);
                result = { type: "hunger", amount: 20, message: "restored_hunger" };
                break;
            case "RAD_ENZYME":
                this.purifyRadiation(30);
                result = { type: "rad", amount: -30, message: "rad_purified" };
                break;
            case "PURIFIED_WATER":
                this.purifyRadiation(10);
                result = { type: "rad", amount: -10, message: "rad_purified" };
                break;
            default:
                return null; // Not usable
        }

        this.removeItem(id, 1);
        return result;
    }

    consumeFuel(amount) {
        this.survival.fuel = Math.max(0, this.survival.fuel - amount);
    }

    restoreFuel(amount) {
        this.survival.fuel = Math.min(this.survival.maxFuel, this.survival.fuel + amount);
    }

    restoreHP(amount) {
        this.survival.hp = Math.min(this.survival.maxHp, this.survival.hp + amount);
    }

    feed(amount) {
        this.survival.hunger = Math.min(this.survival.maxHunger, this.survival.hunger + amount);
    }

    purifyRadiation(amount) {
        this.survival.radiation = Math.max(0, this.survival.radiation - amount);
    }

    // --- Reset ---
    reset() {
        this.progress = 'GI';
        this.inventory = {};
        this.discoveredFish = new Set();
        this.upgrades = {
            speed: 0,
            armor: 0,
            light: 0,
            radResist: 0
        };
        this.capturedFish = [];
        this.recentCatches = [];
        this.pet = {
            friendship: 0,
            level: 1,
            hunger: 100,
            maxHunger: 100,
            lastInteractionTime: 0
        };
        this.survival = {
            hp: 100,
            maxHp: 100,
            hunger: 100,
            maxHunger: 100,
            fuel: 100,
            maxFuel: 100,
            radiation: 0,
            maxRadiation: 100,
            sanity: 100,
            maxSanity: 100
        };
        console.log("[GameState] All states reset to initial values.");
    }
}

// Export a single instance to be used throughout the game
export const gameState = new GameState();
