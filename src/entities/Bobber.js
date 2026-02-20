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
        this.isAdjusting = false;
        this.buoyancyK = 3; // Default buoyancy coefficient (lowered from 12)
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
            this.body.setAccelerationY(0);
        }
    }

    enterWater() {
        this.inWater = true;

        // Defensive check: ensure createSplash exists before calling
        if (this.scene.effectManager && typeof this.scene.effectManager.createSplash === 'function') {
            this.scene.effectManager.createSplash(this.x, GameConfig.World.WATER_LEVEL);
        } else {
            console.warn("EffectManager.createSplash is not available yet.");
        }

        // Slow down significantly
        this.setVelocity(this.body.velocity.x * 0.2, this.body.velocity.y * 0.1);
        this.body.setGravityY(200); // Reduced gravity underwater
    }

    floatLogic(time) {
        if (this.isAdjusting) {
            this.body.setAccelerationY(0);
            this.body.setGravityY(0);
            this.setAngle(0);
            return;
        }

        // Restore underwater gravity
        this.body.setGravityY(GameConfig.World.GRAVITY);
        const depth = this.y - GameConfig.World.WATER_LEVEL;
        const targetDepth = 25; // Target depth to float at (2.5m)

        if (depth > 0) {
            // Buoyancy: Neutralize gravity (500) and add spring force relative to target depth
            // We use (depth - targetDepth) to make it settle at 'targetDepth' instead of 0
            const buoyancyForce = -GameConfig.World.GRAVITY - ((depth - targetDepth) * this.buoyancyK);
            this.body.setAccelerationY(buoyancyForce);

            // Active Damping: Prevent momentum from carrying it too deep
            // Increased damping near target depth for stability
            const dampingFactor = depth < targetDepth + 20 ? 0.85 : 0.92;
            this.body.velocity.y *= dampingFactor;
            this.body.velocity.x *= 0.95;

            // Surface bobbing (refined)
            if (depth < targetDepth + 15 && depth > targetDepth - 10) {
                // Gentle bobbing around the target depth
                if (Math.abs(this.body.velocity.y) < 15) {
                    this.body.setVelocityY(this.body.velocity.y + Math.sin(time * 0.005) * 3);
                }
            }
        } else {
            this.body.setAccelerationY(0);
        }
    }
}
