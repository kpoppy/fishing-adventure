import { GameConfig } from "../config/GameConfig.js";

export class Bobber extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, power) {
        super(scene, x, y, "atlas", 0);
        this.scene = scene;
        this.setDisplaySize(16, 16);
        this.setTint(0xff4444); // High visibility red

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setBounce(0.4);
        this.setDragX(50);

        // Physics Body Settings
        this.body.setCircle(8);
        this.body.setGravityY(GameConfig.World.GRAVITY);

        // Cast Logic
        this.isStuck = false; // If stuck on land/obstacle
        this.inWater = false;
        this.castPower = power || 400;

        // Launch
        const angle = -45 * (Math.PI / 180);
        const facing = this.scene.player.facing || 1;
        const vx = Math.cos(angle) * this.castPower * facing;
        const vy = Math.sin(angle) * this.castPower;

        this.setVelocity(vx, vy);
    }

    update(time, delta) {
        if (!this.active) return;

        // Water Interactions
        if (this.y > GameConfig.World.WATER_LEVEL) {
            if (!this.inWater) {
                this.enterWater();
            }
            this.floatLogic(time);
        } else {
            this.inWater = false;
        }
    }

    enterWater() {
        this.inWater = true;
        this.scene.soundManager.play("splash"); // Need to add splash sound
        this.scene.effectManager.createSplash(this.x, GameConfig.World.WATER_LEVEL);

        // Slow down significantly
        this.setVelocity(this.body.velocity.x * 0.2, this.body.velocity.y * 0.1);
    }

    floatLogic(time) {
        // Buoyancy: Bob up and down around surface
        // Simple harmonic motion + damping

        // If deep, push up hard
        const depth = this.y - GameConfig.World.WATER_LEVEL;
        const buoyancyForce = -depth * 2;

        // Drag
        this.body.velocity.y *= 0.95;
        this.body.velocity.x *= 0.95;

        // Wave motion
        const wave = Math.sin(time * 0.003) * 0.5;

        // Apply forces (manually since Arcade Physics is limited)
        // Actually, just managing velocity directly for "floating" feel is easier in Arcade
        if (Math.abs(this.body.velocity.y) < 20 && Math.abs(depth) < 10) {
            this.body.setVelocityY(Math.sin(time * 0.005) * 8);
        }
    }
}
