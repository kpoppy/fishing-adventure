import { GameConfig } from "../config/GameConfig.js";

export class Fish extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, typeKey) {
        super(scene, x, y, "atlas", 0);
        this.scene = scene;
        this.typeKey = typeKey || "SMALL";
        const config = GameConfig.Fish[this.typeKey];

        this.hp = config.hp;
        this.value = config.price;
        this.moveSpeed = config.speed;
        this.color = config.color;

        this.setDisplaySize(32, 20); // Placeholder size
        this.setTint(this.color);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.setAllowGravity(false); // Fish don't fall
        this.setCollideWorldBounds(true);
        this.setBounce(1);

        // State
        this.state = "SWIM"; // SWIM, CHASE, BITE, HOOKED
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.setVelocityX(this.moveSpeed * this.direction);
        this.setFlipX(this.direction < 0);

        // Randomly change direction timer
        this.changeDirTimer = 0;
    }

    update(time, delta) {
        if (!this.active) return;

        if (this.state === "SWIM") {
            this.swimBehavior(time, delta);
            this.checkForBait();
        } else if (this.state === "CHASE") {
            this.chaseBehavior();
        }
    }

    swimBehavior(time, delta) {
        this.changeDirTimer += delta;
        if (this.changeDirTimer > 3000 + Math.random() * 2000) {
            this.direction *= -1;
            this.setVelocityX(this.moveSpeed * this.direction);
            this.setFlipX(this.direction < 0);
            this.changeDirTimer = 0;
        }

        // Bob up and down slightly
        this.setVelocityY(Math.sin(time * 0.002) * 10);
    }

    checkForBait() {
        const bobber = this.scene.bobber;
        if (bobber && bobber.active && bobber.inWater) {
            const dist = Phaser.Math.Distance.Between(this.x, this.y, bobber.x, bobber.y);
            if (dist < 100) {
                this.state = "CHASE";
            }
        }
    }

    chaseBehavior() {
        const bobber = this.scene.bobber;
        if (!bobber || !bobber.active || !bobber.inWater) {
            this.state = "SWIM";
            this.setVelocityX(this.moveSpeed * this.direction);
            return;
        }

        const dist = Phaser.Math.Distance.Between(this.x, this.y, bobber.x, bobber.y);
        if (dist < 10) { // Close enough to bite
            // Trigger Bite logic (handled by collision usually, but explicit check here)
            // For now, just stop
            this.setVelocity(0, 0);
            // TODO: Signal bite event
        } else {
            // Move towards bobber
            this.scene.physics.moveToObject(this, bobber, this.moveSpeed * 1.5);
            this.setFlipX(this.body.velocity.x < 0);
        }
    }
}
