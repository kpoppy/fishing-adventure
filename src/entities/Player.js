import { GameConfig } from "../config/GameConfig.js";

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, "player_sprite");
        this.scene = scene;
        this.setDisplaySize(256, 256); // 2x larger as requested (original 128, which was already 2x from 64)
        this.scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);
        this.body.setSize(60, 240, false); // Narrower collision for accurate falling
        this.body.setOffset(98, -45); // Sunk MUCH more into the deck to stay behind railings
        this.body.setGravityY(GameConfig.Player.GRAVITY || 600);
        this.body.setFriction(1, 1);

        this.facing = 1;
        this.play("hero-idle");

        // Base Hitbox Config (Calculated/Tuned in Debug)
        this.baseOffsetX = 98;
        this.baseOffsetY = -45;
        this.updateHitbox();

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

        // Block all movement and animation logic if debug mode is active
        if (this.scene.physics.world.drawDebug) {
            this.body.setVelocity(0, 0);
            return;
        }

        // Block movement if casting or waiting for bite
        if (this.scene.state === "CASTING" || this.scene.state === "THROWING" || this.scene.state === "WAITING") {
            this.body.setVelocityX(0);
            this.stop();

            const elapsedCharging = this.scene.time.now - this.chargeStartTime;
            const fps = 15;
            const frameDuration = 1000 / fps;

            if (this.scene.state === "CASTING") {
                // Phase 1: Sequential 1 to 11 (Index 0 to 10)
                // Total duration for phase 1: 11 frames * frameDuration
                const phase1Duration = 11 * frameDuration;

                if (elapsedCharging < phase1Duration) {
                    const frameIdx = Math.floor(elapsedCharging / frameDuration);
                    this.setFrame(Phaser.Math.Clamp(frameIdx, 0, 10));
                } else {
                    // Phase 2: Ping-pong loop between 7 and 11 (Index 6 and 10)
                    const loopElapsed = elapsedCharging - phase1Duration;
                    const loopCycleTime = 600; // ms for one back-and-forth
                    const t = (loopElapsed % loopCycleTime) / loopCycleTime;
                    const numLoopFrames = 5; // 7, 8, 9, 10, 11
                    let relIdx = Math.floor(t * numLoopFrames * 2);
                    if (relIdx >= numLoopFrames) relIdx = (numLoopFrames * 2 - 1) - relIdx;
                    this.setFrame(Phaser.Math.Clamp(6 + relIdx, 6, 10));
                }
            } else if (this.scene.state === "THROWING") {
                // Play frames 7 to 20 (Index 6 to 19) once
                if (!this.throwStartTime) {
                    this.throwStartTime = this.scene.time.now;
                }
                const elapsedThrow = this.scene.time.now - this.throwStartTime;
                const throwFps = 20;
                const throwFrameDur = 1000 / throwFps;
                const startFrame = 6; // Image 7
                const endFrame = 19;  // Image 20
                const totalAnimFrames = endFrame - startFrame + 1;

                let relThrowIdx = Math.floor(elapsedThrow / throwFrameDur);
                if (relThrowIdx < totalAnimFrames) {
                    const currentFrame = startFrame + relThrowIdx;
                    this.setFrame(currentFrame);

                    // Release the bobber at Image 11 (Index 10)
                    if (currentFrame === 10 && !this.bobberReleased) {
                        this.scene.castBobber(this.scene.pendingPower);
                        this.bobberReleased = true;
                    }
                } else {
                    this.setFrame(endFrame); // Hold Image 20 (Index 19)
                    this.scene.state = "WAITING";
                    this.throwStartTime = null;
                    this.bobberReleased = false;
                }
            } else if (this.scene.state === "WAITING") {
                this.setFrame(19); // Keep Image 20 (Index 19)
            }
            return;
        }

        // Left/Right
        if (this.cursors.left.isDown) {
            this.body.setVelocityX(-this.moveSpeed);
            if (!this.flipX) {
                this.setFlipX(true);
                this.updateHitbox();
            }
            this.facing = -1;
            if (this.body.blocked.down) this.play("hero-run", true);
        } else if (this.cursors.right.isDown) {
            this.body.setVelocityX(this.moveSpeed);
            if (this.flipX) {
                this.setFlipX(false);
                this.updateHitbox();
            }
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

    updateHitbox() {
        // Arcade Physics offsets don't flip automatically
        // If flipX is true (Left), we use the base offset
        // If flipX is false (Right), we mirror it
        if (this.flipX) {
            this.body.setOffset(this.baseOffsetX, this.baseOffsetY);
        } else {
            const mirroredX = this.width - this.body.width - this.baseOffsetX;
            this.body.setOffset(mirroredX, this.baseOffsetY);
        }
    }
}
