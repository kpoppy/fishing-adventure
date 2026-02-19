import { VIEW_W, VIEW_H, DEPTH } from "../constants.js";
import { GameConfig } from "../config/GameConfig.js";
import { Player } from "../entities/Player.js";
import { Bobber } from "../entities/Bobber.js";
import { EffectManager } from "../managers/EffectManager.js";
import { SoundManager } from "../managers/SoundManager.js";
import { UIManager } from "../managers/UIManager.js";
import { SaveManager } from "../managers/SaveManager.js";
import { FishManager } from "../managers/FishManager.js";

export class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
        this.state = "IDLE"; // IDLE, CASTING, WAITING, REELING, CATCH
        this.fishCaught = 0;
        this.money = 0;
    }

    preload() {
        this.load.image("background", "assets/background.png");
        this.load.spritesheet("atlas", "assets/chatgpt.png", {
            frameWidth: 200,
            frameHeight: 200,
            endFrame: 5 // 0-5 (6 frames total)
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
        this.add.rectangle(0, 0, VIEW_W, GameConfig.World.WATER_LEVEL, GameConfig.World.SKY_COLOR).setOrigin(0).setDepth(DEPTH.BG);
        this.add.rectangle(0, GameConfig.World.WATER_LEVEL, VIEW_W, VIEW_H - GameConfig.World.WATER_LEVEL, GameConfig.World.WATER_COLOR, 0.6).setOrigin(0).setDepth(DEPTH.BG_DECO);

        // Water Physics Zone
        this.waterZone = this.add.zone(VIEW_W / 2, GameConfig.World.WATER_LEVEL + (VIEW_H - GameConfig.World.WATER_LEVEL) / 2, VIEW_W, VIEW_H - GameConfig.World.WATER_LEVEL);
        this.physics.add.existing(this.waterZone, true);

        // 2. Player & Platforms
        this.platforms = this.physics.add.staticGroup();
        // Dock / Pier
        const dock = this.add.rectangle(100, GameConfig.World.WATER_LEVEL - 10, 180, 20, 0x8B4513);
        this.physics.add.existing(dock, true);
        this.platforms.add(dock);

        // Ground on the far right just in case
        const ground = this.add.rectangle(VIEW_W - 50, GameConfig.World.WATER_LEVEL - 10, 100, 20, 0x228B22);
        this.physics.add.existing(ground, true);
        this.platforms.add(ground);

        this.player = new Player(this, 100, GameConfig.World.WATER_LEVEL - 60);
        this.physics.add.collider(this.player, this.platforms);

        // 3. Inputs
        this.keys = this.input.keyboard.addKeys("SPACE,R");
        this.input.on('pointerdown', this.handleInput, this);
        this.input.keyboard.on('keydown-SPACE', this.handleInput, this);

        // 4. Game State
        this.bobber = null;
        this.uiManager.update({ depth: 0, fish: 0, money: 0, time: 0 });
    }

    update(time, delta) {
        if (this.finished) return;

        // Manager Updates
        // this.effectManager.update(time, delta); // Not needed
        this.fishManager.update(time, delta);

        if (this.uiManager) {
            const depth = (this.bobber && this.bobber.active && this.bobber.y > GameConfig.World.WATER_LEVEL)
                ? (this.bobber.y - GameConfig.World.WATER_LEVEL) / 10
                : 0;
            this.uiManager.update({
                depth: depth,
                fish: this.fishCaught,
                money: this.money,
                time: time / 1000 // Convert to seconds
            });
        }
        // Bobber Logic
        if (this.bobber && this.bobber.active) {
            // Check if bobber is in water
            if (this.bobber.y > GameConfig.World.WATER_LEVEL) {
                // Apply buoyancy / Drag
                this.bobber.body.setVelocityY(this.bobber.body.velocity.y * 0.9);
                this.bobber.body.setVelocityX(this.bobber.body.velocity.x * 0.9);

                if (Math.abs(this.bobber.body.velocity.y) < 10) {
                    this.bobber.body.setVelocityY(Math.sin(time * 0.005) * 5); // Floating effect
                }
            }

            // Draw Line
            this.graphics = this.graphics || this.add.graphics();
            this.graphics.clear();
            this.graphics.lineStyle(2, 0xffffff, 0.5);
            this.graphics.beginPath();
            this.graphics.moveTo(this.player.x, this.player.y);
            this.graphics.lineTo(this.bobber.x, this.bobber.y);
            this.graphics.strokePath();
        } else if (this.graphics) {
            this.graphics.clear();
        }

        // Draw Charge Bar
        if (this.player && this.player.isCharging) {
            this.graphics = this.graphics || this.add.graphics();
            // Don't clear if bobber line is drawing, but bobber isn't active if charging.
            // But careful about clearing other graphics.
            // Let's assume graphics is shared.

            const barX = this.player.x - 20;
            const barY = this.player.y - 50;
            this.graphics.fillStyle(0x000000, 1);
            this.graphics.fillRect(barX, barY, 40, 8);

            const color = this.player.chargePower > 0.8 ? 0xff0000 : 0xffff00;
            this.graphics.fillStyle(color, 1);
            this.graphics.fillRect(barX + 1, barY + 1, 38 * this.player.chargePower, 6);
        }
    }

    handleInput() {
        const space = this.keys.SPACE;

        if (this.state === "IDLE") {
            if (Phaser.Input.Keyboard.JustDown(space)) {
                console.log("Started Casting");
                this.state = "CASTING";
                this.player.isCharging = true;
                this.player.chargeStartTime = this.time.now;
            }
        }
        else if (this.state === "CASTING") {
            if (space.isDown) {
                // Holding...
                const duration = this.time.now - this.player.chargeStartTime;
                const t = (duration % 2000) / 1000;
                this.player.chargePower = t > 1 ? 2 - t : t;
            } else {
                // Released!
                console.log("Cast Released with Power:", this.player.chargePower);
                this.castBobber(this.player.chargePower);
                this.player.isCharging = false;
                this.player.chargePower = 0;
            }
        }
        else if (this.state === "WAITING") {
            if (Phaser.Input.Keyboard.JustDown(space)) {
                this.reelBobber();
            }
        }

        // Debug Reset
        if (this.input.keyboard.checkDown(this.keys.R, 1000)) {
            this.scene.restart();
        }
    }

    castBobber(chargeRatio) {
        this.state = "WAITING";
        this.bobber = new Bobber(this, this.player.x, this.player.y - 20, chargeRatio);

        // Power calculation
        const basePower = 200;
        const maxPower = GameConfig.Rod.MAX_LENGTH * 1.5;
        const power = basePower + (maxPower * chargeRatio);

        const angle = -45 * (Math.PI / 180);
        const vx = Math.cos(angle) * power * this.player.facing;
        const vy = Math.sin(angle) * power;

        this.bobber.body.setVelocity(vx, vy);
        this.bobber.body.setGravityY(GameConfig.World.GRAVITY);
        this.soundManager.play("shoot");

        // Add overlap with fish
        this.physics.add.overlap(this.bobber, this.fishManager.fishes, (bobber, fish) => {
            // Let logic be handled by Fish.js check for now, or here.
            // Fish.js checks distance for 'CHASE'. Collision is for 'BITE'.
        });
    }

    reelBobber() {
        this.state = "IDLE";
        if (this.bobber) {
            this.bobber.destroy();
            this.bobber = null;
        }
        this.graphics.clear();
    }

}
