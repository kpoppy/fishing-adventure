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
        DEPTH_ADJUST_SPEED: 120, // 감도 더 하향 (180 -> 120)
        MAX_DEPTH: 11000
    },
    World: {
        GRAVITY: 500,
        WATER_LEVEL: 350, // Y coordinate where water starts
        SKY_COLOR: 0x220000, // Dark red base
        WATER_COLOR: 0x2b0000 // Very dark red/brown toxic water
    },
    /* Fish data is now managed in DataManager.js (FISH_DATA) */
    Fish: {},
    Boat: {
        LEVELS: [
            { name: "Junk Boat", width: 345, height: 75, decoOffset: 120 },
            { name: "Small Boat", width: 280, height: 30, decoOffset: 100 },
            { name: "Advanced Boat", width: 400, height: 45, decoOffset: 160 }
        ],
        DEFAULT_LEVEL: 0
    }
};
