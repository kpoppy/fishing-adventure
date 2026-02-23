import { GameConfig } from "../config/GameConfig.js";

export class Bobber extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, power) {
        super(scene, x, y, "bobber_sprite");
        this.scene = scene;
        this.setDisplaySize(32, 32); // Slightly larger than typical hook for pixel art visibility
        // Removed setTint to preserve full pixel art color

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
        this.buoyancyK = 1.5; // Default buoyancy coefficient (changed to 1.5 per user request)
        this.sinkWeight = 1; // Adjusted to user request (1x multiplier)
        this.returnSpeed = 1.1; // Fast return speed when off-screen
        this.hookedFish = null; // Explicitly initialize
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
            // Buoyancy VS Weight
            // Default gravity is 500. We want the bobber to sink MUCH faster as requested.
            // We apply a downward force based on the new sinkWeight parameter. 
            // 4x heavier means we apply 4x gravity downwards.
            const weightForce = GameConfig.World.GRAVITY * this.sinkWeight;

            // The net force: buoyancy tries to lift it, weight pulls it down.
            const buoyancyForce = -GameConfig.World.GRAVITY - ((depth - targetDepth) * this.buoyancyK);

            this.body.setAccelerationY(buoyancyForce + weightForce);

            // Active Damping: Prevent momentum from carrying it too crazy
            this.body.velocity.y *= 0.95;
            this.body.velocity.x *= 0.95;

            // Surface bobbing only if buoyancy is enough to actually float it near target
            if (this.buoyancyK > 0 && depth < targetDepth + 15 && depth > targetDepth - 10) {
                if (Math.abs(this.body.velocity.y) < 15) {
                    this.body.setVelocityY(this.body.velocity.y + Math.sin(time * 0.005) * 3);
                }
            }
        } else {
            this.body.setAccelerationY(0);
        }
    }
}
