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
        SKY_COLOR: 0x87CEEB,
        WATER_COLOR: 0x1E90FF
    },
    Fish: {
        SMALL: { hp: 10, price: 10, depth: [0, 500], speed: 50, color: 0xFFD700 }, // Goldfish
        MEDIUM: { hp: 25, price: 50, depth: [400, 1500], speed: 70, color: 0xFF6347 }, // Red Snapper
        LARGE: { hp: 60, price: 150, depth: [1200, 3500], speed: 40, color: 0x000080 }, // Tuna
        ABYSS: { hp: 150, price: 500, depth: [3000, 6000], speed: 90, color: 0x4B0082 }, // Anglerfish
        LEGENDARY: { hp: 500, price: 2000, depth: [5000, 10000], speed: 120, color: 0xDC143C } // Deep Sea Kraken
    }
};
