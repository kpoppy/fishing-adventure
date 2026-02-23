export const GameConfig = {
    Player: {
        MOVE_SPEED: 200,
        BOAT_SPEED: 150,
        JUMP_FORCE: -400,
        GRAVITY: 800
    },
    Rod: {
        MAX_LENGTH: 600,
        CAST_POWER_MULTIPLIER: 1.5,
        REEL_SPEED: 150,
        DEPTH_ADJUST_SPEED: 400,
        MAX_DEPTH: 11000
    },
    World: {
        GRAVITY: 500,
        WATER_LEVEL: 350, // Y coordinate where water starts
        SKY_COLOR: 0x220000, // Dark red base
        WATER_COLOR: 0x8B0000 // Dark red/brown toxic water
    },
    Fish: {
        GOLDFISH: { hp: 10, price: 10, depth: [0, 300], speed: 40, color: 0xFFD700 },
        NEON_TETRA: { hp: 5, price: 20, depth: [50, 400], speed: 60, color: 0x00FFFF },
        MACKEREL: { hp: 20, price: 40, depth: [300, 800], speed: 80, color: 0x708090 },
        CATFISH: { hp: 30, price: 60, depth: [600, 1200], speed: 30, color: 0x8B4513 },
        SALMON: { hp: 40, price: 100, depth: [1000, 2000], speed: 90, color: 0xFA8072 },
        TUNA: { hp: 80, price: 250, depth: [1800, 4000], speed: 110, color: 0x000080 },
        SWORDFISH: { hp: 150, price: 600, depth: [3500, 6000], speed: 140, color: 0x00CED1 },
        ANGLERFISH: { hp: 250, price: 1200, depth: [5500, 8500], speed: 70, color: 0x800080 },
        SHARK: { hp: 600, price: 3000, depth: [7000, 11000], speed: 160, color: 0xA9A9A9 },
        KRAKEN: { hp: 2000, price: 10000, depth: [10000, 15000], speed: 200, color: 0xDC143C }
    },
    Boat: {
        LEVELS: [
            { name: "Junk Boat", width: 345, height: 75, decoOffset: 120 },
            { name: "Small Boat", width: 280, height: 30, decoOffset: 100 },
            { name: "Advanced Boat", width: 400, height: 45, decoOffset: 160 }
        ],
        DEFAULT_LEVEL: 0
    }
};
