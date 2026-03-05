import { GameConfig } from "../config/GameConfig.js";

export class Bobber extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, distRatio, strengthRatio) {
        super(scene, x, y, "bobber_sprite");
        this.scene = scene;
        this.setDisplaySize(32, 32);
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
        this.isStuck = false;
        this.inWater = false;

        // distRatio (0~1) -> Horizontal Distance
        this.distRatio = (distRatio === undefined || isNaN(distRatio)) ? 0.3 : distRatio;
        // strengthRatio (0~1) -> Vertical Depth
        this.strengthRatio = (strengthRatio === undefined || isNaN(strengthRatio)) ? 0.3 : strengthRatio;

        // Launch Calculation (vx: Distance, vy: Height/Power balance)
        const angle = -45 * (Math.PI / 180);
        const facing = this.scene.player.facing || 1;

        // Base power for horizontal throw (낮으면 바로 앞, 높으면 멀리)
        const baseDistPower = 50;
        const maxDistPower = 800;
        const vx = Math.cos(angle) * (baseDistPower + maxDistPower * this.distRatio) * facing;

        // vy is slightly influenced by strength for initial splash
        const vy = Math.sin(angle) * (150 + 250 * this.strengthRatio);

        this.setVelocity(vx, vy);
        this.isAdjusting = false;
        this.buoyancyK = 1.5;

        // 가로 게이지(strengthRatio)는 찌의 무게에 영향 (낮으면 가볍고, 높으면 무거움)
        this.sinkWeight = 1.0 + 4.0 * this.strengthRatio;
        this.returnSpeed = 1.1;

        // 캐스팅 강도(strengthRatio)에 따라 초기 수심을 결정 (10px ~ 1500px)
        const minDepth = 10;
        const maxDepth = 1500;
        this.targetDepth = minDepth + (maxDepth - minDepth) * this.strengthRatio;

        this.hookedFish = null;
        this.hookedDebris = null;
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
        // 입수 시 속도를 거의 유지하여 시원하게 들어가게 함
        this.setVelocity(this.body.velocity.x * 0.9, this.body.velocity.y * 0.8);
        this.body.setGravityY(GameConfig.World.GRAVITY);
    }

    floatLogic(time) {
        // Restore underwater gravity
        this.body.setGravityY(GameConfig.World.GRAVITY);
        const depth = this.y - GameConfig.World.WATER_LEVEL;

        if (depth > 0) {
            const gravity = GameConfig.World.GRAVITY;
            const weightForce = gravity * this.sinkWeight;
            const totalDownwardForce = gravity + weightForce;

            // Stable Spring-Damper Model
            // We want it to be perfectly still at targetDepth. 
            // Acceleration = -k * (y - targetY) - c * velocity
            const springK = 5.0; // Slightly stronger for tighter depth control
            const currentY = this.y;
            const targetY = GameConfig.World.WATER_LEVEL + this.targetDepth;

            // Compensation force to stay at targetDepth
            const compensation = -(gravity + weightForce);
            const springForce = -(currentY - targetY) * springK;

            this.body.setAccelerationY(springForce + compensation);

            // Natural Underwater Damping (Dampens oscillation)
            this.body.velocity.y *= 0.92; // Slightly more damping for better stability
            this.body.velocity.x *= 0.98;

            // Cap the velocity to prevent "shooting out" of water
            if (this.body.velocity.y < -350) this.body.setVelocityY(-350);
            if (this.body.velocity.y > 600) this.body.setVelocityY(600);
        } else {
            // Above/At Surface: No buoyancy acceleration
            this.body.setAccelerationY(0);

            // Hard Surface Clamp: Absolutely stop from flying up
            if (this.y < GameConfig.World.WATER_LEVEL - 2) {
                this.y = GameConfig.World.WATER_LEVEL - 2;
                // If moving up, kill the velocity
                if (this.body.velocity.y < 0) this.body.setVelocityY(0);
            }
        }
    }
}
