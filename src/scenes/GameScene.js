import { VIEW_W, VIEW_H, DEPTH } from "../constants.js";
import { GameConfig } from "../config/GameConfig.js";
import { Player } from "../entities/Player.js";
import { Bobber } from "../entities/Bobber.js?v=2";
import { EffectManager } from "../managers/EffectManager.js?v=4";
import { SoundManager } from "../managers/SoundManager.js";
import { UIManager } from "../managers/UIManager.js?v=2";
import { SaveManager } from "../managers/SaveManager.js";
import { FishManager } from "../managers/FishManager.js";
import { gameState } from "../managers/GameState.js";
import { dataManager } from "../managers/DataManager.js";

export class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
        this.state = "IDLE"; // IDLE, CASTING, WAITING, REELING, CATCH
        this.fishCaught = 0;
        this.money = 0;
        this.finished = false;
        this.worldTime = 0; // 0 to 1 cycle for day/night
        this.dayDuration = 60000; // 60 seconds for a full cycle
    }

    preload() {
        this.load.spritesheet("player_sprite", "assets/custom_player_spritesheet.png", {
            frameWidth: 210,
            frameHeight: 200
        });
        this.load.json("player_offsets", "assets/custom_player_offsets.json");
        this.load.image("apocalypse_bg", "assets/apocalypse_bg.png");
        this.load.image("apocalypse_near_bg", "assets/apocalypse_near_bg.png");
        this.load.image("fish_sprite", "assets/fish_sprite.png");
        this.load.image("custom_fish_sprite", "assets/custom_fish_spritesheet.png");
        this.load.json("custom_fish_offsets", "assets/custom_fish_offsets.json");
        this.load.image("bobber_sprite", "assets/bobber_sprite.png");
        this.load.image("boat_sprite", "assets/boat_sprite.png");
        this.load.image("fishbowl", "assets/fishbowl.png");
        this.load.image("black_duck", "assets/black_duck.png");
        this.load.image("sea_waves", "assets/sea_wave_pattern_1771868267063.png");

        // 3-Layer Parallax Backgrounds
        this.load.image("bg_farthest", "assets/bg_farthest.png");
        this.load.image("bg_further", "assets/bg_further.png");
        this.load.image("bg_far", "assets/bg_far.png");

        // Suppress "atlas" not found and WebGL errors by loading a fallback
        this.load.spritesheet("atlas", "assets/fish_sprite.png", {
            frameWidth: 32,
            frameHeight: 32
        });
    }

    create(data) {
        this.saveManager = new SaveManager(this);
        this.effectManager = new EffectManager(this);
        this.soundManager = new SoundManager(this);
        this.uiManager = new UIManager(this);
        this.uiManager.setHUDVisible(true);
        this.fishManager = new FishManager(this);
        this.gameState = gameState;
        this.dataManager = dataManager;

        this.effectManager.createAnimations();

        // 1. World, Water & Parallax Background
        // Base Sky Color (Dark reddish for apocalypse theme)
        // Global Sky/Atmosphere (Centers at screen mid)
        // Global Sky/Atmosphere (Saved as property for color animation)
        // Global Sky/Atmosphere (Bright Blue for Day)
        this.skyRect = this.add.rectangle(VIEW_W / 2, -10000, VIEW_W * 20, 10000 + GameConfig.World.WATER_LEVEL, 0x88ccff).setOrigin(0.5, 0).setDepth(DEPTH.BG - 1).setScrollFactor(0, 1);

        // 3-Layer Parallax Background (Farthest to Closest)
        // 1. Farthest (Sky, Moon) - Factor 0.05
        this.bgFarthest = this.add.tileSprite(VIEW_W / 2, GameConfig.World.WATER_LEVEL, 8000, 640, "bg_farthest")
            .setOrigin(0.5, 1).setDepth(DEPTH.BG).setScrollFactor(0, 1.0);

        // 2. Further (Distant Oil Rig/Structures) - Factor 0.1
        this.bgFurther = this.add.tileSprite(VIEW_W / 2, GameConfig.World.WATER_LEVEL, 8000, 640, "bg_further")
            .setOrigin(0.5, 1).setDepth(DEPTH.BG + 1).setScrollFactor(0, 1.0);
        this.bgFurther.setAlpha(0.7);

        // 3. Far (Near Scrap/Masts) - Factor 0.2
        this.bgFar = this.add.tileSprite(VIEW_W / 2, GameConfig.World.WATER_LEVEL, 8000, 640, "bg_far")
            .setOrigin(0.5, 1).setDepth(DEPTH.BG + 2).setScrollFactor(0, 1.0);
        this.bgFar.setAlpha(0.9);


        // Efficient water rectangle: follows camera but stays at water level
        // Increased base alpha (from 0.6 to 0.8) for a darker, more "filled" look from the start
        // Efficient water rectangle (Saved as property for color animation)
        // Efficient water rectangle (Matches sky color at surface)
        this.waterRect = this.add.rectangle(VIEW_W / 2, GameConfig.World.WATER_LEVEL, 8000, 150000, 0x88ccff, 1.0).setOrigin(0.5, 0).setDepth(DEPTH.BG_DECO).setScrollFactor(0, 1);

        // Toxic Sea Waves (Top layer of the water - Background part)
        this.seaWaves = this.add.tileSprite(VIEW_W / 2, GameConfig.World.WATER_LEVEL, 8000, 64, "sea_waves").setOrigin(0.5, 0.5).setDepth(DEPTH.BG_DECO + 1).setScrollFactor(0, 1);
        this.seaWaves.setAlpha(0.8);

        // Toxic Sea Waves (Top layer of the water - Foreground part to cover boat hull)
        this.seaWavesFront = this.add.tileSprite(VIEW_W / 2, GameConfig.World.WATER_LEVEL + 35, 8000, 64, "sea_waves").setOrigin(0.5, 0.5).setDepth(40).setScrollFactor(0, 1);
        this.seaWavesFront.setAlpha(0.6);
        this.seaWavesFront.setScale(1, 0.8); // Slightly flatter for variation

        // Deep Sea Darkness Overlay (Follows camera, darkens as you go deeper)
        // Center on screen and make huge
        this.deepSeaOverlay = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, 8000, 200000, 0x000000, 0).setOrigin(0.5).setDepth(DEPTH.HUD - 1).setScrollFactor(0);

        // Set World Bounds to match ultra-deep sea (up to 12,000m)
        // Make horizontal bounds essentially infinite so player can move forever (e.g. -50000 to 100000)
        this.physics.world.setBounds(-50000, -5000, 100000, 125000);
        this.cameras.main.setBounds(-50000, -2000, 100000, 122000);

        // 2. Player & Boat
        // Replaced rectangle with the new boat sprite (raft now)
        // Check if custom boat exists
        let boatKey = "boat_sprite";
        if (this.textures.exists("custom_boat_sprite")) {
            const img = this.textures.get("custom_boat_sprite").getSourceImage();
            if (img && img.width > 0) boatKey = "custom_boat_sprite";
        }

        this.boatLevel = GameConfig.Boat.DEFAULT_LEVEL;
        this.boatBobTime = 0; // Timer for swaying movement
        const boatCfg = GameConfig.Boat.LEVELS[this.boatLevel];

        this.boat = this.physics.add.sprite(100, GameConfig.World.WATER_LEVEL, boatKey);
        this.boat.setDisplaySize(boatCfg.width, boatCfg.height);
        this.boat.setDepth(20); // Moved ahead of entities (player, deco)

        // Boat Front Layer (for 2-layer effect)
        this.boatFront = this.add.sprite(100, GameConfig.World.WATER_LEVEL, boatKey);
        this.boatFront.setDisplaySize(boatCfg.width, boatCfg.height);
        this.boatFront.setDepth(30); // Front-most boat layer to cover player legs

        this.boat.body.setImmovable(true);
        this.boat.body.setAllowGravity(false);
        // Deck & Hull collision area
        // Set a substantial hitbox (50px high) to give it a "box" feel rather than a line
        // Reduced from 60 to 50 based on the bottom (top stays at offset 30)
        this.boat.body.setSize(this.boat.width, 50, false);
        this.boat.body.setOffset(0, 30);
        this.boat.body.setCollideWorldBounds(true);

        // Solid collision on all relevant sides (top for player, bottom/sides for fish)
        this.boat.body.checkCollision.up = true;
        this.boat.body.checkCollision.down = true;
        this.boat.body.checkCollision.left = true;
        this.boat.body.checkCollision.right = true;

        // Add Boat Decorations (Physics-enabled for visualization)
        this.fishbowl = this.physics.add.sprite(0, 0, "fishbowl");
        this.fishbowl.setOrigin(0.5, 1);
        this.fishbowl.setDisplaySize(40, 40);
        this.fishbowl.setDepth(10);
        this.fishbowl.body.setAllowGravity(false);

        this.blackDuck = this.physics.add.sprite(0, 0, "black_duck");
        this.blackDuck.setOrigin(0.5, 1);
        this.blackDuck.setDisplaySize(24, 24);
        this.blackDuck.setDepth(10);
        this.blackDuck.body.setAllowGravity(false);

        this.updateBoatVisuals();

        // Spawn player high enough so they don't intersect the boat on initialization
        this.player = new Player(this, 100, GameConfig.World.WATER_LEVEL - 400);
        this.player.setDepth(10); // Consistently between boat layers
        this.physics.add.collider(this.player, this.boat);

        // Add Fish-Boat collision so fish hit the hull from below/sides
        if (this.fishManager && this.fishManager.fishes) {
            this.physics.add.collider(this.fishManager.fishes, this.boat);
        }

        // Track if camera should intentionally detach horizontally
        // Start completely detached from startFollow, we will handle horizontal manually
        this.cameras.main.stopFollow();
        this.isCameraDetached = false;

        // Debug Toggle State
        this.physics.world.drawDebug = false;
        if (this.physics.world.debugGraphic) {
            this.physics.world.debugGraphic.setVisible(false);
        }

        this.selectedDebugObject = null;
        this.dragHandle = null;
        this.dragStart = { x: 0, y: 0 };
        this.initialBody = { x: 0, y: 0, w: 0, h: 0, ox: 0, oy: 0 };

        // Setup Object Inspector (Debug Text)
        this.debugText = this.add.text(VIEW_W - 10, VIEW_H - 10, "", {
            fontSize: "14px",
            fill: "#00ff00",
            backgroundColor: "#000000cc",
            padding: { x: 10, y: 10 },
            align: 'right'
        })
            .setOrigin(1, 1) // Anchor to bottom-right
            .setScrollFactor(0)
            .setDepth(DEPTH.UI + 50)
            .setVisible(false); // Hide by default to prevent "black box" issue

        // Make debug text interactive for "Scrubbing" values
        this.debugText.setInteractive();
        this.debugText.on('pointerdown', (pointer) => {
            if (!this.selectedDebugObject) return;

            // Determine which line was clicked
            const textTop = VIEW_H - 10 - this.debugText.height;
            const localY = pointer.y - textTop;
            const lineH = this.debugText.height / 4;

            if (localY >= lineH && localY < lineH * 2) {
                this.dragHandle = 'scrubW';
            } else if (localY >= lineH * 2 && localY < lineH * 3) {
                this.dragHandle = 'scrubOX';
            } else {
                return;
            }

            const body = this.selectedDebugObject.body;
            this.dragStart = { x: pointer.x, y: pointer.y };
            this.initialBody = {
                w: body.width,
                h: body.height,
                ox: body.offset.x,
                oy: body.offset.y
            };
        });

        const setupInspector = (obj, name) => {
            obj.setInteractive();
            obj.on('pointerdown', (pointer) => {
                if (!this.physics.world.drawDebug) return;

                // If clicking an object, select it for editing
                this.selectedDebugObject = obj;
                this.soundManager.play("click");

                const body = obj.body;
                this.debugText.setText(
                    `[${name}]\n` +
                    `Hitbox: ${body.width.toFixed(1)}x${body.height.toFixed(1)} (Drag to Scrub)\n` +
                    `Offset: ${body.offset.x.toFixed(1)}, ${body.offset.y.toFixed(1)} (Drag to Scrub)\n` +
                    `Image: ${obj.displayWidth.toFixed(1)}x${obj.displayHeight.toFixed(1)}`
                );
            });
        };

        setupInspector(this.boat, "BOAT");
        setupInspector(this.player, "PLAYER");
        setupInspector(this.fishbowl, "FISHBOWL");
        setupInspector(this.blackDuck, "DUCK");

        // 3. Inputs
        this.keys = this.input.keyboard.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D,
            Q: Phaser.Input.Keyboard.KeyCodes.Q,
            E: Phaser.Input.Keyboard.KeyCodes.E,
            SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
            R: Phaser.Input.Keyboard.KeyCodes.R,
            OPEN_BRACKET: Phaser.Input.Keyboard.KeyCodes.OPEN_BRACKET,
            CLOSED_BRACKET: Phaser.Input.Keyboard.KeyCodes.CLOSED_BRACKET,
            ZERO: Phaser.Input.Keyboard.KeyCodes.ZERO,
            I: Phaser.Input.Keyboard.KeyCodes.I,
            G: Phaser.Input.Keyboard.KeyCodes.G,
            U: Phaser.Input.Keyboard.KeyCodes.U,
            NINE: Phaser.Input.Keyboard.KeyCodes.NINE,
            T: Phaser.Input.Keyboard.KeyCodes.T,
            PLUS: Phaser.Input.Keyboard.KeyCodes.PLUS,
            MINUS: Phaser.Input.Keyboard.KeyCodes.MINUS,
            NUMPAD_ADD: Phaser.Input.Keyboard.KeyCodes.NUMPAD_ADD,
            NUMPAD_SUBTRACT: Phaser.Input.Keyboard.KeyCodes.NUMPAD_SUBTRACT,
            H: Phaser.Input.Keyboard.KeyCodes.H
        });

        // Listen for upgrades to trigger immediate save or visual updates
        this.events.on("boat-upgraded", (stat) => {
            console.log(`[Event] Boat Upgraded: ${stat}`);
            this.saveManager.save(this.gameState);
        });

        // Cheat Event Listeners
        this.events.on("cheat-money", () => {
            this.money += 1000;
            this.effectManager.showFloatingText(this.player.x, this.player.y - 100, "CASH +$1000!", "#00ff00");
            this.saveManager.save(this.gameState);
        });

        this.events.on("cheat-items", () => {
            const allFish = this.dataManager.getAllFish();
            allFish.forEach(f => {
                this.gameState.addItem(f.component, 10);
            });
            this.effectManager.showFloatingText(this.player.x, this.player.y - 120, "ALL ITEMS x10!", "#bc13fe");
            this.saveManager.save(this.gameState);
        });

        this.events.on("cheat-fish", () => {
            const allFish = this.dataManager.getAllFish();
            allFish.forEach(f => {
                this.gameState.discoverFish(f.id);
            });
            this.effectManager.showFloatingText(this.player.x, this.player.y - 140, "ENCYCLOPEDIA COMPLETE!", "#bc13fe");
            this.saveManager.save(this.gameState);
        });

        this.events.on("cheat-upgrade", () => {
            ["speed", "armor", "light", "radResist"].forEach(stat => {
                for (let i = 0; i < 5; i++) { // Max level roughly 5
                    this.gameState.upgradeBoat(stat);
                }
            });
            this.updateBoatVisuals();
            this.effectManager.showFloatingText(this.player.x, this.player.y - 160, "BOAT MAXED OUT!", "#bc13fe");
            this.saveManager.save(this.gameState);
        });

        this.events.on("cheat-pet", () => {
            this.gameState.pet.friendship = 1000;
            this.effectManager.showFloatingText(this.player.x, this.player.y - 180, "MAX PET LOVE! ❤️", "#ff00ff");
            this.saveManager.save(this.gameState);
        });

        // 4. Game State Initial UI
        this.bobber = null;
        this.graphics = this.add.graphics();
        this.editorGraphics = this.add.graphics().setDepth(DEPTH.UI + 100);
        this.uiManager.update({ depth: 0, fish: 0, money: 0, time: 0, buoyancy: undefined, weight: undefined, returnSpeed: undefined });

        // 5. Dynamic Camera Zoom Config
        this.baseZoom = 1.0;
        this.targetZoom = 1.0;
        this.currentZoom = 1.0;

        // Mouse Wheel for manual zoom adjustment
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (deltaY > 0) {
                this.baseZoom = Phaser.Math.Clamp(this.baseZoom - 0.1, 0.4, 3.0);
            } else {
                this.baseZoom = Phaser.Math.Clamp(this.baseZoom + 0.1, 0.4, 3.0);
            }
        });

        // 6. Final Camera Alignment to prevent blackout
        // Use centerOn for robust initial alignment
        this.cameras.main.centerOn(this.boat.x, GameConfig.World.WATER_LEVEL);
        this.cameras.main.setZoom(this.currentZoom || 1.0);
    }

    drawHitboxEditor() {
        this.editorGraphics.clear();
        if (!this.physics.world.drawDebug || !this.selectedDebugObject || !this.selectedDebugObject.body) {
            if (this.debugText) this.debugText.setVisible(false);
            return;
        }

        const obj = this.selectedDebugObject;
        const body = obj.body;
        const cam = this.cameras.main;

        // Hitbox world bounds
        const hx = body.x;
        const hy = body.y;
        const hw = body.width;
        const hh = body.height;

        // Draw Highlighted Hitbox
        this.editorGraphics.lineStyle(3 / cam.zoom, 0xffff00, 0.8);
        this.editorGraphics.strokeRect(hx, hy, hw, hh);

        // Draw Resize Handles (8 points)
        const handleSize = 8 / cam.zoom;
        const resizePoints = [
            { id: 'tl', x: hx, y: hy }, { id: 'tm', x: hx + hw / 2, y: hy }, { id: 'tr', x: hx + hw, y: hy },
            { id: 'ml', x: hx, y: hy + hh / 2 }, { id: 'mr', x: hx + hw, y: hy + hh / 2 },
            { id: 'bl', x: hx, y: hy + hh }, { id: 'bm', x: hx + hw / 2, y: hy + hh }, { id: 'br', x: hx + hw, y: hy + hh }
        ];

        this.editorGraphics.fillStyle(0xffffff, 1);
        this.editorGraphics.lineStyle(1 / cam.zoom, 0x000000, 1);
        resizePoints.forEach(p => {
            this.editorGraphics.fillRect(p.x - handleSize / 2, p.y - handleSize / 2, handleSize, handleSize);
            this.editorGraphics.strokeRect(p.x - handleSize / 2, p.y - handleSize / 2, handleSize, handleSize);
        });

        // Draw Center Move Handle
        const moveX = hx + hw / 2;
        const moveY = hy + hh / 2;
        this.editorGraphics.lineStyle(2 / cam.zoom, 0x0000ff, 1);
        this.editorGraphics.strokeCircle(moveX, moveY, handleSize);
        this.editorGraphics.fillCircle(moveX, moveY, handleSize);

        // Add a small cross inside the circle
        const crossSize = handleSize * 0.7;
        this.editorGraphics.lineStyle(1 / cam.zoom, 0xffffff, 1);
        this.editorGraphics.lineBetween(moveX - crossSize, moveY, moveX + crossSize, moveY);
        this.editorGraphics.lineBetween(moveX, moveY - crossSize, moveX, moveY + crossSize);

        // Show Debug Text only when an object is being edited
        this.debugText.setVisible(true);
        this.debugText.setText(
            `${obj.texture?.key || 'Object'}\n` +
            `HITBOX: ${hw} x ${hh}\n` +
            `OFFSET: ${body.offset.x.toFixed(1)}, ${body.offset.y.toFixed(1)}\n` +
            `PRESS 'S' TO SAVE`
        );

        // If 'S' key is pressed while an object is selected, log its current state
        if (Phaser.Input.Keyboard.JustDown(this.keys.S)) {
            const name = this.getObjectName(obj);
            const w = body.width.toFixed(1);
            const h = body.height.toFixed(1);
            const ox = body.offset.x.toFixed(1);
            const oy = body.offset.y.toFixed(1);

            const code = `this.${name}.body.setSize(${w}, ${h}, false).setOffset(${ox}, ${oy});`;
            const syncData = JSON.stringify({ type: "HITBOX", name, w, h, ox, oy });

            console.log("!!DATA_SYNC!! " + syncData);
            window.prompt("Hitbox data generated! Copy this and paste to the AI assistant:", code);
            this.soundManager.play("splash");
        }
    }

    getObjectName(obj) {
        if (obj === this.boat) return "boat";
        if (obj === this.player) return "player";
        if (obj === this.fishbowl) return "fishbowl";
        if (obj === this.blackDuck) return "blackDuck";
        return "unknown";
    }

    updateBoatVisuals() {
        if (!this.boat) return;
        const boatCfg = GameConfig.Boat.LEVELS[this.boatLevel];
        this.boat.setDisplaySize(boatCfg.width, boatCfg.height);

        // Sink the boat further into the water (+25 offset for better visual depth)
        // And apply a bobbing effect using sine wave
        // Skip bobbing if debug mode is active to keep everything stable for editing
        const isPaused = this.physics.world.drawDebug;
        const bobAmount = isPaused ? 0 : Math.sin(this.boatBobTime) * 5;
        const swayAmount = isPaused ? 0 : Math.sin(this.boatBobTime * 0.5) * 2;

        const baseY = GameConfig.World.WATER_LEVEL - (boatCfg.height / 2) + 25;
        this.boat.y = baseY + bobAmount;
        this.boat.angle = swayAmount;

        const flip = this.boat.flipX ? -1 : 1;

        if (this.boatFront) {
            this.boatFront.x = this.boat.x;
            this.boatFront.y = this.boat.y;
            this.boatFront.angle = this.boat.angle;
            this.boatFront.setFlipX(this.boat.flipX);

            // Use actual texture dimensions for absolute precision
            const tex = this.boatFront.texture.getSourceImage();
            this.boatFront.setCrop(0, tex.height / 2, tex.width, tex.height / 2);
        }

        const decoOffset = boatCfg.decoOffset;
        // Adjusted deck position to match the actual physical top of the hitbox (offset 30)
        const boatTop = this.boat.y - (this.boat.displayHeight / 2) + 30;

        if (this.fishbowl) {
            this.fishbowl.x = this.boat.x - (decoOffset * flip);
            this.fishbowl.y = boatTop + 5; // Lowered by 5px to stick better to deck
            this.fishbowl.angle = this.boat.angle;
            this.fishbowl.setFlipX(this.boat.flipX);
        }
        if (this.blackDuck) {
            this.blackDuck.x = this.boat.x + (decoOffset * flip);
            this.blackDuck.y = boatTop;
            this.blackDuck.angle = this.boat.angle;
            this.blackDuck.setFlipX(this.boat.flipX);
        }
    }

    updateCameraZoom(delta) {
        if (!this.boat || !this.player) return;

        // Dynamic target calculation based on boat velocity
        const speed = Math.abs(this.boat.body.velocity.x);
        const maxSpeed = 300; // Typical max boat speed
        const moveFactor = Phaser.Math.Clamp(speed / maxSpeed, 0, 1);
        const movementZoomFactor = Phaser.Math.Interpolation.Linear([1.0, 0.8], moveFactor);

        // If casting, focus more (1.1x of base)
        let stateZoomFactor = 1.0;
        if (this.state === "CASTING" || this.state === "WAITING") {
            stateZoomFactor = 1.1;
        }

        const rawTarget = (this.baseZoom || 1.0) * movementZoomFactor * stateZoomFactor;
        this.targetZoom = Phaser.Math.Clamp(rawTarget, 0.4, 3.0);

        // Smoothly interpolate current zoom toward target
        // Kingdom: Two Crowns style smoothness
        const lerpFactor = 0.002 * delta;
        this.currentZoom = Phaser.Math.Linear(this.currentZoom, this.targetZoom, Phaser.Math.Clamp(lerpFactor, 0, 1));

        // Safety check for NaN or extreme values
        if (isNaN(this.currentZoom) || this.currentZoom <= 0) {
            this.currentZoom = 1.0;
        }

        this.cameras.main.setZoom(this.currentZoom);
    }

    update(time, delta) {
        if (this.finished) return;

        this.handleInput(delta);
        this.updateCameraZoom(delta);
        this.fishManager.update(time, delta);

        // UI Update
        if (this.uiManager) {
            const depth = (this.bobber && this.bobber.active && this.bobber.y > GameConfig.World.WATER_LEVEL)
                ? (this.bobber.y - GameConfig.World.WATER_LEVEL) / 10
                : 0;

            // Calculate 24h Game Time based on worldTime (0.0 = 06:00 AM)
            const gameTimeTotalHours = (this.worldTime * 24 + 6) % 24;
            const hours = Math.floor(gameTimeTotalHours);
            const minutes = Math.floor((gameTimeTotalHours - hours) * 60);

            this.uiManager.update({
                depth: depth,
                fish: this.fishCaught,
                money: this.money,
                gameTime: { hours, minutes },
                buoyancy: this.bobber && this.bobber.active ? this.bobber.buoyancyK : undefined,
                weight: this.bobber && this.bobber.active ? this.bobber.sinkWeight : undefined,
                returnSpeed: this.bobber && this.bobber.active ? this.bobber.returnSpeed : undefined,
                recentCatches: this.gameState.recentCatches
            });
        }

        // Update boat bobbing timer
        this.boatBobTime += delta * 0.002;

        // Sync decorations with boat
        this.updateBoatVisuals();

        // Draw Interactive Editor if in debug mode
        this.drawHitboxEditor();


        // Bobber Rendering & Buoyancy
        this.graphics.clear();
        if (this.bobber && this.bobber.active) {
            // Let bobber handle its own buoyancy and physics
            this.bobber.isAdjusting = (this.keys.W.isDown || this.keys.S.isDown);
            this.bobber.update(time, delta);

            // Draw Fishing Line (Dynamic based on depth)
            const waterLevel = GameConfig.World.WATER_LEVEL;
            let depth = Math.max(0, this.bobber.y - waterLevel);

            // Base intensity starts from 0.8 and reaches 1.0 (fully opaque)
            // Depth is in pixels, let's say 50m = 500 units in our game (approximation)
            // Every 500 units, we increase intensity
            let depthFactor = Math.min(1.0, depth / 5000); // Maxes out at 500m depth

            let alpha = 0.7 + (depthFactor * 0.3); // Starts at 0.7, goes to 1.0
            let thickness = 2 + (depthFactor * 1.5); // Gets thicker as it goes deeper

            // Color gets "heavier" (slightly darker/bluer as it goes deep into toxic water)
            // Interpolate white (0xffffff) to a darker grayish-blue (0x88bbff)
            let color = Phaser.Display.Color.Interpolate.ColorWithColor(
                Phaser.Display.Color.ValueToColor(0xffffff),
                Phaser.Display.Color.ValueToColor(0xaabbcc),
                100,
                depthFactor * 100
            );
            let finalColor = Phaser.Display.Color.GetColor(color.r, color.g, color.b);

            this.graphics.lineStyle(thickness, finalColor, alpha);
            this.graphics.beginPath();

            let rodX = this.player.x;
            let rodY = this.player.y;
            const offsetsData = this.cache.json.get("player_offsets");
            if (offsetsData && offsetsData.rodOffsets) {
                // Use frame.name to get the actual index even when setFrame() is used manually
                const frameIdx = parseInt(this.player.frame.name) || 0;
                const offset = offsetsData.rodOffsets[frameIdx] || offsetsData.rodOffsets[0];
                // Apply player's current scale to the offset to correctly pin to the visual rod
                rodX = this.player.x + (offset.x * this.player.scaleX * this.player.facing);
                rodY = this.player.y + (offset.y * this.player.scaleY);
            }

            this.graphics.moveTo(rodX, rodY);
            this.graphics.lineTo(this.bobber.x, this.bobber.y);
            this.graphics.strokePath();
        }

        // Camera Management (Vertical only, Horizontal is handled by startFollow)
        const cam = this.cameras.main;
        if (this.state === "WAITING" && this.bobber && this.bobber.active) {
            let targetY = this.bobber.y - cam.height / 2;
            // Prevent NaN
            if (isNaN(targetY)) targetY = cam.scrollY;
            // Clamp strictly to world bounds for Y
            const bounds = cam.getBounds();
            targetY = Phaser.Math.Clamp(targetY, bounds.y, bounds.bottom - cam.height);

            // Temporarily stop vertical follow if we were following the player perfectly
            // But we actually only set startFollow to player, so we just override Y
            cam.scrollY = Phaser.Math.Linear(cam.scrollY, targetY, 0.1);
        } else {
            let resetY = Phaser.Math.Linear(cam.scrollY, 0, 0.1);
            if (isNaN(resetY)) resetY = 0;
            cam.scrollY = resetY;
        }

        // Handle horizontal camera manually for absolute smoothness (Runs unconditionally)
        if (!this.isCameraDetached) {
            // Center specifically on the boat to keep it central during zoom changes
            if (this.boat) {
                const targetX = this.boat.x;

                // Correct formula to keep boat at world center of viewport
                // The world center of a camera with width VIEW_W is always scrollX + VIEW_W/2
                // Zoom scales around that center, but the center world coordinate remains the same.
                const targetScrollX = targetX - (VIEW_W / 2);

                let nextX = Phaser.Math.Linear(cam.scrollX, targetScrollX, 0.1);
                if (isNaN(nextX)) nextX = targetScrollX;
                cam.scrollX = nextX;
            }
        }

        // Draw Charge Bar
        if (this.player && this.player.isCharging) {
            const barWidth = 100;
            const barX = this.player.x - (barWidth / 2);
            const barY = this.player.y - 60;
            this.graphics.fillStyle(0x000000, 1);
            this.graphics.fillRect(barX, barY, barWidth, 10);
            const color = this.player.chargePower > 0.8 ? 0xff0000 : 0xffff00;
            this.graphics.fillStyle(color, 1);
            this.graphics.fillRect(barX + 2, barY + 2, (barWidth - 4) * this.player.chargePower, 6);
        }

        // 8. Visual Environment Updates
        if (this.seaWaves) {
            this.seaWaves.tilePositionX += 0.5;
        }
        if (this.seaWavesFront) {
            this.seaWavesFront.tilePositionX += 0.8; // Faster scroll for parallax effect
        }

        // Update World Time Cycle (sine wave for smooth transition)
        this.worldTime = (time % this.dayDuration) / this.dayDuration;
        const timeRatio = (Math.sin(this.worldTime * Math.PI * 2) + 1) / 2; // 0 (night) to 1 (day)

        if (this.deepSeaOverlay) {
            const cam = this.cameras.main;
            const surfaceScrollY = GameConfig.World.WATER_LEVEL - (VIEW_H / 2);
            const depth = Math.max(0, cam.scrollY - surfaceScrollY);

            // Reaching max darkness at 10000 units (1000m)
            const transitionDist = 10000;
            const depthRatio = Phaser.Math.Clamp(depth / transitionDist, 0, 1);

            // 1. Update Black Overlay Alpha (Subtle darkening)
            this.deepSeaOverlay.setAlpha(depthRatio * 0.95);

            // 2. Sky Color: Interpolate between Day, Night, and Abyss
            // Day: 0x88ccff, Night: 0x000022, Abyss: 0x000000
            const daySky = Phaser.Display.Color.ValueToColor(0x88ccff);
            const nightSky = Phaser.Display.Color.ValueToColor(0x000022);
            const abyssSky = Phaser.Display.Color.ValueToColor(0x000000);

            // First interpolate between day and night based on time
            const timeColor = Phaser.Display.Color.Interpolate.ColorWithColor(nightSky, daySky, 100, timeRatio * 100);
            // Then interpolate toward abyss based on depth
            const finalSkyInterp = Phaser.Display.Color.Interpolate.ColorWithColor(
                timeColor,
                abyssSky,
                100,
                depthRatio * 100
            );
            const finalSkyColor = Phaser.Display.Color.GetColor(finalSkyInterp.r, finalSkyInterp.g, finalSkyInterp.b);

            if (this.skyRect) this.skyRect.setFillStyle(finalSkyColor);

            // 3. Water Color: Independent of time, only depth (Toxic Red -> Abyss Black)
            const waterStart = Phaser.Display.Color.ValueToColor(0x220000);
            const waterEnd = Phaser.Display.Color.ValueToColor(0x000000);
            const waterInterp = Phaser.Display.Color.Interpolate.ColorWithColor(waterStart, waterEnd, 100, depthRatio * 100);
            const finalWaterColor = Phaser.Display.Color.GetColor(waterInterp.r, waterInterp.g, waterInterp.b);

            if (this.waterRect) this.waterRect.setFillStyle(finalWaterColor);

            // 4. Sprite Tints: Affected by both time (at surface) and depth
            // Use white (0xffffff) at day, nightSky (dark blue) at night, toward black at depth
            const tintStart = Phaser.Display.Color.Interpolate.ColorWithColor(nightSky, { r: 255, g: 255, b: 255 }, 100, timeRatio * 100);
            const tintEnd = Phaser.Display.Color.ValueToColor(0x000000);
            const tintInterp = Phaser.Display.Color.Interpolate.ColorWithColor(tintStart, tintEnd, 100, depthRatio * 100);
            const finalTint = Phaser.Display.Color.GetColor(tintInterp.r, tintInterp.g, tintInterp.b);

            if (this.bgFarthest) this.bgFarthest.setTint(finalTint);
            if (this.bgFurther) this.bgFurther.setTint(finalTint);
            if (this.bgFar) this.bgFar.setTint(finalTint);
            if (this.seaWaves) this.seaWaves.setTint(finalTint);
            if (this.seaWavesFront) this.seaWavesFront.setTint(finalTint);

            // Store for UI update
            this.currentEnvDarkness = depthRatio;
        }
    }

    handleInput(delta) {
        const cam = this.cameras.main;
        // 1. Debug Toggle (Key 0)
        if (Phaser.Input.Keyboard.JustDown(this.keys.ZERO)) {
            this.physics.world.drawDebug = !this.physics.world.drawDebug;

            // Sync physics pause/resume with debug mode
            if (this.physics.world.drawDebug) {
                // Ensure debug graphic exists for Phaser's internal use to prevent crash
                if (!this.physics.world.debugGraphic) {
                    this.physics.world.createDebugGraphic();
                }
                this.physics.world.pause();
                console.log("[DEBUG] Physics Paused for Hitbox Editing");
            } else {
                this.physics.world.resume();
                console.log("[DEBUG] Physics Resumed");
            }

            if (this.physics.world.debugGraphic) {
                this.physics.world.debugGraphic.setVisible(this.physics.world.drawDebug);
            }
            if (!this.physics.world.drawDebug) {
                this.debugText.setVisible(false);
                this.debugText.setText("");

                // --- Safe Recovery from Debug Mode ---
                // If player is intersecting with boat, snap them to top to prevent falling through
                const isOverlapping = Phaser.Geom.Intersects.RectangleToRectangle(this.player.body, this.boat.body);
                if (isOverlapping) {
                    // Position player exactly on top of boat's hitbox
                    // Player's Y is centered, so we subtract half height from boat's top
                    this.player.y = this.boat.body.top - (this.player.body.height / 2) - 5;
                    this.player.body.velocity.y = 0;
                    console.log("[DEBUG] Player snapped to boat deck to prevent falling through");
                }
            }
        }

        const space = this.keys.SPACE;
        const pointer = this.input.activePointer;
        // Game inputs (Space or Mouse)
        // If debug mode is active, mouse click is reserved for the editor
        const isMouseAllowed = !this.physics.world.drawDebug;
        const isDown = space.isDown || (isMouseAllowed && pointer.isDown);
        const isJustDown = Phaser.Input.Keyboard.JustDown(space) || (isMouseAllowed && pointer.isDown && (this.time.now - pointer.downTime) < 30);

        // --- Hitbox Editor Dragging ---
        if (this.physics.world.drawDebug && this.selectedDebugObject) {
            const obj = this.selectedDebugObject;
            const body = obj.body;
            const worldX = pointer.worldX;
            const worldY = pointer.worldY;
            const handleSize = 16 / cam.zoom; // Slightly larger hit area for easier grabbing

            // Detect if this is the very first frame of a click
            const isJustPressed = pointer.isDown && !this.wasPointerDown;
            this.wasPointerDown = pointer.isDown;

            if (isJustPressed && !this.dragHandle) {
                // Check if clicking a handle
                const hx = body.x;
                const hy = body.y;
                const hw = body.width;
                const hh = body.height;

                const points = [
                    { id: 'move', x: hx + hw / 2, y: hy + hh / 2 }, // priority check
                    { id: 'tl', x: hx, y: hy }, { id: 'tm', x: hx + hw / 2, y: hy }, { id: 'tr', x: hx + hw, y: hy },
                    { id: 'ml', x: hx, y: hy + hh / 2 }, { id: 'mr', x: hx + hw, y: hy + hh / 2 },
                    { id: 'bl', x: hx, y: hy + hh }, { id: 'bm', x: hx + hw / 2, y: hy + hh }, { id: 'br', x: hx + hw, y: hy + hh }
                ];

                for (let p of points) {
                    if (Math.abs(worldX - p.x) < handleSize && Math.abs(worldY - p.y) < handleSize) {
                        this.dragHandle = p.id;
                        this.dragStart = { x: worldX, y: worldY };
                        this.initialBody = {
                            w: body.width,
                            h: body.height,
                            ox: body.offset.x,
                            oy: body.offset.y
                        };
                        return; // Done for this frame
                    }
                }
            } else if (this.dragHandle && pointer.isDown) {
                const dx = (worldX - this.dragStart.x);
                const dy = (worldY - this.dragStart.y);

                // Apply a more generous drag threshold (5px / zoom) to prevent accidental snaps on just clicking
                const dragThreshold = 5 / cam.zoom;
                if (!this.isActuallyDragging) {
                    if (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold) {
                        this.isActuallyDragging = true;
                    } else {
                        return; // Not dragging yet
                    }
                }

                // Calculate NEW values based on delta from start, rounded for extreme stability
                let newW = this.initialBody.w;
                let newH = this.initialBody.h;
                let newOX = this.initialBody.ox;
                let newOY = this.initialBody.oy;

                if (this.dragHandle === 'move') {
                    newOX = this.initialBody.ox + dx;
                    newOY = this.initialBody.oy + dy;
                } else if (this.dragHandle === 'scrubW') {
                    newW = this.initialBody.w + Math.round(dx / 2);
                    newH = this.initialBody.h + Math.round(dy / 2);
                } else if (this.dragHandle === 'scrubOX') {
                    newOX = this.initialBody.ox + Math.round(dx / 2);
                    newOY = this.initialBody.oy + Math.round(dy / 2);
                } else {
                    // Fix: Use absolute calculation from initialBody instead of += to prevent shrinking
                    if (this.dragHandle.includes('r')) newW = this.initialBody.w + dx;
                    if (this.dragHandle.includes('b')) newH = this.initialBody.h + dy;
                    if (this.dragHandle.includes('l')) {
                        const moveX = Math.min(dx, this.initialBody.w - 1);
                        newW = this.initialBody.w - moveX;
                        newOX = this.initialBody.ox + moveX;
                    }
                    if (this.dragHandle.includes('t')) {
                        const moveY = Math.min(dy, this.initialBody.h - 1);
                        newH = this.initialBody.h - moveY;
                        newOY = this.initialBody.oy + moveY;
                    }
                }

                // Clamp and Round to 1 decimal place for precision
                newW = Math.max(0.1, Math.round(newW * 10) / 10);
                newH = Math.max(0.1, Math.round(newH * 10) / 10);
                newOX = Math.round(newOX * 10) / 10;
                newOY = Math.round(newOY * 10) / 10;

                // Only apply if the values have actually changed
                if (newW !== body.width || newH !== body.height || newOX !== body.offset.x || newOY !== body.offset.y) {
                    body.setSize(newW, newH, false);
                    body.setOffset(newOX, newOY);

                    // If it's the player, sync baseOffsetX/Y to prevent reverting on frame flips
                    if (obj === this.player) {
                        if (obj.flipX) {
                            obj.baseOffsetX = newOX;
                        } else {
                            // mirroredX = width - body.width - baseOffsetX
                            // baseOffsetX = width - body.width - mirroredX
                            obj.baseOffsetX = obj.width - body.width - newOX;
                        }
                        obj.baseOffsetY = newOY;
                    }
                }

                // Update debug text with 1 decimal place
                this.debugText.setText(
                    `[EDITING: ${this.getObjectName(obj)}]\n` +
                    `Hitbox: ${body.width.toFixed(1)}x${body.height.toFixed(1)} (Drag to Scrub)\n` +
                    `Offset: ${body.offset.x.toFixed(1)}, ${body.offset.y.toFixed(1)} (Drag to Scrub)\n` +
                    `PRESS 'S' TO SAVE`
                );
                return;
            } else {
                this.dragHandle = null;
                this.isActuallyDragging = false;
            }
        } else {
            this.wasPointerDown = pointer.isDown;
        }

        if (this.state === "IDLE") {
            // Check for Menu Toggles
            if (Phaser.Input.Keyboard.JustDown(this.keys.I)) {
                this.uiManager.toggleInventory(this.gameState, this.dataManager);
                return;
            }
            if (Phaser.Input.Keyboard.JustDown(this.keys.G)) {
                this.uiManager.toggleEncyclopedia(this.gameState, this.dataManager);
                return;
            }
            if (Phaser.Input.Keyboard.JustDown(this.keys.U)) {
                this.uiManager.toggleUpgrade(this.gameState, this.dataManager);
                return;
            }
            if (Phaser.Input.Keyboard.JustDown(this.keys.NINE)) {
                this.uiManager.toggleCheatMenu();
                return;
            }
            if (Phaser.Input.Keyboard.JustDown(this.keys.T)) {
                this.uiManager.toggleTank(this.gameState, this.dataManager);
                return;
            }
            if (Phaser.Input.Keyboard.JustDown(this.keys.H)) {
                this.uiManager.toggleHelp();
                return;
            }

            // Keyboard Zoom Controls (+ / -)
            if (this.keys.PLUS.isDown || this.keys.NUMPAD_ADD.isDown) {
                this.baseZoom = Phaser.Math.Clamp(this.baseZoom + 0.01, 0.4, 3.0);
            }
            if (this.keys.MINUS.isDown || this.keys.NUMPAD_SUBTRACT.isDown) {
                this.baseZoom = Phaser.Math.Clamp(this.baseZoom - 0.01, 0.4, 3.0);
            }

            // Prevent casting if any UI overlay is open
            const isAnyMenuOpen = (this.uiManager.inventoryUI && this.uiManager.inventoryUI.style.display === "flex") ||
                (this.uiManager.encyclopediaUI && this.uiManager.encyclopediaUI.style.display === "flex") ||
                (this.uiManager.upgradeUI && this.uiManager.upgradeUI.style.display === "flex") ||
                (this.uiManager.cheatUI && this.uiManager.cheatUI.style.display === "flex") ||
                (this.uiManager.tankUI && this.uiManager.tankUI.style.display === "flex") ||
                (this.uiManager.helpUI && this.uiManager.helpUI.style.display === "flex");
            if (isAnyMenuOpen) return;

            if (isJustDown && (!this.lastReelTime || this.time.now - this.lastReelTime > 300)) {
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
                // Transition to THROWING to play the one-shot animation
                this.state = "THROWING";
                this.pendingPower = this.player.chargePower;

                // Reset player animation flags for the throw sequence
                this.player.throwStartTime = null;
                this.player.bobberReleased = false;

                this.player.isCharging = false;
                this.player.chargePower = 0;
            }
        }
        else if (this.state === "WAITING") {
            if (isJustDown) {
                this.reelBobber();
            }

            // Manual Depth Adjustment (W/S) - Now affects targetDepth for permanent positioning
            if (this.bobber && this.bobber.active) {
                const depthChangeSpeed = 5; // Pixels per frame
                if (this.keys.W.isDown) {
                    // Pull up
                    this.bobber.targetDepth = Math.max(-150, this.bobber.targetDepth - depthChangeSpeed);
                } else if (this.keys.S.isDown) {
                    // Sink down
                    const maxDepthPixels = GameConfig.Rod.MAX_DEPTH * 10;
                    this.bobber.targetDepth = Math.min(maxDepthPixels, this.bobber.targetDepth + depthChangeSpeed);
                }
            }
        }

        if (this.physics.world.drawDebug) {
            this.boat.body.setVelocityX(0);
        } else {
            const baseBoatSpeed = GameConfig.Player.BOAT_SPEED || 150;
            const speedBonus = (this.gameState.upgrades.speed || 0) * 50;
            const boatSpeed = baseBoatSpeed + speedBonus;

            if (this.keys.A.isDown) {
                this.boat.body.setVelocityX(-boatSpeed);
                this.boat.setFlipX(true); // Boat faces left
                if (this.player) {
                    this.player.setFlipX(true);
                    this.player.facing = -1;
                }
                this.isCameraDetached = false; // Reattach intentionally
            } else if (this.keys.D.isDown) {
                this.boat.body.setVelocityX(boatSpeed);
                this.boat.setFlipX(false); // Boat faces right
                if (this.player) {
                    this.player.setFlipX(false);
                    this.player.facing = 1;
                }
                this.isCameraDetached = false; // Reattach intentionally
            } else if (this.keys.Q.isDown) {
                this.isCameraDetached = true; // Detach selectively

                // Bounds check for Q (left edge of visible screen)
                // Account for zoom: visible width from center is (VIEW_W / 2) / zoom
                const zoom = Math.max(0.1, cam.zoom);
                const halfVisibleWidth = (VIEW_W / 2) / zoom;
                const minX = cam.scrollX + (VIEW_W / 2) - halfVisibleWidth + (this.boat.displayWidth / 2);

                if (this.boat.x > minX) {
                    this.boat.body.setVelocityX(-boatSpeed);
                    this.boat.setFlipX(true);
                    if (this.player) {
                        this.player.setFlipX(true);
                        this.player.facing = -1;
                    }
                } else {
                    this.boat.body.setVelocityX(0);
                    this.boat.x = minX;
                }
            } else if (this.keys.E.isDown) {
                this.isCameraDetached = true; // Detach selectively

                // Bounds check for E (right edge of visible screen)
                const zoom = Math.max(0.1, cam.zoom);
                const halfVisibleWidth = (VIEW_W / 2) / zoom;
                const maxX = cam.scrollX + (VIEW_W / 2) + halfVisibleWidth - (this.boat.displayWidth / 2);

                if (this.boat.x < maxX) {
                    this.boat.body.setVelocityX(boatSpeed);
                    this.boat.setFlipX(false);
                    if (this.player) {
                        this.player.setFlipX(false);
                        this.player.facing = 1;
                    }
                } else {
                    this.boat.body.setVelocityX(0);
                    this.boat.x = maxX;
                }
            } else {
                // No manual input
                this.boat.body.setVelocityX(0);

                // Very slow auto-return mechanism: Move bobber toward boat if it's off-screen
                if (this.bobber && this.bobber.active) {
                    const margin = 20; // Wait until it's off-screen

                    // Detect if it flew off screen to start returning
                    if (!this.bobber.isReturning) {
                        if (this.bobber.x < cam.scrollX - margin || this.bobber.x > cam.scrollX + VIEW_W + margin) {
                            this.bobber.isReturning = true;
                        }
                    }

                    if (this.bobber.isReturning) {
                        // Slowly pull the bobber back under the boat using the dynamic returnSpeed
                        this.bobber.x = Phaser.Math.Linear(this.bobber.x, this.boat.x, this.bobber.returnSpeed);
                        // Dampen existing X momentum heavily 
                        this.bobber.body.setVelocityX(this.bobber.body.velocity.x * 0.8);

                        // Once it is close enough to the boat's center, stop the return mode
                        if (Math.abs(this.bobber.x - this.boat.x) < 5) {
                            this.bobber.x = this.boat.x;
                            this.bobber.isReturning = false;
                        }
                    }
                }
            }

            if (this.input.keyboard.checkDown(this.keys.R, 1000)) {
                this.scene.restart();
            }

            // 5. Buoyancy Test Keys ([ / ])
            if (this.bobber && this.bobber.active) {
                if (Phaser.Input.Keyboard.JustDown(this.keys.OPEN_BRACKET)) {
                    this.bobber.buoyancyK = Math.max(0, this.bobber.buoyancyK - 1);
                    this.effectManager.showFloatingText(this.bobber.x, this.bobber.y - 20, `Buoyancy: ${this.bobber.buoyancyK}`, "#ff4444");
                } else if (Phaser.Input.Keyboard.JustDown(this.keys.CLOSED_BRACKET)) {
                    this.bobber.buoyancyK = Math.min(50, this.bobber.buoyancyK + 1);
                    this.effectManager.showFloatingText(this.bobber.x, this.bobber.y - 20, `Buoyancy: ${this.bobber.buoyancyK}`, "#44ff44");
                }
            }

            // 7. Parallax Background Manual Update
            if (this.bgFarthest) this.bgFarthest.tilePositionX = cam.scrollX * 0.05;
            if (this.bgFurther) this.bgFurther.tilePositionX = cam.scrollX * 0.1;
            if (this.bgFar) this.bgFar.tilePositionX = cam.scrollX * 0.2;

            // 8. Pet Interaction Check
            this.checkPetInteraction();
        }
    }

    checkPetInteraction() {
        if (!this.blackDuck || !this.player) return;

        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.blackDuck.x, this.blackDuck.y);
        const interactDist = 60;

        if (dist < interactDist) {
            if (!this.petPrompt) {
                this.petPrompt = this.add.text(this.blackDuck.x, this.blackDuck.y - 40, "[F] FEED", {
                    fontSize: "16px",
                    fontFamily: "'Press Start 2P', cursive",
                    fill: "#ffffff",
                    backgroundColor: "#000000"
                }).setOrigin(0.5).setDepth(DEPTH.UI);
            }
            this.petPrompt.setPosition(this.blackDuck.x, this.blackDuck.y - 40);
            this.petPrompt.setVisible(true);

            if (Phaser.Input.Keyboard.JustDown(this.keys.F)) {
                this.interactWithPet();
            }
        } else if (this.petPrompt) {
            this.petPrompt.setVisible(false);
        }
    }

    interactWithPet() {
        // Find if we have any GOLDFISH or similar to feed
        // For simplicity, any fish component works as food for now
        const foodId = "MUTANT_SCALE"; // Default food
        if (this.gameState.hasItem(foodId, 1)) {
            this.gameState.removeItem(foodId, 1);
            this.gameState.pet.friendship += 10;

            this.effectManager.showFloatingText(this.blackDuck.x, this.blackDuck.y - 50, "YUM! ❤️", "#ff00ff");
            this.soundManager.play("buy"); // Use buy sound as a placeholder for eating

            console.log(`[Pet] Friendship increased: ${this.gameState.pet.friendship}`);

            // Happy bounce for the duck
            this.tweens.add({
                targets: this.blackDuck,
                y: this.blackDuck.y - 15,
                duration: 100,
                yoyo: true,
                ease: "Sine.easeOut"
            });
        } else {
            this.effectManager.showFloatingText(this.player.x, this.player.y - 50, "NO FOOD!", "#ff4444");
        }
    }
    castBobber(chargeRatio) {
        // Guard against NaN
        const ratio = (isNaN(chargeRatio) || chargeRatio === undefined) ? 0.3 : chargeRatio;

        // Calculate rod tip position for bobber spawn
        let rodX = this.player.x;
        let rodY = this.player.y - 20;
        const offsetsData = this.cache.json.get("player_offsets");
        if (offsetsData && offsetsData.rodOffsets) {
            // Use current frame index for accurate bobber spawn position
            const currentFrameIdx = parseInt(this.player.frame.name) || 0;
            const offset = offsetsData.rodOffsets[currentFrameIdx] || offsetsData.rodOffsets[0];
            rodX = this.player.x + (offset.x * this.player.scaleX * this.player.facing);
            rodY = this.player.y + (offset.y * this.player.scaleY);
        }

        this.bobber = new Bobber(this, rodX, rodY, ratio);
        const basePower = 100;
        const maxPower = GameConfig.Rod.MAX_LENGTH * 0.75;
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
        this.lastReelTime = this.time.now;

        if (this.player) {
            this.player.isCharging = false;
            this.player.chargePower = 0;
            this.player.setFrame(0);
        }

        if (this.bobber) {
            const caughtFish = this.bobber.hookedFish;
            if (caughtFish) {
                this.catchFish(caughtFish);
            }

            this.bobber.hookedFish = null;
            this.bobber.destroy();
            this.bobber = null;
        }
    }

    catchFish(fish) {
        if (!fish || !fish.active) return;

        // 1. Update GameState (Encyclopedia & Inventory)
        const fishInfo = this.dataManager.getFish(fish.typeKey);
        if (fishInfo) {
            const isNew = this.gameState.discoverFish(fish.typeKey);
            if (isNew) {
                console.log(`[Encyclopedia] New Discovery: ${fishInfo.name}`);
                this.effectManager.showFloatingText(this.player.x, this.player.y - 60, "NEW DISCOVERY!", "#ff00ff");
            }

            this.gameState.addItem(fishInfo.component, 1);
            this.gameState.addRecentCatch(fish.typeKey);
            this.effectManager.showFloatingText(this.player.x, this.player.y - 85, `+1 ${fishInfo.componentName}`, "#00ffff");
        }

        // Increment global stats
        this.fishCaught += 1;
        this.money += fish.value;

        const px = this.player.x;
        const py = this.player.y - 40;

        if (this.bobber && this.bobber.hookedFish === fish) {
            this.bobber.hookedFish = null;
        }

        if (this.effectManager) {
            this.effectManager.createSplash(this.bobber ? this.bobber.x : px, GameConfig.World.WATER_LEVEL);
            this.effectManager.createSpark(px, py);
            this.effectManager.showFloatingText(px, py - 10, "+1 FISH", "#00ff00");
            this.effectManager.showFloatingText(px, py - 35, `+$${fish.value}`, "#ffff00");
        }

        if (this.soundManager) {
            this.soundManager.play("splash");
            if (this.cache.audio.exists("buy")) {
                this.soundManager.play("buy");
            }
        }

        this.tweens.add({
            targets: this.player,
            y: this.player.y - 30,
            duration: 150,
            yoyo: true,
            ease: 'Sine.easeOut'
        });

        fish.destroy();
    }
}
