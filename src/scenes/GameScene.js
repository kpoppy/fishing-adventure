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

        this.effectManager.createAnimations();

        // 1. World, Water & Parallax Background
        // Base Sky Color (Dark reddish for apocalypse theme)
        this.add.rectangle(0, -5000, VIEW_W * 10, 5000 + GameConfig.World.WATER_LEVEL, 0x220000).setOrigin(0.5, 0).setDepth(DEPTH.BG - 1).setScrollFactor(0);

        // Apocalypse Background Layer (Far)
        // Use TileSprite with a width matching view to avoid WebGL limits
        // Set horizontal scroll factor to 0 so it stays with camera, we'll shift tilePositionX instead
        this.apocBg = this.add.tileSprite(0, GameConfig.World.WATER_LEVEL, VIEW_W, 640, "apocalypse_bg").setOrigin(0, 1).setDepth(DEPTH.BG).setScrollFactor(0, 1.0);
        this.apocBg.setScale(1.0);

        // Apocalypse Near Background Layer (Foreground / Debris)
        this.apocNearBg = this.add.tileSprite(0, GameConfig.World.WATER_LEVEL, VIEW_W, 640, "apocalypse_near_bg").setOrigin(0, 1).setDepth(DEPTH.BG + 1).setScrollFactor(0, 1.0);
        this.apocNearBg.setScale(0.1);

        // Efficient water rectangle: follows camera but stays at water level
        this.add.rectangle(0, GameConfig.World.WATER_LEVEL, VIEW_W, 150000, GameConfig.World.WATER_COLOR, 0.6).setOrigin(0).setDepth(DEPTH.BG_DECO).setScrollFactor(0, 1);

        // Toxic Sea Waves (Top layer of the water - Background part)
        this.seaWaves = this.add.tileSprite(0, GameConfig.World.WATER_LEVEL, VIEW_W, 64, "sea_waves").setOrigin(0, 0.5).setDepth(DEPTH.BG_DECO + 1).setScrollFactor(0, 1);
        this.seaWaves.setAlpha(0.8);

        // Toxic Sea Waves (Top layer of the water - Foreground part to cover boat hull)
        this.seaWavesFront = this.add.tileSprite(0, GameConfig.World.WATER_LEVEL + 35, VIEW_W, 64, "sea_waves").setOrigin(0, 0.5).setDepth(40).setScrollFactor(0, 1);
        this.seaWavesFront.setAlpha(0.6);
        this.seaWavesFront.setScale(1, 0.8); // Slightly flatter for variation

        // Deep Sea Darkness Overlay (Follows camera, darkens as you go deeper)
        this.deepSeaOverlay = this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x000000, 0).setOrigin(0).setDepth(DEPTH.HUD - 5).setScrollFactor(0);

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

        // Setup Object Inspector
        this.debugText = this.add.text(VIEW_W - 10, VIEW_H - 10, "", {
            fontSize: "14px",
            fill: "#00ff00",
            backgroundColor: "#000000cc",
            padding: { x: 10, y: 10 },
            align: 'right'
        })
            .setOrigin(1, 1) // Anchor to bottom-right
            .setScrollFactor(0)
            .setDepth(DEPTH.UI + 50);

        // Make debug text interactive for "Scrubbing" values
        this.debugText.setInteractive();
        this.debugText.on('pointerdown', (pointer) => {
            if (!this.selectedDebugObject) return;

            // Determine which line was clicked
            // Text is bottom-right (Origin 1,1)
            const textTop = VIEW_H - 10 - this.debugText.height;
            const localY = pointer.y - textTop;
            const lineH = this.debugText.height / 4; // Roughly 4 lines: [Name], [Hitbox], [Offset], [Save]

            if (localY >= lineH && localY < lineH * 2) {
                this.dragHandle = 'scrubW'; // Dragging the Hitbox line
            } else if (localY >= lineH * 2 && localY < lineH * 3) {
                this.dragHandle = 'scrubOX'; // Dragging the Offset line
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
            S: Phaser.Input.Keyboard.KeyCodes.S
        });

        // 4. Game State Initial UI
        this.bobber = null;
        this.graphics = this.add.graphics();
        this.editorGraphics = this.add.graphics().setDepth(DEPTH.UI + 100);
        this.uiManager.update({ depth: 0, fish: 0, money: 0, time: 0, buoyancy: undefined, weight: undefined, returnSpeed: undefined });
    }

    drawHitboxEditor() {
        this.editorGraphics.clear();
        if (!this.physics.world.drawDebug || !this.selectedDebugObject || !this.selectedDebugObject.body) return;

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
            { x: hx, y: hy }, { x: hx + hw / 2, y: hy }, { x: hx + hw, y: hy },
            { x: hx, y: hy + hh / 2 }, { x: hx + hw, y: hy + hh / 2 },
            { x: hx, y: hy + hh }, { x: hx + hw / 2, y: hy + hh }, { x: hx + hw, y: hy + hh }
        ];

        this.editorGraphics.fillStyle(0xffffff, 1);
        this.editorGraphics.lineStyle(1 / cam.zoom, 0x000000, 1);
        resizePoints.forEach(p => {
            this.editorGraphics.fillRect(p.x - handleSize / 2, p.y - handleSize / 2, handleSize, handleSize);
            this.editorGraphics.strokeRect(p.x - handleSize / 2, p.y - handleSize / 2, handleSize, handleSize);
        });

        // Draw Center Move Handle (Distinct Style)
        const moveX = hx + hw / 2;
        const moveY = hy + hh / 2;
        this.editorGraphics.lineStyle(2 / cam.zoom, 0x0000ff, 1);
        this.editorGraphics.strokeCircle(moveX, moveY, handleSize);
        this.editorGraphics.fillStyle(0x0000ff, 0.5);
        this.editorGraphics.fillCircle(moveX, moveY, handleSize);

        // Add a small cross inside the circle
        const crossSize = handleSize * 0.7;
        this.editorGraphics.lineStyle(1 / cam.zoom, 0xffffff, 1);
        this.editorGraphics.lineBetween(moveX - crossSize, moveY, moveX + crossSize, moveY);
        this.editorGraphics.lineBetween(moveX, moveY - crossSize, moveX, moveY + crossSize);

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
                buoyancy: this.bobber && this.bobber.active ? this.bobber.buoyancyK : undefined,
                weight: this.bobber && this.bobber.active ? this.bobber.sinkWeight : undefined,
                returnSpeed: this.bobber && this.bobber.active ? this.bobber.returnSpeed : undefined
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

            // Draw Fishing Line
            this.graphics.lineStyle(2, 0xffffff, 0.5);
            this.graphics.beginPath();

            let rodX = this.player.x;
            let rodY = this.player.y;
            const offsetsData = this.cache.json.get("player_offsets");
            if (offsetsData && offsetsData.rodOffsets) {
                const frameIdx = this.player.anims && this.player.anims.currentFrame ? this.player.anims.currentFrame.index - 1 : 0;
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
            // Smoothly lerp camera X to center on the visual midpoint between boat and player
            if (this.boat && this.player) {
                const combinedCenterX = (this.boat.x + this.player.x) / 2;
                const targetScrollX = combinedCenterX - VIEW_W / 2;
                cam.scrollX = Phaser.Math.Linear(cam.scrollX, targetScrollX, 0.015);
            }
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

        // 8. Visual Environment Updates
        if (this.seaWaves) {
            this.seaWaves.tilePositionX += 0.5;
        }
        if (this.seaWavesFront) {
            this.seaWavesFront.tilePositionX += 0.8; // Faster scroll for parallax effect
        }

        if (this.deepSeaOverlay) {
            // Darken as we go deeper. 
            // Let's reach max darkness (0.8 alpha) around 5000 pixels deep for dramatic effect.
            const depth = Math.max(0, cam.scrollY);
            const darkness = Math.min(0.8, depth / 5000);
            this.deepSeaOverlay.setAlpha(darkness);
        }
    }

    handleInput(delta) {
        // 1. Debug Toggle (Key 0) - Check this FIRST so we can always exit debug mode
        if (Phaser.Input.Keyboard.JustDown(this.keys.ZERO)) {
            this.physics.world.drawDebug = !this.physics.world.drawDebug;

            // Sync physics pause/resume with debug mode
            if (this.physics.world.drawDebug) {
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
                this.debugText.setText("");
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
            const cam = this.cameras.main;
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
                        this.bobber.body.setVelocityY(adjSpeed * 2.5); // Increase sink speed heavily to combat buoyancy/damping
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

        if (this.physics.world.drawDebug) {
            this.boat.body.setVelocityX(0);
            // No return here anymore to let ZERO key check pass below (actually we moved ZERO check up, but let's be safe)
        } else {
            const boatSpeed = GameConfig.Player.BOAT_SPEED || 150;
            const cam = this.cameras.main;
            // ... (rest of movement)
        }

        const boatSpeed = GameConfig.Player.BOAT_SPEED || 150;
        const cam = this.cameras.main;

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

            // Bounds check for Q (left edge of screen)
            const minX = cam.scrollX + (this.boat.displayWidth / 2);
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

            // Bounds check for E (right edge of screen)
            const maxX = cam.scrollX + VIEW_W - (this.boat.displayWidth / 2);
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

            // DO NOT reset this.isCameraDetached here. 
            // If they were drifting via Q/E, let them stay detached 
            // until they press A or D.
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

        // 7. Parallax Background Manual Update
        // Shift tilePositionX based on camera scroll for smooth parallax without massive width
        if (this.apocBg) {
            this.apocBg.tilePositionX = cam.scrollX * 0.05;
        }
        if (this.apocNearBg) {
            this.apocNearBg.tilePositionX = cam.scrollX * 0.2;
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
            const offset = offsetsData.rodOffsets[2] || offsetsData.rodOffsets[0]; // Cast frame is frame 2
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
            // First, process the catch if there is a fish
            const caughtFish = this.bobber.hookedFish;
            if (caughtFish) {
                this.catchFish(caughtFish);
            }

            // Explicitly clean up to prevent ghosts
            this.bobber.hookedFish = null;
            this.bobber.destroy();
            this.bobber = null;
        }
    }

    catchFish(fish) {
        if (!fish || !fish.active) return;

        // Increment global stats
        this.fishCaught += 1;
        this.money += fish.value;

        // Visual/Audio effects and cleanup handled after
        const px = this.player.x;
        const py = this.player.y - 40;

        // Explicitly clear bobber reference from fish to avoid "following" during destruction
        if (this.bobber && this.bobber.hookedFish === fish) {
            this.bobber.hookedFish = null;
        }

        if (this.effectManager) {
            // Splash at water surface
            this.effectManager.createSplash(this.bobber.x, GameConfig.World.WATER_LEVEL);

            // Sparkling splash at player
            this.effectManager.createSpark(px, py);

            // Floating text rewards
            this.effectManager.showFloatingText(px, py - 10, "+1 FISH", "#00ff00");
            this.effectManager.showFloatingText(px, py - 35, `+$${fish.value}`, "#ffff00");
        }

        if (this.soundManager) {
            this.soundManager.play("splash");
            // If buy doesn't exist, we can just play coin or splash
            if (this.cache.audio.exists("buy")) {
                this.soundManager.play("buy");
            }
        }

        // Happy bounce animation for the player
        this.tweens.add({
            targets: this.player,
            y: this.player.y - 30, // jump up
            duration: 150,
            yoyo: true,
            ease: 'Sine.easeOut'
        });

        // Finally, destroy the caught fish
        fish.destroy();
    }
}
