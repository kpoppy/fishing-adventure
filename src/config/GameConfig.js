export const GameConfig = {
    Player: {
        MOVE_SPEED: 200,
        JUMP_FORCE: -400,
        GRAVITY: 800
    },
    Rod: {
        MAX_LENGTH: 600,
        CAST_POWER_MULTIPLIER: 1.5,
        REEL_SPEED: 150
    },
    World: {
        GRAVITY: 500,
        WATER_LEVEL: 450, // Y coordinate where water starts
        SKY_COLOR: 0x87CEEB,
        WATER_COLOR: 0x1E90FF
    },
    Fish: {
        SMALL: { hp: 10, price: 10, depth: [0, 150], speed: 50, color: 0xFFD700 }, // Goldfish
        MEDIUM: { hp: 25, price: 50, depth: [100, 300], speed: 70, color: 0xFF6347 }, // Red Snapper
        LARGE: { hp: 60, price: 150, depth: [250, 500], speed: 40, color: 0x000080 } // Tuna
    }
};
