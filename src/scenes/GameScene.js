import { VIEW_W, VIEW_H, DEPTH } from "../constants.js";
import { GameConfig } from "../config/GameConfig.js";
import { Player } from "../entities/Player.js";
import { Bobber } from "../entities/Bobber.js?v=2";
import { EffectManager } from "../managers/EffectManager.js?v=4";
import { SoundManager } from "../managers/SoundManager.js";
import { UIManager } from "../managers/UIManager.js?v=2";
import { SaveManager } from "../managers/SaveManager.js";
import { FishManager } from "../managers/FishManager.js";

export class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
        this.state = "IDLE"; // IDLE, CASTING, WAITING, REELING, CATCH
        this.fishCaught = 0;
        this.money = 0;
        this.finished = false;
    }

    preload() {
        this.load.image("background", "assets/background.png");
        this.load.spritesheet("atlas", "assets/chatgpt.png", {
            frameWidth: 200,
            frameHeight: 200,
            endFrame: 5
        });
    }

    create(data) {
        this.saveManager = new SaveManager(this);
        this.effectManager = new EffectManager(this);
        this.soundManager = new SoundManager(this);
        this.uiManager = new UIManager(this);
        this.fishManager = new FishManager(this);

        this.effectManager.createAnimations();

        this.input.mouse.disableContextMenu();

        // 1. World & Water
        this.add.rectangle(0, -500, VIEW_W, GameConfig.World.WATER_LEVEL + 500, GameConfig.World.SKY_COLOR).setOrigin(0).setDepth(DEPTH.BG);
        // Expand water rectangle to be extremely deep (e.g. 150,000px for 15,000m)
        this.add.rectangle(0, GameConfig.World.WATER_LEVEL, VIEW_W, 150000, GameConfig.World.WATER_COLOR, 0.6).setOrigin(0).setDepth(DEPTH.BG_DECO);

        // Set World Bounds to match ultra-deep sea (up to 12,000m)
        this.physics.world.setBounds(0, -5000, VIEW_W, 125000);
        this.cameras.main.setBounds(0, -2000, VIEW_W, 122000);

        // 2. Player & Boat
        this.boat = this.add.rectangle(100, GameConfig.World.WATER_LEVEL - 10, 180, 20, 0x8B4513);
        this.physics.add.existing(this.boat);
        this.boat.body.setImmovable(true);
        this.boat.body.setAllowGravity(false);
        this.boat.body.setCollideWorldBounds(true);

        this.player = new Player(this, 100, GameConfig.World.WATER_LEVEL - 60);
        this.physics.add.collider(this.player, this.boat);

        // 3. Inputs
        this.keys = this.input.keyboard.addKeys("SPACE,R,A,D,W,S,OPEN_BRACKET,CLOSED_BRACKET");

        // 4. Game State Initial UI
        this.bobber = null;
        this.graphics = this.add.graphics();
        this.uiManager.update({ depth: 0, fish: 0, money: 0, time: 0, buoyancy: undefined });
    }

    update(time, delta) {
        if (this.finished) return;

        this.handleInput(delta);
        this.fishManager.update(time, delta);

        // UI Update
        if (this.uiManager) {
            const depth = (this.bobber && this.bobber.active && this.bobber.y > GameConfig.World.WATER_LEVEL)
                ? (this.bobber.y - GameConfig.World.WATER_LEVEL) / 10
                : 0;
            this.uiManager.update({
                depth: depth,
                fish: this.fishCaught,
                money: this.money,
                time: this.time.now / 1000,
                buoyancy: this.bobber && this.bobber.active ? this.bobber.buoyancyK : undefined
            });
        }

        // Bobber Rendering & Buoyancy
        this.graphics.clear();
        if (this.bobber && this.bobber.active) {
            // Let bobber handle its own buoyancy and physics
            this.bobber.isAdjusting = (this.keys.W.isDown || this.keys.S.isDown);
            this.bobber.update(time, delta);

            // Draw Fishing Line
            this.graphics.lineStyle(2, 0xffffff, 0.5);
            this.graphics.beginPath();
            this.graphics.moveTo(this.player.x, this.player.y);
            this.graphics.lineTo(this.bobber.x, this.bobber.y);
            this.graphics.strokePath();
        }

        // Camera Management
        const cam = this.cameras.main;
        if (this.state === "WAITING" && this.bobber && this.bobber.active) {
            let targetY = this.bobber.y - cam.height / 2;
            // Prevent NaN
            if (isNaN(targetY)) targetY = cam.scrollY;
            // Clamp strictly to world bounds
            const bounds = cam.getBounds();
            targetY = Phaser.Math.Clamp(targetY, bounds.y, bounds.bottom - cam.height);

            cam.setScroll(cam.scrollX, Phaser.Math.Linear(cam.scrollY, targetY, 0.1));
        } else {
            let resetY = Phaser.Math.Linear(cam.scrollY, 0, 0.1);
            if (isNaN(resetY)) resetY = 0;
            cam.setScroll(cam.scrollX, resetY);
        }

        // Draw Charge Bar
        if (this.player && this.player.isCharging) {
            const barX = this.player.x - 20;
            const barY = this.player.y - 50;
            this.graphics.fillStyle(0x000000, 1);
            this.graphics.fillRect(barX, barY, 40, 8);
            const color = this.player.chargePower > 0.8 ? 0xff0000 : 0xffff00;
            this.graphics.fillStyle(color, 1);
            this.graphics.fillRect(barX + 1, barY + 1, 38 * this.player.chargePower, 6);
        }
    }

    handleInput(delta) {
        const space = this.keys.SPACE;
        const pointer = this.input.activePointer;
        const isDown = space.isDown || pointer.isDown;
        // Check if pointer was pressed in the last very short interval (approx. current frame)
        const isJustDown = Phaser.Input.Keyboard.JustDown(space) || (pointer.isDown && (this.time.now - pointer.downTime) < 30);

        if (this.state === "IDLE") {
            if (isJustDown) {
                this.state = "CASTING";
                this.player.isCharging = true;
                this.player.chargeStartTime = this.time.now;
            }
        }
        else if (this.state === "CASTING") {
            if (isDown) {
                const duration = this.time.now - this.player.chargeStartTime;
                const t = (duration % 2000) / 1000;
                this.player.chargePower = t > 1 ? 2 - t : t;
            } else {
                this.castBobber(this.player.chargePower);
                this.player.isCharging = false;
                this.player.chargePower = 0;
            }
        }
        else if (this.state === "WAITING") {
            if (isJustDown) {
                this.reelBobber();
            }

            // Manual Depth Adjustment (W/S) using Velocity
            if (this.bobber && this.bobber.active && this.bobber.body) {
                const adjSpeed = GameConfig.Rod.DEPTH_ADJUST_SPEED || 200;
                if (this.keys.W.isDown) {
                    // Prevent going too high above water
                    if (this.bobber.y > GameConfig.World.WATER_LEVEL - 20) {
                        this.bobber.body.setVelocityY(-adjSpeed);
                    } else {
                        this.bobber.body.setVelocityY(0);
                        this.bobber.y = GameConfig.World.WATER_LEVEL - 20;
                    }
                } else if (this.keys.S.isDown) {
                    // Apply MAX_DEPTH limit
                    const currentDepth = this.bobber.y - GameConfig.World.WATER_LEVEL;
                    const maxDepthPixels = GameConfig.Rod.MAX_DEPTH * 10; // 1m = 10px

                    if (currentDepth < maxDepthPixels) {
                        this.bobber.body.setVelocityY(adjSpeed);
                    } else {
                        this.bobber.body.setVelocityY(0);
                        this.bobber.y = GameConfig.World.WATER_LEVEL + maxDepthPixels;
                    }
                } else if (!this.bobber.inWater) {
                    // If in air and no keys pressed, let gravity work? 
                    // Actually buoyancy handles it in update if inWater is false.
                }
            }
        }

        // Boat Movement (A/D)
        const boatSpeed = GameConfig.Player.BOAT_SPEED || 150;
        if (this.keys.A.isDown) {
            this.boat.body.setVelocityX(-boatSpeed);
            if (this.player) {
                this.player.setFlipX(true);
                this.player.facing = -1;
            }
        } else if (this.keys.D.isDown) {
            this.boat.body.setVelocityX(boatSpeed);
            if (this.player) {
                this.player.setFlipX(false);
                this.player.facing = 1;
            }
        } else {
            this.boat.body.setVelocityX(0);
        }

        if (this.input.keyboard.checkDown(this.keys.R, 1000)) {
            this.scene.restart();
        }

        // 5. Buoyancy Test Keys ([ / ])
        if (this.bobber && this.bobber.active) {
            if (Phaser.Input.Keyboard.JustDown(this.keys.OPEN_BRACKET)) {
                this.bobber.buoyancyK = Math.max(0, this.bobber.buoyancyK - 1);
                this.effectManager.showFloatingText(this.bobber.x, this.bobber.y - 20, `Buoyancy: ${this.bobber.buoyancyK}`, "#ff4444");
                console.log(`Buoyancy decreased to: ${this.bobber.buoyancyK}`);
            } else if (Phaser.Input.Keyboard.JustDown(this.keys.CLOSED_BRACKET)) {
                this.bobber.buoyancyK = Math.min(50, this.bobber.buoyancyK + 1);
                this.effectManager.showFloatingText(this.bobber.x, this.bobber.y - 20, `Buoyancy: ${this.bobber.buoyancyK}`, "#44ff44");
                console.log(`Buoyancy increased to: ${this.bobber.buoyancyK}`);
            }
        }
    }
    castBobber(chargeRatio) {
        // Guard against NaN
        const ratio = (isNaN(chargeRatio) || chargeRatio === undefined) ? 0.3 : chargeRatio;
        this.state = "WAITING";
        this.bobber = new Bobber(this, this.player.x, this.player.y - 20, ratio);
        const basePower = 200;
        const maxPower = GameConfig.Rod.MAX_LENGTH * 1.5;
        const power = basePower + (maxPower * ratio);
        const angle = -45 * (Math.PI / 180);
        const vx = Math.cos(angle) * power * this.player.facing;
        const vy = Math.sin(angle) * power;

        this.bobber.body.setVelocity(vx, vy);
        this.bobber.body.setGravityY(GameConfig.World.GRAVITY);
        this.soundManager.play("shoot");
    }

    reelBobber() {
        this.state = "IDLE";
        if (this.bobber) {
            this.bobber.destroy();
            this.bobber = null;
        }
    }
}
