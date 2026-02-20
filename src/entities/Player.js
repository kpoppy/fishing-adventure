import { GameConfig } from "../config/GameConfig.js";

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, "atlas", 0);
        this.scene = scene;
        this.setDisplaySize(64, 64);
        this.scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);
        this.body.setSize(120, 160, true);
        this.body.setGravityY(GameConfig.Player.GRAVITY || 600);
        this.body.setFriction(1, 1);

        this.facing = 1;
        this.play("hero-idle");

        this.scene.add.existing(this);
        this.bindInput();
    }

    get moveSpeed() {
        return GameConfig.Player.MOVE_SPEED;
    }

    bindInput() {
        this.cursors = this.scene.input.keyboard.createCursorKeys();
        this.keys = this.scene.input.keyboard.addKeys("SPACE");

        this.scene.events.on("update", this.handleInput, this);

        // Casting State
        this.isCharging = false;
        this.chargeStartTime = 0;
        this.chargePower = 0;
    }

    handleInput() {
        if (!this.active) return;

        // Block movement if casting
        if (this.scene.state === "CASTING") {
            this.body.setVelocityX(0);
            return;
        }

        // Left/Right
        if (this.cursors.left.isDown) {
            this.body.setVelocityX(-this.moveSpeed);
            this.setFlipX(true);
            this.facing = -1;
            if (this.body.blocked.down) this.play("hero-run", true);
        } else if (this.cursors.right.isDown) {
            this.body.setVelocityX(this.moveSpeed);
            this.setFlipX(false);
            this.facing = 1;
            if (this.body.blocked.down) this.play("hero-run", true);
        } else {
            this.body.setVelocityX(0);
            if (this.body.blocked.down) this.play("hero-idle", true);
        }

        // Jump
        if (this.cursors.up.isDown && this.body.blocked.down) {
            this.body.setVelocityY(GameConfig.Player.JUMP_FORCE);
        }

        // Fall animation
        if (!this.body.blocked.down) {
            // We can add jump animation here if we have one
            // this.play("hero-jump", true);
        }
    }
}
