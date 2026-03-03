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
import { languageManager } from "../managers/LanguageManager.js";
import ChromaKeyPipeline from "../pipelines/ChromaKeyPipeline.js";

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
        this.load.spritesheet("fish_sprite", "assets/fish_sprite.png", {
            frameWidth: 32,
            frameHeight: 32
        });
        this.load.image("custom_fish_sprite", "assets/custom_fish_spritesheet.png");
        this.load.json("custom_fish_offsets", "assets/custom_fish_offsets.json");
        this.load.image("bobber_sprite", "assets/bobber_sprite.png");
        this.load.image("boat_sprite", "assets/boat_sprite.png");
        this.load.image("fishbowl", "assets/fishbowl.png");
        this.load.video("fish_tank_video", "assets/fish-tank.mp4", "canplaythrough", true);
        this.load.image("black_duck", "assets/black_duck.png");
        this.load.image("sea_waves", "assets/sea_wave_pattern_1771868267063.png");

        // 3-Layer Parallax Backgrounds
        this.load.image("bg_farthest", "assets/bg_farthest.png");
        this.load.image("bg_further", "assets/bg_further.png");
        this.load.image("bg_far", "assets/bg_far.png");
        this.load.spritesheet("trading_outpost", "assets/trading_boat_hq.png", {
            frameWidth: 300,
            frameHeight: 166
        });

        this.load.spritesheet("debris_scraps", "assets/debris_scraps.png", { frameWidth: 256, frameHeight: 256 });
        this.load.spritesheet("debris_tech", "assets/debris_tech.png", { frameWidth: 512, frameHeight: 512 });
        this.load.spritesheet("debris_bio", "assets/debris_bio.png", { frameWidth: 512, frameHeight: 512 });

        // Suppress "atlas" not found and WebGL errors by loading a fallback
        this.load.spritesheet("atlas", "assets/fish_sprite.png", {
            frameWidth: 32,
            frameHeight: 32
        });
    }

    create(data) {
        this.gameState = gameState;
        this.dataManager = dataManager;

        // Register Chroma Key Pipeline for video background removal
        if (this.renderer.type === Phaser.WEBGL) {
            this.renderer.pipelines.addPostPipeline("ChromaKey", ChromaKeyPipeline);
        }
        this.uiManager = new UIManager(this);
        this.uiManager.setHUDVisible(true);
        this.fishManager = new FishManager(this);
        this.saveManager = new SaveManager(this);
        this.effectManager = new EffectManager(this);
        this.soundManager = new SoundManager(this);

        // Virtual 2D Plane Position (for Map)
        this.virtualMapY = 0; // Surface level
        this.worldMapBounds = { minX: -1000000, maxX: 1000000, minY: -1000000, maxY: 1000000 };

        // Scenario Map Points (Mapping to World Coordinates)
        this.scenarioPoints = {
            "rift": { x: 30000, y: 8000 },
            "seepage": { x: -15000, y: 3000 },
            "filter": { x: 60000, y: 1500 },
            "plant": { x: 90000, y: 6000 }
        };

        this.effectManager.createAnimations();

        // --- Debris System Setup ---
        this.debrisGroup = this.add.group();
        this.setupDebris();

        // 1. World, Water & Parallax Background
        // Base Sky Color (Dark reddish for apocalypse theme)
        // Global Sky/Atmosphere (Centers at screen mid)
        // Global Sky/Atmosphere (Saved as property for color animation)
        // Global Sky/Atmosphere (Bright Blue for Day)
        // Extended upward to support negative virtualMapY (infinite North/Up movement)
        this.skyRect = this.add.rectangle(VIEW_W / 2, -1050000, VIEW_W * 20, 1050000 + GameConfig.World.WATER_LEVEL, 0x88ccff).setOrigin(0.5, 0).setDepth(DEPTH.BG - 1).setScrollFactor(0, 1);

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
        // Massive height to support deep infinite diving
        this.waterRect = this.add.rectangle(VIEW_W / 2, GameConfig.World.WATER_LEVEL, 8000, 2100000, 0x88ccff, 1.0).setOrigin(0.5, 0).setDepth(DEPTH.BG_DECO).setScrollFactor(0, 1);

        // Toxic Sea Waves (Top layer of the water - Background part)
        this.seaWaves = this.add.tileSprite(VIEW_W / 2, GameConfig.World.WATER_LEVEL, 8000, 64, "sea_waves").setOrigin(0.5, 0.5).setDepth(DEPTH.BG_DECO + 1).setScrollFactor(0, 1);
        this.seaWaves.setAlpha(0.8);

        // Toxic Sea Waves (Top layer of the water - Foreground part to cover boat hull)
        this.seaWavesFront = this.add.tileSprite(VIEW_W / 2, GameConfig.World.WATER_LEVEL + 35, 8000, 64, "sea_waves").setOrigin(0.5, 0.5).setDepth(40).setScrollFactor(0, 1);
        this.seaWavesFront.setAlpha(0.6);
        this.seaWavesFront.setScale(1, 0.8); // Slightly flatter for variation

        // Deep Sea Darkness Overlay (Follows camera, darkens as you go deeper)
        // Massive height for infinite diving support
        this.deepSeaOverlay = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, 8000, 2100000, 0x000000, 0).setOrigin(0.5).setDepth(DEPTH.HUD - 1).setScrollFactor(0);


        // 1.6 Trading Outpost (Oil Rig / Atoll) - Dev Version (Nearby)
        this.oilRigPos = { x: -1000, y: 350 };
        this.oilRig = this.add.sprite(this.oilRigPos.x, this.oilRigPos.y, "trading_outpost")
            .setOrigin(0.5, 1).setScale(2.1).setDepth(DEPTH.BG + 3);
        this.oilRig.play("trading-boat-hq-idle");

        // Add Oil Rig to Scenario Points for Minimap/WorldMap
        this.scenarioPoints["outpost"] = { x: this.oilRigPos.x, y: 0 };

        // Armed Guard / NPC Floating Text (Removed static labels, will use proximity dialogue)
        this.oilRigDialogueTriggered = false;
        this.debugScenarioIndex = 0;

        // Adjust World Bounds (Massive expansion for infinite feel)
        const WORLD_SIZE = 2000000; // 2M units
        this.physics.world.setBounds(-WORLD_SIZE / 2, -WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE);
        this.cameras.main.setBounds(-WORLD_SIZE / 2, -2000, WORLD_SIZE, WORLD_SIZE + 2000);

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

        // Add Boat Decorations (Animated Video Fish Tank)
        // Create the video object first, it will be the source of our texture
        const vid = this.add.video(0, 0, "fish_tank_video");
        vid.play(true); // Loop
        vid.setVisible(false); // Hide the source video element

        // Use a sprite to display the video with physics/post-processing
        this.fishbowl = this.physics.add.sprite(this.boat.x, this.boat.y, "fishbowl");
        this.fishbowl.setOrigin(0.5, 1);
        this.fishbowl.setDisplaySize(27, 27); // Reduced to 2/3 of original (40 * 2/3 ≈ 27)
        this.fishbowl.setDepth(5); // Place behind player (10) and boat (20)
        this.fishbowl.body.setAllowGravity(false);

        // Apply Chroma Key to remove white background from video
        if (this.renderer.type === Phaser.WEBGL) {
            this.fishbowl.setPostPipeline("ChromaKey");
        }

        // Link video texture (Wait for video to be ready or force texture)
        if (vid.texture) {
            this.fishbowl.setTexture(vid.texture.key);
        } else {
            // Fallback: update texture on next frame if not ready
            vid.on('play', () => {
                this.fishbowl.setTexture(vid.texture.key);
            });
        }


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
        this.cameras.main.setScroll(this.boat.x - VIEW_W / 2, this.boat.y - VIEW_H / 2);
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
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D,
            Q: Phaser.Input.Keyboard.KeyCodes.Q,
            E: Phaser.Input.Keyboard.KeyCodes.E,
            X: Phaser.Input.Keyboard.KeyCodes.X,
            H: Phaser.Input.Keyboard.KeyCodes.H,
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
            H: Phaser.Input.Keyboard.KeyCodes.H,
            M: Phaser.Input.Keyboard.KeyCodes.M,
            F: Phaser.Input.Keyboard.KeyCodes.F
        });

        // Map Data UI Setup

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

        this.events.on("debug-jump", (id) => {
            this.debugJumpTo(id);
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

        // Initialize virtual map Y position (independent of visual Y)
        this.virtualMapY = 0;
        this.worldMapBounds = {
            minX: -50000,
            maxX: 100000,
            minY: 0,
            maxY: 10000
        };
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

        // Boat is visually fixed at Water Level
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

        // Survival Stats Update
        const isMoving = this.boat && this.boat.body && (Math.abs(this.boat.body.velocity.x) > 10 || Math.abs(this.boat.body.velocity.y) > 10);
        this.gameState.updateSurvivalStats(delta, isMoving);

        if (this.uiManager) {
            const depth = (this.bobber && this.bobber.active && this.bobber.y > GameConfig.World.WATER_LEVEL)
                ? (this.bobber.y - GameConfig.World.WATER_LEVEL) / 10
                : 0;

            const gameTimeTotalHours = (this.worldTime * 24 + 6) % 24;
            const hours = Math.floor(gameTimeTotalHours);
            const minutes = Math.floor((gameTimeTotalHours - hours) * 60);

            this.uiManager.update({
                depth: depth,
                fish: this.gameState.capturedFish.length,
                money: this.gameState.money,
                gameTime: { hours, minutes },
                survival: this.gameState.survival, // Pass survival object for bars
                buoyancy: this.bobber && this.bobber.active ? this.bobber.buoyancyK : undefined,
                weight: this.bobber && this.bobber.active ? this.bobber.sinkWeight : undefined,
                returnSpeed: this.bobber && this.bobber.active ? this.bobber.returnSpeed : undefined,
                recentCatches: this.gameState.recentCatches
            });
        }

        // Update boat bobbing timer
        this.boatBobTime += delta * 0.002;

        // 펫 배고픔 업데이트 (10초당 1 감소)
        if (this.gameState.pet) {
            this.gameState.pet.hunger = Math.max(0, this.gameState.pet.hunger - (0.1 * (delta / 1000)));
        }

        // Check Scenario/Debris Proximity
        this.checkScenarioProximity();
        this.checkDebrisInteraction();
        this.checkPetInteraction(); // 펫 상호작용은 나중에 처리 (우선순위)

        // Oil Rig Bobbing
        if (this.oilRig) {
            const rigBob = Math.sin(this.boatBobTime * 0.5) * 5;
            this.oilRig.y = this.oilRigPos.y + rigBob;

            // Proximity Check for Dialogue
            const distToRig = Phaser.Math.Distance.Between(this.boat.x, this.boat.y, this.oilRig.x, this.oilRig.y);
            if (distToRig < 300 && !this.oilRigDialogueTriggered) {
                this.oilRigDialogueTriggered = true;

                const welcomeText = "무장한 가드가 당신을 겨눕니다: '멈춰라! 용건이 뭐냐, 떠돌이?'";
                const buttons = [
                    {
                        text: "거래를 제안한다",
                        onClick: () => {
                            this.uiManager.toggleShop(this.gameState, this.dataManager);
                        }
                    },
                    {
                        text: "그냥 지나가는 길이다",
                        onClick: () => {
                            // Keep it triggered so it doesn't pop up again immediately
                            this.time.delayedCall(10000, () => { this.oilRigDialogueTriggered = false; });
                        }
                    }
                ];

                this.uiManager.showVNDialogue({
                    portrait: "assets/outpost_guard.png",
                    name: "SGT. IRONCLAD",
                    text: welcomeText,
                    buttons: buttons
                });

                // --- 즉시 정지 ---
                this.boat.body.setVelocityX(0);
                this.steerVelocity = 0;
                this.input.keyboard.resetKeys();
            } else if (distToRig > 500) {
                // Reset trigger if far away
                this.oilRigDialogueTriggered = false;
            }
        }

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
            // Boat stays at water level visually
            let targetY = GameConfig.World.WATER_LEVEL - (cam.height / 2);
            let resetY = Phaser.Math.Linear(cam.scrollY, targetY, 0.1);
            if (isNaN(resetY)) resetY = targetY;
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

        // 십자형(Cross) 캐스팅 게이지 UI -> 'L'자형 순차 게이지
        if (this.player && (this.state === "CASTING" || this.state === "CASTING_POWER")) {
            const centerX = this.player.x + (this.player.facing * 80); // 캐릭터가 바라보는 방향 옆으로 이동
            const centerY = this.player.y - 60; // 캐릭터 옆구리 높이
            const barLength = 80;
            const thickness = 12;

            // 1단계: 가로 바 (Distance - 왼쪽에서 오른쪽으로)
            this.graphics.fillStyle(0x000000, 0.6);
            this.graphics.fillRect(centerX - (barLength / 2), centerY - (thickness / 2), barLength, thickness);

            const distVal = this.state === "CASTING" ? (this.player.chargePower || 0) : (this.pendingDist || 0);
            const distColor = this.state === "CASTING" ? 0xaa00ff : 0x5500aa;
            this.graphics.fillStyle(distColor, 1);

            // 가로 충전 (왼쪽에서 오른쪽으로)
            const fillWidth = (barLength - 2) * distVal;
            this.graphics.fillRect(centerX - (barLength / 2) + 1, centerY - (thickness / 2) + 1, fillWidth, thickness - 2);

            // 2단계: 세로 바 (Power/Depth - 상단에서 하단으로)
            // 가로 바가 끝나는 지점(오른쪽 끝)에서 아래로 이어지도록 배치
            if (this.state === "CASTING_POWER") {
                const verticalStartX = centerX + (barLength / 2) - (thickness / 2);
                const verticalStartY = centerY + (thickness / 2);

                this.graphics.fillStyle(0x000000, 0.6);
                this.graphics.fillRect(verticalStartX, verticalStartY, thickness, barLength);

                const powerVal = this.player.chargePower || 0;
                const powerColor = 0x00ffff; // Cyan
                this.graphics.fillStyle(powerColor, 1);

                // 세로 충전 (위에서 아래로)
                const fillHeight = (barLength - 2) * powerVal;
                this.graphics.fillRect(verticalStartX + 1, verticalStartY + 1, thickness - 2, fillHeight);
            }
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

        if (this.deepSeaOverlay && this.deepSeaOverlay.active) {
            const surfaceScrollY = GameConfig.World.WATER_LEVEL - (VIEW_H / 2);
            const depth = Math.max(0, cam.scrollY - surfaceScrollY);

            // Reaching max darkness at 10000 units (1000m)
            const transitionDist = 10000;
            const depthRatio = Phaser.Math.Clamp(depth / transitionDist, 0, 1);

            // 1. Update Black Overlay Alpha (Surface is clear, getting darker as you sink)
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
            // 4. Sprite Tints: Affected by both time (at surface) and depth
            const tintStart = Phaser.Display.Color.Interpolate.ColorWithColor(nightSky, { r: 255, g: 255, b: 255 }, 100, timeRatio * 100);
            const tintEnd = Phaser.Display.Color.ValueToColor(0x000000);
            const tintInterp = Phaser.Display.Color.Interpolate.ColorWithColor(tintStart, tintEnd, 100, depthRatio * 100);
            const finalTint = Phaser.Display.Color.GetColor(tintInterp.r, tintInterp.g, tintInterp.b);

            if (this.bgFarthest) this.bgFarthest.setTint(finalTint);
            if (this.bgFurther) this.bgFurther.setTint(finalTint);
            if (this.bgFar) this.bgFar.setTint(finalTint);
            if (this.seaWaves) this.seaWaves.setTint(finalTint);
            if (this.seaWavesFront) this.seaWavesFront.setTint(finalTint);

            // [가시성 개선] 보트와 플레이어는 야간/심해에서도 최소한의 밝기 유지 (30% 수준)
            const minBrightness = 77; // 255 * 30% ≈ 77
            const charR = Math.max(tintInterp.r, minBrightness);
            const charG = Math.max(tintInterp.g, minBrightness);
            const charB = Math.max(tintInterp.b, minBrightness);
            const characterTint = Phaser.Display.Color.GetColor(charR, charG, charB);

            if (this.boat) this.boat.setTint(characterTint);
            if (this.player) this.player.setTint(characterTint);

            // Store for UI update
            this.currentEnvDarkness = depthRatio;
        }
    }

    setupDebris() {
        const debrisLocations = [
            // Rift (Scenario 1) 근처 - Bio (Bones)
            { x: 29500, y: 7800, type: "debris_bio", item: "HIGH_DENSITY_BONE", amount: 3, desc: "고밀도 뼈 (Rift용)" },
            { x: 30500, y: 8200, type: "debris_tech", item: "STABILIZER_PART", amount: 1, desc: "안정화 부품" },

            // Seepage (Scenario 2) 근처 - Bio (Scales)
            { x: -14500, y: 2800, type: "debris_bio", item: "ANTI_RAD_SCALE", amount: 5, desc: "항방사선 비늘" },
            { x: -15500, y: 3200, type: "debris_scraps", item: "METAL_SCRAP", amount: 10, desc: "고철" },

            // Filter (Scenario 3) 근처 - Bio (Light cells)
            { x: 59500, y: 1200, type: "debris_bio", item: "LUMINOUS_CELL", amount: 3, desc: "발광 세포" },

            // Plant (Scenario 4) 근처 - Tech
            { x: 89500, y: 5800, type: "debris_tech", item: "TECH_CORE", amount: 1, desc: "테크 코어" },

            // 거래소 근처 (튜토리얼/안내용 고철)
            { x: -1200, y: 0, type: "debris_scraps", item: "METAL_SCRAP", amount: 5, desc: "오염된 고철" },
            { x: -800, y: 0, type: "debris_tech", item: "OLD_SENSOR", amount: 1, desc: "망가진 센서" }
        ];

        debrisLocations.forEach(loc => {
            const sprite = this.add.sprite(loc.x, GameConfig.World.WATER_LEVEL + 20, loc.type);
            // 스프라이트 시트에서 랜덤 프레임 선택 (이미지마다 개수가 다를 수 있으므로 안전하게 처리)
            const frameCount = sprite.texture.frameTotal - 1;
            if (frameCount > 0) {
                sprite.setFrame(Math.floor(Math.random() * frameCount));
            }

            sprite.setDepth(DEPTH.BG_DECO + 2).setScale(0.2).setAlpha(1.0);
            sprite.virtualY = loc.y;
            sprite.itemData = loc;
            this.debrisGroup.add(sprite);

            // 둥둥 떠있는 효과
            this.tweens.add({
                targets: sprite,
                y: sprite.y - 10,
                duration: 2000 + Math.random() * 1000,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });
        });
    }

    checkDebrisInteraction() {
        if (!this.debrisGroup || !this.player) return;

        let nearestDebris = null;
        let minDist = 400; // 수집 가능 거리 확장 (시나리오 트리거와 동일)

        this.debrisGroup.getChildren().forEach(debris => {
            const distX = Math.abs(this.player.x - debris.x);
            const distY = Math.abs(this.virtualMapY - debris.virtualY);
            const dist = Math.sqrt(distX * distX + distY * distY);

            if (dist < minDist) {
                minDist = dist;
                nearestDebris = debris;
            }
        });

        if (nearestDebris) {
            const data = nearestDebris.itemData;
            const t = (k) => languageManager.t(k);

            if (!this.debrisPrompt) {
                this.debrisPrompt = this.add.text(0, 0, "", {
                    fontSize: "14px",
                    fontFamily: "'Press Start 2P', cursive",
                    fill: "#ffffff",
                    backgroundColor: "#000000aa",
                    stroke: "#000000",
                    strokeThickness: 3,
                    padding: { x: 5, y: 5 }
                }).setOrigin(0.5).setDepth(DEPTH.HUD + 10);
            }

            this.debrisPrompt.setText(`[F] ${data.desc} ${t("scavenge") || "수집"}`);
            // 더 잘 보이도록 보트 윗부분에 고정 위치 표시 (화면 중앙 근처)
            this.debrisPrompt.setPosition(this.boat.x, 300);
            this.debrisPrompt.setVisible(true);

            // 디버그 로그 (한 번만 출력되도록)
            if (!this._lastDebrisLogged || this._lastDebrisLogged !== nearestDebris) {
                console.log(`[Debris] Target in range: ${data.item}`);
                this._lastDebrisLogged = nearestDebris;
            }

            if (Phaser.Input.Keyboard.JustDown(this.keys.F)) {
                console.log(`[Debris] Interaction triggered! Collecting: ${data.item}`);
                this.collectDebris(nearestDebris);
            }
        } else {
            if (this.debrisPrompt) this.debrisPrompt.setVisible(false);
            this._lastDebrisLogged = null;
        }
    }

    collectDebris(debris) {
        const data = debris.itemData;
        this.gameState.addItem(data.item, data.amount);

        this.effectManager.showFloatingText(debris.x, 300, `+${data.amount} ${data.item}`, "#ffff00");
        this.soundManager.play("buy"); // 임시 수집 사운드

        // 수집 애니메이션 후 제거
        this.tweens.add({
            targets: debris,
            y: debris.y - 50,
            alpha: 0,
            scale: 0.1,
            duration: 500,
            onComplete: () => {
                debris.destroy();
            }
        });
    }

    checkScenarioProximity() {
        if (!this.scenarioPoints) return;

        // Ensure we handle proximity for each scenario point
        Object.entries(this.scenarioPoints).forEach(([id, pos]) => {
            // Oil Rig(Outpost)는 이미 update()에서 별도로 처리 중이므로 제외하거나 여기서 통합 관리 가능
            if (id === "outpost") return;

            // 월드 좌표 기준 거리 계산 (Y는 virtualMapY 사용)
            const distX = this.boat.x - pos.x;
            const distY = this.virtualMapY - pos.y;
            const distance = Math.sqrt(distX * distX + distY * distY);

            // 트리거 거리 (예: 400px)
            const triggerRange = 400;
            const resetRange = 600;

            const triggerFlag = `scenario_${id}_triggered`;
            if (distance < triggerRange && !this[triggerFlag]) {
                this[triggerFlag] = true;
                this.handleScenarioInteraction(id);

                // 이동 정지 및 입력 리셋
                this.boat.body.setVelocityX(0);
                this.steerVelocity = 0;
                this.input.keyboard.resetKeys();
            } else if (distance > resetRange) {
                this[triggerFlag] = false;
            }
        });
    }

    handleScenarioInteraction(id) {
        let title = "";
        let desc = "";
        let welcomeText = "";
        let buttons = [];

        const upgrades = this.gameState.upgrades;

        switch (id) {
            case "rift":
                title = "시나리오 1: 심해의 지각 균열";
                welcomeText = "거대한 해구에서 맑은 태초의 지하수가 뿜어져 나오고 있습니다. 거센 해류를 견디기 위한 '고밀도 뼈'와 지각을 고정할 '안정화 부품'이 필요합니다.";
                const hasRiftItems = this.gameState.hasItem("HIGH_DENSITY_BONE", 1) && this.gameState.hasItem("STABILIZER_PART", 1);
                desc = hasRiftItems ? "재료가 준비되었습니다. 안정화 장치를 설치하시겠습니까?" : "[필수 재료: 고밀도 뼈 1개, 안정화 부품 1개 필요]";
                if (hasRiftItems) {
                    buttons.push({
                        text: "안정화 장치 설치",
                        onClick: () => {
                            this.gameState.removeItem("HIGH_DENSITY_BONE", 1);
                            this.gameState.removeItem("STABILIZER_PART", 1);
                            this.effectManager.showFloatingText(this.boat.x, this.boat.y - 100, "RIFT STABILIZED!", "#00ff00");
                            this.gameState.setProgress('SEUNG');
                        }
                    });
                }
                break;
            case "seepage":
                title = "시나리오 2: 잊혀진 냉각 시스템";
                welcomeText = "파손된 심해 시설에서 초순수 냉각수가 유출되고 있습니다. 치명적인 방사능을 막아줄 '항방사선 비늘'이 여러 장 필요합니다.";
                const hasSeepageItems = this.gameState.hasItem("ANTI_RAD_SCALE", 3);
                desc = hasSeepageItems ? "비늘 장갑이 준비되었습니다. 수집 장치를 설치할까요?" : "[필수 재료: 항방사선 비늘 3개 필요]";
                if (hasSeepageItems) {
                    buttons.push({
                        text: "수집 장치 가동",
                        onClick: () => {
                            this.gameState.removeItem("ANTI_RAD_SCALE", 3);
                            this.effectManager.showFloatingText(this.boat.x, this.boat.y - 100, "SEEPAGE SECURED!", "#00ffff");
                            this.gameState.setProgress('JEON');
                        }
                    });
                }
                break;
            case "filter":
                title = "시나리오 3: 천연 석회암 필터";
                welcomeText = "어두운 해저 동굴을 밝히고 성소를 찾으려면 심해어의 '발광 세포'가 필요합니다.";
                const hasFilterItems = this.gameState.hasItem("LUMINOUS_CELL", 3);
                desc = hasFilterItems ? "밝은 빛으로 통로를 찾았습니다. 성소를 확보하시겠습니까?" : "[필수 재료: 발광 세포 3개 필요]";
                if (hasFilterItems) {
                    buttons.push({
                        text: "희망의 불꽃 점화",
                        onClick: () => {
                            this.gameState.removeItem("LUMINOUS_CELL", 3);
                            this.effectManager.showFloatingText(this.boat.x, this.boat.y - 100, "FILTER ACTIVATED!", "#ffff00");
                            this.gameState.setProgress('GYEOL');
                        }
                    });
                }
                break;
            case "plant":
                title = "시나리오 4: 유령 담수화 플랜트";
                welcomeText = "자동 방어 시스템을 무력화하고 플랜트를 재가동하려면 고성능 '테크 코어'가 필요합니다.";
                const hasPlantItems = this.gameState.hasItem("TECH_CORE", 1);
                desc = hasPlantItems ? "코어를 삽입하여 시스템을 장악했습니다. 재가동하시겠습니까?" : "[필수 재료: 테크 코어 1개 필요]";
                if (hasPlantItems) {
                    buttons.push({
                        text: "플랜트 재가동",
                        onClick: () => {
                            this.gameState.removeItem("TECH_CORE", 1);
                            this.effectManager.showFloatingText(this.boat.x, this.boat.y - 100, "PLANT REBOOTED!", "#00ff00");
                            this.uiManager.showGameOver(true, this.time.now / 1000, this.fishCaught);
                        }
                    });
                }
                break;
        }

        buttons.push({ text: "돌아가기", onClick: () => { } });

        this.uiManager.showVNDialogue({
            portrait: "assets/outpost_guard.png", // 시나리오용 별도 이미지가 없으면 기본값 사용 또는 생략
            name: title,
            text: welcomeText + "\n\n" + desc,
            buttons: buttons
        });

        console.log(`[Scenario] Triggered: ${id}`);
    }

    handleInput(delta) {
        const isAnyMenuOpen = (this.uiManager.inventoryUI && this.uiManager.inventoryUI.style.display === "flex") ||
            (this.uiManager.encyclopediaUI && this.uiManager.encyclopediaUI.style.display === "flex") ||
            (this.uiManager.upgradeUI && this.uiManager.upgradeUI.style.display === "flex") ||
            (this.uiManager.cheatUI && this.uiManager.cheatUI.style.display === "flex") ||
            (this.uiManager.tankUI && this.uiManager.tankUI.style.display === "flex") ||
            (this.uiManager.helpUI && this.uiManager.helpUI.style.display === "flex") ||
            (this.uiManager.shopUI && this.uiManager.shopUI.style.display === "flex") ||
            (this.uiManager.modal && this.uiManager.modal.style.display === "flex") ||
            (this.uiManager.vnDialogueOverlay && this.uiManager.vnDialogueOverlay.style.display === "flex");

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
            // 2. UI Keys (I, G, U, T, 9, H)
            if (Phaser.Input.Keyboard.JustDown(this.keys.I)) this.uiManager.toggleInventory(this.gameState, this.dataManager);
            if (Phaser.Input.Keyboard.JustDown(this.keys.G)) this.uiManager.toggleEncyclopedia(this.gameState, this.dataManager);
            if (Phaser.Input.Keyboard.JustDown(this.keys.U)) this.uiManager.toggleUpgrade(this.gameState, this.dataManager);
            if (Phaser.Input.Keyboard.JustDown(this.keys.T)) this.uiManager.toggleTank(this.gameState, this.dataManager);
            // Debug Toggle (Show menu only, user chooses jump point)
            if (Phaser.Input.Keyboard.JustDown(this.keys.NINE)) {
                this.uiManager.toggleCheatMenu();
            }
            if (Phaser.Input.Keyboard.JustDown(this.keys.H)) this.uiManager.toggleHelp();
            if (Phaser.Input.Keyboard.JustDown(this.keys.M)) this.uiManager.toggleWorldMap();

            // Keyboard Zoom Controls (+ / -)
            if (this.keys.PLUS.isDown || this.keys.NUMPAD_ADD.isDown) {
                this.baseZoom = Phaser.Math.Clamp(this.baseZoom + 0.01, 0.4, 3.0);
            }
            if (this.keys.MINUS.isDown || this.keys.NUMPAD_SUBTRACT.isDown) {
                this.baseZoom = Phaser.Math.Clamp(this.baseZoom - 0.01, 0.4, 3.0);
            }

            // WORLD MAP은 모달리스로 변경되어 이동 가능하므로 체크에서 제외 (필요 시 추가)
            if (isAnyMenuOpen) return;

            const isMenuCooldown = this.lastMenuCloseTime && (this.time.now - this.lastMenuCloseTime < 200);
            if (isJustDown && !isMenuCooldown && (!this.lastReelTime || this.time.now - this.lastReelTime > 300)) {
                this.state = "CASTING";
                this.player.isCharging = true;
                this.player.chargeStartTime = this.time.now;
            }
        }
        else if (this.state === "CASTING") {
            // Phase 1: Distance
            if (isDown) {
                const duration = this.time.now - this.player.chargeStartTime;
                const t = (duration % 2000) / 1000;
                this.player.chargePower = t > 1 ? 2 - t : t;
            } else {
                // Transition to CASTING_POWER (Phase 2)
                this.state = "CASTING_POWER";
                this.pendingDist = this.player.chargePower;
                this.player.chargePower = 0; // Reset for next phase
                this.lastPhaseEndTime = this.time.now;
                this.player.powerChargeStartTime = this.time.now; // 즉시 자동 진동 시작
                this.player.isChargingPower = true;
            }
        }
        else if (this.state === "CASTING_POWER") {
            // Phase 2: Strength/Depth (자동 진동)
            const duration = this.time.now - this.player.powerChargeStartTime;
            const t = (duration % 2000) / 1000;
            this.player.chargePower = t > 1 ? 2 - t : t;

            // 다시 클릭(Just Down) 시 확정
            if (isJustDown && (this.time.now - this.lastPhaseEndTime > 100)) {
                // Finalize casting
                this.state = "THROWING";
                this.pendingPower = this.player.chargePower;

                this.player.isCharging = false;
                this.player.isChargingPower = false;
                this.player.chargePower = 0;

                // Reset throw animation flags
                this.player.throwStartTime = null;
                this.player.bobberReleased = false;
            } else if (this.time.now - this.lastPhaseEndTime > 10000) {
                // Timeout: Cancel casting if no reaction for 10 seconds
                this.state = "IDLE";
                this.player.isCharging = false;
                this.player.isChargingPower = false;
                this.player.chargePower = 0;
            }
        }
        else if (this.state === "WAITING") {
            if (isJustDown) {
                this.reelBobber();
            }

            // Manual Depth Adjustment (W/S) - Now affects targetDepth for permanent positioning
            if (this.bobber && this.bobber.active) {
                const depthChangeSpeed = GameConfig.Rod.DEPTH_ADJUST_SPEED * (delta / 1000);
                if (this.keys.W.isDown) {
                    // Pull up (Target depth should not go significantly above water level)
                    this.bobber.targetDepth = Math.max(0, this.bobber.targetDepth - depthChangeSpeed);
                } else if (this.keys.S.isDown) {
                    // Sink down
                    const maxDepthPixels = GameConfig.Rod.MAX_DEPTH; // Use config directly
                    this.bobber.targetDepth = Math.min(maxDepthPixels, this.bobber.targetDepth + depthChangeSpeed);
                }
            }
        }

        if (this.physics.world.drawDebug || isAnyMenuOpen) {
            // If debug is on or a menu is open, stop boat movement and reset steering.
            // The boat's X velocity is explicitly set to 0 here to prevent residual movement.
            this.boat.body.setVelocityX(0);
            this.steerVelocity = 0; // Reset steering during menu
            // Note: input.keyboard.resetKeys() can be destructive, avoiding here for better responsiveness
            // this.input.keyboard.resetKeys(); // Removed as per instruction note
        }

        // 4. Boat Control (Free Movement / WASD Mapping)
        // Movement is allowed only if debug is off and no menu is blocking input
        if (!this.physics.world.drawDebug && !isAnyMenuOpen) {
            let boatSpeed = GameConfig.Player.BOAT_SPEED;
            if (this.gameState.upgrades.speed) boatSpeed += this.gameState.upgrades.speed * 30;

            const isFishing = (this.state === "CASTING" || this.state === "THROWING" || this.state === "WAITING" || this.state === "BITE" || this.state === "REELING");

            // --- Horizontal Movement Logic (3 Stages) ---

            // A. [Character Local] Arrows (Left / Right) - Static Camera
            const playerLocalSpeed = 150;
            let playerActiveMove = false;

            if (this.cursors.left.isDown) {
                this.player.body.setVelocityX(-playerLocalSpeed);
                this.player.setFlipX(true);
                this.player.facing = -1;
                playerActiveMove = true;
                this.isCameraDetached = true;
            } else if (this.cursors.right.isDown) {
                this.player.body.setVelocityX(playerLocalSpeed);
                this.player.setFlipX(false);
                this.player.facing = 1;
                playerActiveMove = true;
                this.isCameraDetached = true;
            }

            // B. [Boat Local] Q / E - Static Camera
            const localBoatSpeed = boatSpeed * 0.8;
            let boatLocalMove = false;

            if (this.keys.Q.isDown) {
                this.boat.body.setVelocityX(-localBoatSpeed);
                this.boat.setFlipX(true);
                this.player.setFlipX(true);
                this.player.facing = -1;
                boatLocalMove = true;
                this.isCameraDetached = true;
            } else if (this.keys.E.isDown) {
                this.boat.body.setVelocityX(localBoatSpeed);
                this.boat.setFlipX(false);
                this.player.setFlipX(false);
                this.player.facing = 1;
                boatLocalMove = true;
                this.isCameraDetached = true;
            }

            // C. [Boat World] A / D + W / S Steering - Dynamic Physics Projection
            let boatWorldMove = false;

            // 1. 전진/후진 추진력 계산 (A/D)
            const thrustDir = (this.keys.D.isDown ? 1 : 0) + (this.keys.A.isDown ? -1 : 0);
            const thrust = thrustDir * boatSpeed;

            if (thrustDir !== 0) {
                boatWorldMove = true;
                this.isCameraDetached = false;
            }

            // 2. 조향 및 수직 이동 (W/S) - 독립적 이동 지원 및 추진 시 곡선 주행
            // 낚시 대기/진행 중에는 W/S를 낚시찌 수직 이동에 우선적으로 사용하되, 보트 조향은 약간만 허용
            let steerDir = 0;
            if (!isFishing) {
                steerDir = (this.keys.W.isDown ? -1 : 0) + (this.keys.S.isDown ? 1 : 0);
            } else {
                // 낚시 중에도 보트가 아주 조금씩은 움직일 수 있게 (선택 사항, 여기서는 0.2배로 축소)
                steerDir = ((this.keys.W.isDown ? -1 : 0) + (this.keys.S.isDown ? 1 : 0)) * 0.2;
            }

            if (steerDir !== 0 || thrustDir !== 0) {
                if (this.steerAngle === undefined) this.steerAngle = 0;
                const turnSpeed = 2.5;

                // 추진 중일 때만 각도 변경하여 곡선 구현
                if (thrustDir !== 0) {
                    // 직관적인 조향: W는 항상 위(-Y), S는 항상 아래(+Y) 맵 방향
                    this.steerAngle += steerDir * turnSpeed * (delta / 1000);
                    this.steerAngle = Phaser.Math.Clamp(this.steerAngle, -Math.PI / 3, Math.PI / 3);
                } else {
                    // 정지 중에는 각도 서서히 복구
                    this.steerAngle = Phaser.Math.Linear(this.steerAngle, 0, 0.1);
                }

                // 속도 벡터 계산
                const vx = Math.cos(this.steerAngle) * thrust;
                const baseVerticalSpeed = boatSpeed * 1.2;
                // 추진 중이면 각도에 따른 분속, 정지 중이면 입력을 직접 반영
                const vy = (thrustDir !== 0)
                    ? (Math.sin(this.steerAngle) * Math.abs(thrust) * 1.5)
                    : (steerDir * baseVerticalSpeed);

                this.boat.body.setVelocityX(vx);
                this.steerVelocity = vy;

                // 4. 비주얼 업데이트 (배와 캐릭터 반전)
                if (thrustDir !== 0) {
                    const isLeft = thrust < 0;
                    this.boat.setFlipX(isLeft);
                    this.player.setFlipX(isLeft);
                    this.player.facing = isLeft ? -1 : 1;
                }
            } else {
                // 완전 정지 상태 (Q/E 로컬 이동 중이 아닐 때만 속도 0으로)
                if (!boatLocalMove) {
                    this.boat.body.setVelocityX(0);
                }
                if (this.steerAngle !== undefined) {
                    this.steerAngle = Phaser.Math.Linear(this.steerAngle, 0, 0.05);
                }
                this.steerVelocity = Phaser.Math.Linear(this.steerVelocity || 0, 0, 0.1);
            }

            // [추가] 로컬 이동(Q/E) 화면 끝 제한 (Screen Edge Clamping)
            if (this.isCameraDetached) {
                const cam = this.cameras.main;
                const margin = this.boat.displayWidth / 2;
                const minX = cam.scrollX + margin;
                const maxX = cam.scrollX + VIEW_W - margin;

                if (this.boat.x < minX) {
                    this.boat.x = minX;
                    if (boatLocalMove) this.boat.body.setVelocityX(0);
                } else if (this.boat.x > maxX) {
                    this.boat.x = maxX;
                    if (boatLocalMove) this.boat.body.setVelocityX(0);
                }
            }

            // 보트 위에서 캐릭터의 상대적인 위치 유지 및 이탈 방지
            const deckLimit = 140;
            const diffX = this.player.x - this.boat.x;
            if (Math.abs(diffX) > deckLimit / 2) {
                this.player.x = this.boat.x + (Math.sign(diffX) * deckLimit / 2);
            }

            // Vertical Movement (Map Y - Top-down Depth)
            // Allow massive range for infinite feel (including negative for North/Up movement)
            this.virtualMapY = Phaser.Math.Clamp(this.virtualMapY + (this.steerVelocity || 0) * (delta / 1000), -1000000, 1000000);


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

        // --- 항상 지도 및 미니맵 업데이트 (메뉴가 열려 있을 때도 위치 갱신 유지) ---
        // 이동 방향 각도 계산 (Map 방향용)
        let mapAngle = 0;
        let mapFlipX = this.boat.flipX;

        if (this.boat.body.velocity.x !== 0 || (this.steerVelocity && Math.abs(this.steerVelocity) > 1)) {
            const vx = this.boat.body.velocity.x;
            const vy = this.steerVelocity || 0;
            // 상하 반전 방지를 위해 X속도의 절댓값 사용 (항상 우측 기준의 각도만 구함)
            mapAngle = Math.atan2(vy, Math.abs(vx)) * (180 / Math.PI);
            mapFlipX = vx < 0;
        } else {
            mapAngle = 0;
        }

        this.uiManager.updateMaps(this.boat.x, this.virtualMapY, this.worldMapBounds, mapAngle, mapFlipX);
    }

    checkPetInteraction() {
        if (!this.blackDuck || !this.player) return;

        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.blackDuck.x, this.blackDuck.y);
        const interactDist = 80; // 살짝 거리 완화

        if (dist < interactDist) {
            const feedKey = "F";
            const petKey = "X";
            const t = (k) => languageManager.t(k);

            if (!this.petPrompt) {
                this.petPrompt = this.add.text(this.blackDuck.x, this.blackDuck.y - 50, "", {
                    fontSize: "14px",
                    fontFamily: "'Press Start 2P', cursive",
                    fill: "#ffffff",
                    backgroundColor: "#000000aa",
                    padding: { x: 5, y: 5 }
                }).setOrigin(0.5).setDepth(DEPTH.UI);
            }

            // 펫 상태에 따라 문구 변경 (배고프면 먹이 유도)
            const statusText = this.gameState.pet.hunger < 30 ? `${t("p_hungry")}\n` : "";
            this.petPrompt.setText(`${statusText}[${feedKey}] ${t("p_feed")}  [${petKey}] ${t("p_petting")}`);
            this.petPrompt.setPosition(this.blackDuck.x, this.blackDuck.y - 60);
            this.petPrompt.setVisible(true);

            if (Phaser.Input.Keyboard.JustDown(this.keys.F)) {
                this.interactWithPet();
            } else if (Phaser.Input.Keyboard.JustDown(this.keys.X)) {
                this.petTheDuck();
            }
        } else if (this.petPrompt) {
            this.petPrompt.setVisible(false);
        }
    }

    petTheDuck() {
        const t = (k) => languageManager.t(k);
        const now = this.time.now;

        // 너무 자주 쓰다듬는 거 방지 (3초 쿨다운)
        if (now - (this.gameState.pet.lastInteractionTime || 0) < 3000) {
            this.effectManager.showFloatingText(this.blackDuck.x, this.blackDuck.y - 40, "...", "#ffffff");
            return;
        }

        this.gameState.pet.friendship += 2;
        this.gameState.pet.lastInteractionTime = now;

        this.effectManager.showFloatingText(this.blackDuck.x, this.blackDuck.y - 50, t("p_happy"), "#ff00ff");
        this.soundManager.play("splash"); // 부드러운 소리로 대체 가능

        // 애정 표현 애니메이션 (점프)
        this.tweens.add({
            targets: this.blackDuck,
            y: this.blackDuck.y - 20,
            duration: 150,
            yoyo: true,
            ease: "Back.easeOut"
        });
    }

    interactWithPet() {
        const t = (k) => languageManager.t(k);

        // 먹이 우선순위: 고등어 > 금붕어 > 세슘지느러미 > 전투식량
        const foods = [
            { id: "TOXIC_FIN", points: 20, hunger: 50 },
            { id: "MUTANT_SCALE", points: 10, hunger: 30 },
            { id: "ISOTOPE_BATTERY", points: 5, hunger: 15 },
            { id: "RATIONS", points: 2, hunger: 40 }
        ];

        let selectedFood = foods.find(f => this.gameState.hasItem(f.id, 1));

        if (selectedFood) {
            this.gameState.removeItem(selectedFood.id, 1);
            this.gameState.pet.friendship += selectedFood.points;
            this.gameState.pet.hunger = Math.min(this.gameState.pet.maxHunger, this.gameState.pet.hunger + selectedFood.hunger);

            this.effectManager.showFloatingText(this.blackDuck.x, this.blackDuck.y - 50, "YUM! ❤️", "#ff00ff");
            this.soundManager.play("buy");

            // 회전 애니메이션
            this.tweens.add({
                targets: this.blackDuck,
                angle: 360,
                duration: 500,
                onComplete: () => { this.blackDuck.angle = 0; }
            });

            // 확률적으로 선물 증정 (호감도에 비례)
            if (Math.random() * 100 < (this.gameState.pet.friendship / 10)) {
                this.time.delayedCall(1000, () => {
                    this.effectManager.showFloatingText(this.blackDuck.x, this.blackDuck.y - 40, t("p_gift"), "#ffff00");
                    this.gameState.addItem("FUEL_CELL", 1); // 임시 선물
                });
            }
        } else {
            this.effectManager.showFloatingText(this.player.x, this.player.y - 50, "NO FOOD!", "#ff4444");
        }
    }
    castBobber(distRatio, strengthRatio) {
        console.log(`[CAST] Dist: ${distRatio}, Power: ${strengthRatio}`);
        // Guard against NaN
        const dRatio = (isNaN(distRatio) || distRatio === undefined) ? 0.3 : distRatio;
        const sRatio = (isNaN(strengthRatio) || strengthRatio === undefined) ? 0.3 : strengthRatio;

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

        this.bobber = new Bobber(this, rodX, rodY, dRatio, sRatio);
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
                // 릴을 감아 물고기를 완전히 끌어올리기 전에 정체를 공개
                caughtFish.revealIdentity();
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
            this.uiManager.updateRecentCatchesUI(this.gameState.recentCatches);
            this.effectManager.showFloatingText(this.player.x, this.player.y - 85, `+1 ${fishInfo.componentName}`, "#00ffff");
        }

        // 혹시 모르니 다시 한번 정체 공개 확인
        if (fish.revealIdentity) fish.revealIdentity();

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

    debugJumpTo(id) {
        const pos = this.scenarioPoints[id];
        if (pos) {
            // Teleport Boat and resetting physics
            this.boat.x = pos.x;
            this.boat.body.reset(pos.x, this.boat.y);

            // Teleport Player as well (Sync with boat)
            this.player.x = pos.x;
            if (this.player.body) {
                this.player.body.reset(pos.x, this.player.y);
            }

            this.virtualMapY = pos.y;

            this.effectManager.showFloatingText(pos.x, 300, `JUMPED TO: ${id.toUpperCase()}`, "#ff00ff");
            console.log(`[Debug] Jumped to ${id} at X:${pos.x}, virtualY:${pos.y}`);
        }
    }
}
