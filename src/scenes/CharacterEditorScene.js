import { VIEW_W, VIEW_H } from "../constants.js";

export class CharacterEditorScene extends Phaser.Scene {
    constructor() {
        super("CharacterEditorScene");

        // Data Structures for Editor
        this.frames = []; // Array of Canvas Data or Textures for each frame
        this.rodOffsets = []; // {x, y} for each frame
        this.currentFrameIndex = 0;

        // Target Asset
        this.currentTarget = "PLAYER"; // PLAYER, FISH
        this.targetConfig = {
            "PLAYER": { key: "player_spritesheet_source", frameW: 210, frameH: 200, filename: "custom_player" },
            "FISH": { key: "fish_sprite_source", frameW: 48, frameH: 48, filename: "custom_fish", isSingle: true }
        };

        // Tools
        this.currentTool = "PEN"; // "PEN", "ERASER", "MAGIC_WAND", "ROD", "PAN", "EYEDROPPER", "PAINT_BUCKET", "LINE", "RECTANGLE", "CIRCLE"
        this.brushSize = 1;
        this.brushShape = "SQUARE"; // "SQUARE" or "CIRCLE"
        this.brushColor = { r: 255, g: 0, b: 0, a: 255 }; // Current drawing color

        // WAND settings
        this.tolerance = 30; // 0~442 (max RGB distance)
        this.isGlobalWand = false;
        this.selectedPixels = [];
        this.lastWandClick = null;

        // History (Undo)
        this.undoStack = [];
    }

    preload() {
        // Load base images to use for default loading
        this.load.image("player_spritesheet_source", "assets/player_spritesheet.png");
        this.load.image("fish_sprite_source", "assets/fish_sprite.png");
        this.load.image("boat_sprite_source", "assets/boat_sprite.png");
    }

    create() {
        try {
            this.createCheckerboardBackground();
            this.setupUI();
            this.setupInputHandlers();
            this.cursors = this.input.keyboard.createCursorKeys();
            // Initialize frames from the loaded spritesheet
            this.extractFramesFromSource();

            // Set initial nice zoom level
            this.cameras.main.setZoom(2);
        } catch (e) {
            this.add.text(10, 10, "ERROR IN CREATE: " + e.message, { font: "16px Arial", color: "#ff0000" });
            console.error(e);
        }
    }

    createCheckerboardBackground() {
        this.updateCanvasBackground("CHECKER");
    }

    updateCanvasBackground(type) {
        if (this.checkerboardBg) {
            this.checkerboardBg.destroy();
        }

        const graphics = this.add.graphics();
        const cellSize = 20;
        const cols = Math.ceil(VIEW_W / cellSize);
        const rows = Math.ceil(VIEW_H / cellSize);

        if (type === "CHECKER") {
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const isEven = (x + y) % 2 === 0;
                    graphics.fillStyle(isEven ? 0xdddddd : 0xaaaaaa, 1);
                    graphics.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        } else {
            let color = 0x00ff00; // GREEN
            if (type === "YELLOW") color = 0xffff00;
            if (type === "WHITE") color = 0xffffff;
            if (type === "DARK") color = 0x333333;

            graphics.fillStyle(color, 1);
            graphics.fillRect(0, 0, VIEW_W, VIEW_H);
        }

        const texKey = `editor_bg_${type}`;
        if (!this.textures.exists(texKey)) {
            graphics.generateTexture(texKey, VIEW_W, VIEW_H);
        }
        graphics.destroy();

        this.checkerboardBg = this.add.image(VIEW_W / 2, VIEW_H / 2, texKey).setScrollFactor(0);
        this.checkerboardBg.setDepth(-10); // Ensure it's behind everything
        this.updateStudioVisibility(); // Ensure visible/hidden according to mode
    }

    setupUI() {
        const uiLayer = document.getElementById("ui-layer");
        if (uiLayer) uiLayer.style.display = "none";

        this.createHTMLToolbar();
        this.createHTMLTimeline();
    }

    createHTMLToolbar() {
        if (!document.getElementById("editor-styles")) {
            const style = document.createElement('style');
            style.id = "editor-styles";
            style.innerHTML = `
            #editor-toolbar {
                position: absolute; top: 0; left: 0; width: 150px; height: 100%;
                background-color: #222222; border-right: 2px solid #555;
                display: flex; flex-direction: column; padding: 10px; box-sizing: border-box;
                font-family: Arial, sans-serif; color: white; z-index: 1000;
                overflow-y: auto;
            }
            .tb-sec { margin-bottom: 15px; }
            .tb-title { font-size: 12px; font-weight: bold; color: #aaa; margin-bottom: 8px; text-transform: uppercase; border-bottom: 1px solid #444; padding-bottom: 4px; }
            
            /* Icon Toolbar Grid */
            .tb-tools-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 5px;
                margin-bottom: 10px;
            }
            .tb-icon-btn {
                background: #333; border: 1px solid #555; border-radius: 4px; color: white;
                font-size: 16px; cursor: pointer; transition: 0.2s;
                height: 36px; display: flex; align-items: center; justify-content: center;
            }
            .tb-icon-btn:hover { background: #555; }
            .tb-icon-btn.active { background: #ffcc00; color: #000; border-color: #fff; font-weight: bold; }
            
            .tb-btn {
                width: 100%; padding: 8px; margin-bottom: 5px; background: #333;
                border: 1px solid #555; border-radius: 4px; color: white;
                font-size: 13px; cursor: pointer; transition: 0.2s; text-align: left;
            }
            .tb-btn:hover { background: #555; }
            .tb-label { font-size: 12px; margin-bottom: 4px; display: block; color: #ccc; }
            #editor-info-overlay {
                position: fixed;
                top: 10px;
                right: 230px; /* Left of the toolbar */
                background: rgba(0,0,0,0.6);
                color: #0f0;
                padding: 4px 8px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 11px;
                pointer-events: none;
                z-index: 1000;
                border: 1px solid #444;
            }
        `;
            document.head.appendChild(style);
        }

        // Overlay for filename/info
        const infoOverlay = document.createElement("div");
        infoOverlay.id = "editor-info-overlay";
        infoOverlay.innerText = "File: " + this.workingFilename;
        document.body.appendChild(infoOverlay);

        this.toolbarContainer = document.createElement("div");
        this.toolbarContainer.id = "editor-toolbar";
        this.toolbarContainer.addEventListener('mousedown', (e) => e.stopPropagation());
        this.toolbarContainer.addEventListener('wheel', (e) => e.stopPropagation());

        this.toolbarContainer.innerHTML = `
                <div id="studio-tabs-parent" class="tb-sec">
                    <div id="studio-tabs" style="display:flex; gap:2px; margin-top:10px; border-top:1px solid #444; padding-top:10px;">
                        <button id="tab-char" class="tb-btn active" style="text-align:center; padding:5px 0; flex:1;">👤 Char</button>
                        <button id="tab-eraser" class="tb-btn" style="text-align:center; padding:5px 0; flex:1;">🧹 Eraser</button>
                        <button id="tab-world" class="tb-btn" style="text-align:center; padding:5px 0; flex:1;">🌍 World</button>
                    </div>
                </div>

            <!-- Common Toolbar Grid -->
            <div id="sec-common-tools" class="tb-sec">
                <div class="tb-title">TOOLS</div>
                <div class="tb-tools-grid">
                    <button id="btn-pen" class="tb-icon-btn active" title="Pen (P)">✏️</button>
                    <button id="btn-eraser" class="tb-icon-btn" title="Eraser (E)">🧹</button>
                    <button id="btn-wand" class="tb-icon-btn" title="Magic Wand (W)">🪄</button>

                    <button id="btn-eyedropper" class="tb-icon-btn" title="Eyedropper (I)">🧪</button>
                    <button id="btn-bucket" class="tb-icon-btn" title="Paint Bucket (G)">🪣</button>
                    <button id="btn-rod" class="tb-icon-btn" title="Attach Point (Rod/Mouth) (T)">📍</button>

                    <button id="btn-line" class="tb-icon-btn" title="Line (L)">📏</button>
                    <button id="btn-rect" class="tb-icon-btn" title="Rectangle (R)">🔲</button>
                    <button id="btn-circle" class="tb-icon-btn" title="Circle (C)">⭕</button>

                    <button id="btn-pan" class="tb-icon-btn" title="Pan (Space/Middle Click)">✋</button>
                </div>
            </div>

            <div id="sec-char" class="tb-sec">
                <div class="tb-title">CHARACTER</div>
                <label class="tb-label">Target</label>
                <select id="editor-target" style="width:100%; border-radius:4px; padding:4px; margin-bottom:10px; background:#444; color:white; border:1px solid #666;">
                    <option value="PLAYER">PLAYER</option>
                    <option value="FISH">FISH</option>
                </select>
                <button id="btn-auto-bg" class="tb-btn" style="background:linear-gradient(45deg, #6200ea, #d500f9); text-align:center; font-weight:bold; border:none;" title="Auto Remove Background">✨ Auto BG</button>
            </div>
            <div id="sec-eraser" class="tb-sec" style="display:none;">
                <div class="tb-title">IMAGE ERASER</div>
                <button id="btn-load-eraser-img" class="tb-btn" style="background:#555; text-align:center;">📥 Load Image</button>
                <div id="eraser-tools" style="margin-top:10px;">
                     <button id="btn-eraser-auto" class="tb-btn" style="background:linear-gradient(45deg, #6200ea, #d500f9); text-align:center; font-weight:bold; border:none;">✨ Auto Erase</button>
                </div>
            </div>
            <div id="sec-world" class="tb-sec" style="display:none;">
                <div class="tb-title">WORLD DECOR</div>
                <label class="tb-label">Manage</label>
                <button id="btn-load-world-img" class="tb-btn" style="background:#555; text-align:center; margin-bottom:10px;">📥 Load Decor</button>
                <label class="tb-label">Layer</label>
                <select id="world-layer-select" style="width:100%; padding:4px; background:#333; color:white; border:1px solid #555; border-radius:4px; margin-bottom:10px;">
                    <option value="0">Far Background</option>
                    <option value="1">Near Background</option>
                </select>
                <label class="tb-label">Scale: <span id="layer-scale-val">1.0</span></label>
                <input type="range" id="layer-scale" min="0.1" max="5.0" step="0.1" value="1.0" style="width:100%">
                <label class="tb-label">Scroll X: <span id="layer-scroll-val">0.1</span></label>
                <input type="range" id="layer-scroll" min="0" max="1.0" step="0.01" value="0.1" style="width:100%">
            </div>
            <div class="tb-sec">
                <div class="tb-title">PROPERTIES</div>
                <label class="tb-label">Color</label>
                <input type="color" id="editor-color" value="#ff0000" style="width:100%; height:30px; padding:0; border:none; border-radius:4px; cursor:pointer;" title="Choose Color">
                <label class="tb-label">Size: <span id="size-val">1</span>px</label>
                <input type="range" id="editor-size" min="1" max="10" value="1" style="width:100%" title="Brush Size">
                <label class="tb-label">Shape</label>
                <select id="editor-shape" style="width:100%; border-radius:4px; padding:2px;" title="Brush Shape">
                    <option value="SQUARE">SQUARE</option>
                    <option value="CIRCLE">CIRCLE</option>
                </select>
                <div id="wand-props" style="display:none; margin-top:10px;">
                    <label class="tb-label">Tolerance: <span id="tol-val">30</span></label>
                    <input type="range" id="editor-tol" min="0" max="442" value="30" style="width:100%" title="Color Tolerance">
                    <label class="tb-label" title="Match all pixels of similar color globally"><input type="checkbox" id="editor-global"> Global Match</label>
                    <button id="btn-wand-del" class="tb-btn" style="background:#800080; margin-top:5px; text-align:center;" title="Delete Selected Area">🗑️ Delete Sel.</button>
                </div>
            </div>
            <div class="tb-sec">
                <div class="tb-title">VIEW</div>
                <div style="display:flex; gap:2px; margin-bottom:5px;">
                    <button id="btn-zoom-in" class="tb-btn" style="text-align:center; padding:5px 0;" title="Zoom In">🔍+</button>
                    <button id="btn-zoom-out" class="tb-btn" style="text-align:center; padding:5px 0;" title="Zoom Out">🔍-</button>
                    <button id="btn-zoom-reset" class="tb-btn" style="text-align:center; padding:5px 0;" title="Actual Size">🔳 1:1</button>
                </div>
                <label class="tb-label">Canvas BG</label>
                <select id="editor-bg-select" style="width:100%; border-radius:4px; padding:4px; background:#444; color:white; border:1px solid #666;">
                    <option value="CHECKER">Checkerboard</option>
                    <option value="GREEN">Green Screen</option>
                    <option value="YELLOW">Yellow</option>
                    <option value="WHITE">White</option>
                    <option value="DARK">Dark Gray</option>
                </select>
            </div>
            <div class="tb-sec">
                <div class="tb-title">FILE</div>
                <button id="btn-undo" class="tb-btn" style="text-align:center;" title="Undo (Z)">↩️ Undo</button>
                <div style="display:flex; gap: 5px; margin-top:5px; margin-bottom:5px;">
                    <button id="btn-import-mp4" class="tb-btn" style="background:#005588; text-align:center; padding: 6px 0;" title="Import MP4 Video">🎥 Import MP4</button>
                </div>
                <div style="display:flex; gap: 5px;">
                    <button id="btn-save" class="tb-btn" style="background:#006600; text-align:center; padding: 6px 0;" title="Fast Save">💾 Save</button>
                    <button id="btn-save-as" class="tb-btn" style="background:#006600; text-align:center; padding: 6px 0;" title="Save to specific folder">📂 Save As</button>
                </div>
                <div style="display:flex; gap: 5px; margin-top:5px;">
                    <button id="btn-load-png" class="tb-btn" style="background:#885500; text-align:center; padding: 6px 0;" title="Load Image">📥 Load Image</button>
                    <button id="btn-load-json" class="tb-btn" style="background:#444488; text-align:center; padding: 6px 0;" title="Load JSON Offsets">📄 Load JSON</button>
                </div>
                <button id="btn-exit" class="tb-btn" style="background:#660000; text-align:center; margin-top:5px;" title="Exit Editor">🚪 Exit</button>
                <!-- Hidden video/image/json file inputs -->
                <input type="file" id="video-upload" accept="video/mp4,video/webm" style="display:none;" />
                <input type="file" id="image-upload" accept="image/*" style="display:none;" />
                <input type="file" id="json-upload" accept="application/json" style="display:none;" />
            </div>
        `;
        document.getElementById("game-root").appendChild(this.toolbarContainer);

        const getBtn = (id) => document.getElementById(id);

        // Tab System Logic
        const tabs = ["char", "eraser", "world"];
        const switchTab = (tabId) => {
            tabs.forEach(t => {
                getBtn(`tab-${t}`).classList.toggle("active", t === tabId);
                getBtn(`sec-${t}`).style.display = t === tabId ? "block" : "none";
            });

            const oldMode = this.editorMode;
            this.editorMode = tabId.toUpperCase(); // "CHAR", "ERASER", "WORLD"

            if (this.editorMode === "WORLD") {
                this.setupWorldDecorMode();
                this.updateWorldUI();
            }

            // If switching AWAY from CHAR, we might want to preserve frames? 
            // For now, let's just allow the tools to work on whatever is in this.frames.
            // If they switch to ERASER/WORLD, they usually want to load a new image anyway.

            this.updateStudioVisibility();
            // Resume sound context on user gesture
            if (this.sound.context && this.sound.context.state === 'suspended') {
                this.sound.context.resume();
            }
        };

        getBtn("tab-char").onclick = () => switchTab("char");
        getBtn("tab-eraser").onclick = () => switchTab("eraser");
        getBtn("tab-world").onclick = () => switchTab("world");

        // Character Mode Buttons
        getBtn("btn-pen").onclick = () => this.setTool("PEN");
        getBtn("btn-eraser").onclick = () => this.setTool("ERASER");
        getBtn("btn-wand").onclick = () => this.setTool("MAGIC_WAND");
        getBtn("btn-eyedropper").onclick = () => this.setTool("EYEDROPPER");
        getBtn("btn-bucket").onclick = () => this.setTool("PAINT_BUCKET");
        getBtn("btn-line").onclick = () => this.setTool("LINE");
        getBtn("btn-rect").onclick = () => this.setTool("RECTANGLE");
        getBtn("btn-circle").onclick = () => this.setTool("CIRCLE");
        getBtn("btn-rod").onclick = () => this.setTool("ROD");
        getBtn("btn-pan").onclick = () => this.setTool("PAN");
        getBtn("btn-auto-bg").onclick = () => {
            this.saveUndoState();
            this.autoRemoveBackground();
        };

        // Eraser Mode Buttons
        getBtn("btn-load-eraser-img").onclick = () => {
            this.currentTarget = "ERASER"; // Temporary target for generic images
            this.targetConfig["ERASER"] = { key: null, frameW: 0, frameH: 0, filename: "erased", isSingle: true };
            getBtn("image-upload").click();
        };
        getBtn("btn-eraser-auto").onclick = () => {
            this.saveUndoState();
            this.autoRemoveBackground();
        };

        // World Mode (Decor) Controls
        getBtn("btn-load-world-img").onclick = () => {
            this.currentTarget = "WORLD";
            this.targetConfig["WORLD"] = { key: null, frameW: 0, frameH: 0, filename: "world_decor", isSingle: true };
            getBtn("image-upload").click();
        };
        getBtn("world-layer-select").onchange = (e) => {
            this.worldLayerIndex = parseInt(e.target.value);
            this.updateWorldUI();
        };
        getBtn("layer-scale").oninput = (e) => {
            const val = parseFloat(e.target.value);
            getBtn("layer-scale-val").innerText = val.toFixed(1);
            this.applyWorldChanges("scale", val);
        };
        getBtn("layer-scroll").oninput = (e) => {
            const val = parseFloat(e.target.value);
            getBtn("layer-scroll-val").innerText = val.toFixed(2);
            this.applyWorldChanges("scroll", val);
        };

        const targetSelect = getBtn("editor-target");
        if (targetSelect) {
            targetSelect.onchange = (e) => {
                this.changeTargetAsset(e.target.value);
            };
        }

        getBtn("editor-color").oninput = (e) => {
            const hex = e.target.value;
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            if (result) {
                this.brushColor = { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16), a: 255 };
            }
        };

        getBtn("editor-size").oninput = (e) => {
            this.brushSize = parseInt(e.target.value);
            getBtn("size-val").innerText = this.brushSize;
            this.updateBrushPreview();
        };

        getBtn("editor-shape").onchange = (e) => {
            this.brushShape = e.target.value;
            this.updateBrushPreview();
        };

        getBtn("editor-tol").oninput = (e) => {
            this.tolerance = parseInt(e.target.value);
            getBtn("tol-val").innerText = this.tolerance;
            if (this.currentTool === "MAGIC_WAND" && this.selectedPixels.length > 0 && this.lastWandClick) {
                this.applyFloodFillSelection(this.lastWandClick.x, this.lastWandClick.y, false);
            }
        };

        getBtn("editor-global").onchange = (e) => {
            this.isGlobalWand = e.target.checked;
            if (this.currentTool === "MAGIC_WAND" && this.selectedPixels.length > 0 && this.lastWandClick) {
                this.applyFloodFillSelection(this.lastWandClick.x, this.lastWandClick.y, false);
            }
        };

        getBtn("btn-wand-del").onclick = () => this.deleteSelectedArea();

        getBtn("btn-zoom-in").onclick = () => {
            this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom + 0.5, 0.5, 10));
        };
        getBtn("btn-zoom-out").onclick = () => {
            this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom - 0.5, 0.5, 10));
        };
        getBtn("btn-zoom-reset").onclick = () => {
            this.cameras.main.setZoom(1);
            this.cameras.main.scrollX = 0;
            this.cameras.main.scrollY = 0;
        };

        getBtn("editor-bg-select").onchange = (e) => {
            this.updateCanvasBackground(e.target.value);
        };

        getBtn("btn-undo").onclick = () => this.undo();
        getBtn("btn-save").onclick = () => {
            if (this.editorMode === "ERASER" && this.eraserCanvas) {
                const link = document.createElement("a");
                link.download = "studio_erased.png";
                link.href = this.eraserCanvas.toDataURL();
                link.click();
            } else {
                this.exportSpritesheet();
            }
        };
        getBtn("btn-save-as").onclick = () => this.exportSpritesheetAs();
        getBtn("btn-exit").onclick = () => this.exitToMenu();

        // Initialize default tab
        switchTab("char");

        // MP4 Import Logic
        const videoInput = getBtn("video-upload");
        if (videoInput) {
            videoInput.onchange = (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    this.importVideo(e.target.files[0]);
                }
                // Reset value so we can select same file again if needed
                videoInput.value = "";
            };
        }

        const btnImportMp4 = getBtn("btn-import-mp4");
        if (btnImportMp4) {
            btnImportMp4.onclick = () => videoInput.click();
        }

        // PNG Import Logic
        const imageInput = getBtn("image-upload");
        if (imageInput) {
            imageInput.onchange = (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    this.loadImage(e.target.files[0]);
                }
                imageInput.value = "";
            };
        }

        const btnLoadPng = getBtn("btn-load-png");
        if (btnLoadPng) {
            btnLoadPng.onclick = () => imageInput.click();
        }

        // JSON Import Logic
        const jsonInput = getBtn("json-upload");
        if (jsonInput) {
            jsonInput.onchange = (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    this.loadJSON(e.target.files[0]);
                }
                jsonInput.value = "";
            };
        }

        const btnLoadJson = getBtn("btn-load-json");
        if (btnLoadJson) {
            btnLoadJson.onclick = () => jsonInput.click();
        }

        // The original code had this line here, but it was already handled above.
        // Keeping it commented out to reflect the original intent of the edit,
        // but it's redundant if editor-color is already handled.
        // const colorInput = getBtn("editor-color");
        // if (colorInput) colorInput.onchange = (e) => { this.currentBrushColor = e.target.value; };
    }

    createHTMLTimeline() {
        this.timelineContainer = document.createElement("div");
        this.timelineContainer.style.position = "absolute";
        this.timelineContainer.style.bottom = "0px";
        this.timelineContainer.style.left = "150px";
        this.timelineContainer.style.width = "calc(100% - 150px)";
        this.timelineContainer.style.height = "120px";
        this.timelineContainer.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        this.timelineContainer.style.display = "flex";
        this.timelineContainer.style.alignItems = "center";
        this.timelineContainer.style.overflowX = "auto";
        this.timelineContainer.style.padding = "10px";
        this.timelineContainer.style.boxSizing = "border-box";
        this.timelineContainer.style.zIndex = "1000";

        this.timelineContainer.addEventListener('mousedown', (e) => e.stopPropagation());
        this.timelineContainer.addEventListener('wheel', (e) => e.stopPropagation());

        document.getElementById("game-root").appendChild(this.timelineContainer);
    }

    setTool(toolName) {
        this.currentTool = toolName;

        const tools = ["PEN", "ERASER", "MAGIC_WAND", "EYEDROPPER", "PAINT_BUCKET", "LINE", "RECTANGLE", "CIRCLE", "ROD", "PAN"];
        tools.forEach(t => {
            const btn = document.getElementById("btn-" + t.toLowerCase().replace("_", "-"));
            if (btn) {
                if (t === toolName) btn.classList.add("active");
                else btn.classList.remove("active");
            }
        });

        const wandProps = document.getElementById("wand-props");
        if (wandProps) {
            // Show Tolerance/Global properties for Wand and Paint Bucket
            wandProps.style.display = (toolName === "MAGIC_WAND" || toolName === "PAINT_BUCKET") ? "block" : "none";

            // Hide "Delete Selection" button specifically if it's Paint Bucket
            const delBtn = document.getElementById("btn-wand-del");
            if (delBtn) {
                delBtn.style.display = (toolName === "MAGIC_WAND") ? "block" : "none";
            }
        }

        if (toolName !== "MAGIC_WAND" && this.selectedPixels && this.selectedPixels.length > 0) {
            this.clearWandSelection();
        }

        this.updateBrushPreview();
    }

    setupInputHandlers() {
        this.input.keyboard.on("keydown-ESC", () => this.exitToMenu());
        this.input.keyboard.on("keydown-Z", () => {
            if (this.currentTool === "MAGIC_WAND" && this.selectedPixels.length > 0) {
                this.clearWandSelection();
            } else {
                this.undo();
            }
        });
        this.input.keyboard.on("keydown-DELETE", () => this.deleteSelectedArea());
        this.input.keyboard.on("keydown-BACKSPACE", () => this.deleteSelectedArea());

        this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            const cam = this.cameras.main;
            let newZoom = cam.zoom;
            if (deltaY > 0) newZoom -= 0.1;
            else if (deltaY < 0) newZoom += 0.1;
            cam.setZoom(Phaser.Math.Clamp(newZoom, 0.5, 10));
        });

        this.input.on("pointerdown", (pointer) => {
            if (pointer.middleButtonDown() || this.currentTool === "PAN" || (pointer.leftButtonDown() && this.input.keyboard.checkDown(this.input.keyboard.addKey('SPACE'), 500))) {
                this.isPanning = true;
                this.panStartX = pointer.x;
                this.panStartY = pointer.y;
                this.camStartX = this.cameras.main.scrollX;
                this.camStartY = this.cameras.main.scrollY;
                return;
            }

            if (pointer.leftButtonDown() && this.currentFrameSprite) {
                if (this.currentTool === "PEN" || this.currentTool === "ERASER") {
                    this.saveUndoState();
                    this.isDrawing = true;
                    this.applyToolAtPointer(pointer);
                } else if (this.currentTool === "ROD") {
                    this.saveUndoState();
                    this.applyToolAtPointer(pointer);
                } else if (this.currentTool === "MAGIC_WAND") {
                    this.applyWandAtPointer(pointer);
                } else if (this.currentTool === "EYEDROPPER") {
                    this.applyEyedropperAtPointer(pointer);
                } else if (this.currentTool === "PAINT_BUCKET") {
                    this.saveUndoState();
                    this.applyPaintBucketAtPointer(pointer);
                } else if (this.currentTool === "LINE" || this.currentTool === "RECTANGLE" || this.currentTool === "CIRCLE") {
                    this.saveUndoState();
                    this.isDrawingShape = true;
                    this.shapeStartX = this.getPointerLocalX(pointer);
                    this.shapeStartY = this.getPointerLocalY(pointer);
                }
            }
        });

        this.input.on("pointermove", (pointer) => {
            if (this.isPanning) {
                const cam = this.cameras.main;
                cam.scrollX = this.camStartX - (pointer.x - this.panStartX) / cam.zoom;
                cam.scrollY = this.camStartY - (pointer.y - this.panStartY) / cam.zoom;
                this.hideBrushPreview();
                return;
            }

            if (this.isDrawing && (this.currentTool === "PEN" || this.currentTool === "ERASER")) {
                this.applyToolAtPointer(pointer);
            }

            this.updateBrushPreview(pointer);
        });

        this.input.on("pointerup", (pointer) => {
            if (this.isDrawingShape && (this.currentTool === "LINE" || this.currentTool === "RECTANGLE" || this.currentTool === "CIRCLE")) {
                this.isDrawingShape = false;
                const endX = this.getPointerLocalX(pointer);
                const endY = this.getPointerLocalY(pointer);

                if (this.currentTool === "LINE") {
                    this.drawLineStrict(this.shapeStartX, this.shapeStartY, endX, endY);
                } else if (this.currentTool === "RECTANGLE") {
                    this.drawRectangleStrict(this.shapeStartX, this.shapeStartY, endX, endY);
                } else if (this.currentTool === "CIRCLE") {
                    this.drawCircleStrict(this.shapeStartX, this.shapeStartY, endX, endY);
                }

                this.updateFrameTexture();
            }

            if (this.isDrawing) {
                this.isDrawing = false;
                this.updateFrameTexture();
            }
            this.isPanning = false;
        });

        this.input.on("gameout", () => {
            this.hideBrushPreview();
            this.isDrawing = false;
            this.isDrawingShape = false;
            this.isPanning = false;
        });
    }

    getPointerLocalX(pointer) {
        if (!this.currentFrameSprite) return 0;
        const localX = (pointer.worldX - (this.currentFrameSprite.x - this.currentFrameSprite.width * this.currentFrameSprite.originX * this.currentFrameSprite.scaleX)) / this.currentFrameSprite.scaleX;
        return Math.floor(localX);
    }

    getPointerLocalY(pointer) {
        if (!this.currentFrameSprite) return 0;
        const localY = (pointer.worldY - (this.currentFrameSprite.y - this.currentFrameSprite.height * this.currentFrameSprite.originY * this.currentFrameSprite.scaleY)) / this.currentFrameSprite.scaleY;
        return Math.floor(localY);
    }

    drawLineStrict(x0, y0, x1, y1) {
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = (x0 < x1) ? 1 : -1;
        const sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;

        while (true) {
            this.applyBrushAt(x0, y0);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    }

    applyBrushAt(x, y) {
        const canvasFrame = this.frames[this.currentFrameIndex];
        if (x >= 0 && x < canvasFrame.width && y >= 0 && y < canvasFrame.height) {
            const ctx = canvasFrame.getContext('2d', { willReadFrequently: true });
            const size = this.brushSize;
            const offset = Math.floor(size / 2);

            const r = this.brushColor.r;
            const g = this.brushColor.g;
            const b = this.brushColor.b;
            const a = this.brushColor.a;

            if (this.brushShape === 'SQUARE') {
                for (let i = 0; i < size; i++) {
                    for (let j = 0; j < size; j++) {
                        let drawX = x - offset + i;
                        let drawY = y - offset + j;
                        if (drawX >= 0 && drawX < canvasFrame.width && drawY >= 0 && drawY < canvasFrame.height) {
                            ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
                            ctx.fillRect(drawX, drawY, 1, 1);
                        }
                    }
                }
            } else if (this.brushShape === 'CIRCLE') {
                const radiusSq = (size / 2) * (size / 2);
                for (let i = 0; i < size; i++) {
                    for (let j = 0; j < size; j++) {
                        let dx = i - offset;
                        let dy = j - offset;
                        if (dx * dx + dy * dy <= radiusSq) {
                            let drawX = x + dx;
                            let drawY = y + dy;
                            if (drawX >= 0 && drawX < canvasFrame.width && drawY >= 0 && drawY < canvasFrame.height) {
                                ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
                                ctx.fillRect(drawX, drawY, 1, 1);
                            }
                        }
                    }
                }
            }
        }
    }

    hideBrushPreview() {
        if (this.brushPreviewGraphic) {
            this.brushPreviewGraphic.clear();
        }
    }

    updateBrushPreview(pointer = this.input.activePointer) {
        if (!this.brushPreviewGraphic) {
            this.brushPreviewGraphic = this.add.graphics();
            this.brushPreviewGraphic.setDepth(150);
        }

        this.brushPreviewGraphic.clear();

        if (!this.isDrawingShape && (this.currentTool !== "PEN" && this.currentTool !== "ERASER" && this.currentTool !== "LINE" && this.currentTool !== "RECTANGLE" && this.currentTool !== "CIRCLE")) return;
        if (!this.currentFrameSprite) return;

        // Convert world pointer to pixel space
        const localX = (pointer.worldX - (this.currentFrameSprite.x - this.currentFrameSprite.width * this.currentFrameSprite.originX * this.currentFrameSprite.scaleX)) / this.currentFrameSprite.scaleX;
        const localY = (pointer.worldY - (this.currentFrameSprite.y - this.currentFrameSprite.height * this.currentFrameSprite.originY * this.currentFrameSprite.scaleY)) / this.currentFrameSprite.scaleY;

        const px = Math.floor(localX);
        const py = Math.floor(localY);

        if (px < 0 || px >= this.currentFrameSprite.width || py < 0 || py >= this.currentFrameSprite.height) {
            return;
        }

        // --- SHAPE PREVIEW ---
        if (this.isDrawingShape && (this.currentTool === "LINE" || this.currentTool === "RECTANGLE" || this.currentTool === "CIRCLE")) {
            const endX = this.getPointerLocalX(pointer);
            const endY = this.getPointerLocalY(pointer);

            if (this.currentTool === "LINE") {
                this.drawPreviewLineStrict(this.shapeStartX, this.shapeStartY, endX, endY);
            } else if (this.currentTool === "RECTANGLE") {
                this.drawPreviewRectangleStrict(this.shapeStartX, this.shapeStartY, endX, endY);
            } else if (this.currentTool === "CIRCLE") {
                this.drawPreviewCircleStrict(this.shapeStartX, this.shapeStartY, endX, endY);
            }
            return;
        }

        const size = this.brushSize;
        const offset = Math.floor(size / 2);

        const canvasX = this.currentFrameSprite.x - (this.currentFrameSprite.width * this.currentFrameSprite.originX * this.currentFrameSprite.scaleX);
        const canvasY = this.currentFrameSprite.y - (this.currentFrameSprite.height * this.currentFrameSprite.originY * this.currentFrameSprite.scaleY);

        this.brushPreviewGraphic.lineStyle(2 / this.cameras.main.zoom, 0xffffff, 0.8);

        if (this.brushShape === 'SQUARE') {
            const displayX = canvasX + (px - offset) * this.currentFrameSprite.scaleX;
            const displayY = canvasY + (py - offset) * this.currentFrameSprite.scaleY;
            const displaySizeW = size * this.currentFrameSprite.scaleX;
            const displaySizeH = size * this.currentFrameSprite.scaleY;
            this.brushPreviewGraphic.strokeRect(displayX, displayY, displaySizeW, displaySizeH);

            this.brushPreviewGraphic.lineStyle(1 / this.cameras.main.zoom, 0x000000, 0.5);
            this.brushPreviewGraphic.strokeRect(displayX, displayY, displaySizeW, displaySizeH);

        } else if (this.brushShape === 'CIRCLE') {
            // Convert back to world space for drawing the preview precisely
            const worldPx = this.currentFrameSprite.x - (this.currentFrameSprite.width * this.currentFrameSprite.originX * this.currentFrameSprite.scaleX) + px * this.currentFrameSprite.scaleX;
            const worldPy = this.currentFrameSprite.y - (this.currentFrameSprite.height * this.currentFrameSprite.originY * this.currentFrameSprite.scaleY) + py * this.currentFrameSprite.scaleY;
            const scaledSize = this.brushSize * this.currentFrameSprite.scaleX;
            const radius = scaledSize / 2;
            // The center of the 'pixel' brush stroke
            const cx = worldPx + (this.currentFrameSprite.scaleX / 2) + ((this.brushSize % 2 === 0) ? -0.5 * this.currentFrameSprite.scaleX : 0);
            const cy = worldPy + (this.currentFrameSprite.scaleY / 2) + ((this.brushSize % 2 === 0) ? -0.5 * this.currentFrameSprite.scaleY : 0);
            this.brushPreviewGraphic.strokeCircle(cx, cy, radius);
        }
    }

    saveUndoState() {
        if (this.frames.length === 0) return;
        const canvas = this.frames[this.currentFrameIndex];
        const oldOffsets = JSON.parse(JSON.stringify(this.rodOffsets));

        this.undoStack.push({
            frameIndex: this.currentFrameIndex,
            offsets: oldOffsets,
            dataURL: canvas.toDataURL()
        });
        if (this.undoStack.length > 30) this.undoStack.shift();
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const state = this.undoStack.pop();
        if (state.frameIndex !== this.currentFrameIndex && state.frameIndex < this.frames.length) {
            this.currentFrameIndex = state.frameIndex;
            this.renderCurrentFrame();
        }

        this.rodOffsets = state.offsets;

        const canvas = this.frames[this.currentFrameIndex];
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            this.updateFrameTexture();
            this.clearWandSelection();
            this.drawRodIndicator();
        };
        img.src = state.dataURL;
    }

    drawPreviewLineStrict(x0, y0, x1, y1) {
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = (x0 < x1) ? 1 : -1;
        const sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;

        while (true) {
            this.drawPreviewBrushAt(x0, y0);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    }

    drawRectangleStrict(x0, y0, x1, y1) {
        const minX = Math.min(x0, x1);
        const maxX = Math.max(x0, x1);
        const minY = Math.min(y0, y1);
        const maxY = Math.max(y0, y1);

        for (let x = minX; x <= maxX; x++) {
            this.applyBrushAt(x, minY);
            this.applyBrushAt(x, maxY);
        }
        for (let y = minY; y <= maxY; y++) {
            this.applyBrushAt(minX, y);
            this.applyBrushAt(maxX, y);
        }
    }

    drawPreviewRectangleStrict(x0, y0, x1, y1) {
        const minX = Math.min(x0, x1);
        const maxX = Math.max(x0, x1);
        const minY = Math.min(y0, y1);
        const maxY = Math.max(y0, y1);

        for (let x = minX; x <= maxX; x++) {
            this.drawPreviewBrushAt(x, minY);
            this.drawPreviewBrushAt(x, maxY);
        }
        for (let y = minY; y <= maxY; y++) {
            this.drawPreviewBrushAt(minX, y);
            this.drawPreviewBrushAt(maxX, y);
        }
    }

    drawCircleStrict(x0, y0, x1, y1) {
        let r = Math.floor(Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2)));
        let x = r;
        let y = 0;
        let err = 0;

        while (x >= y) {
            this.applyBrushAt(x0 + x, y0 + y);
            this.applyBrushAt(x0 + y, y0 + x);
            this.applyBrushAt(x0 - y, y0 + x);
            this.applyBrushAt(x0 - x, y0 + y);
            this.applyBrushAt(x0 - x, y0 - y);
            this.applyBrushAt(x0 - y, y0 - x);
            this.applyBrushAt(x0 + y, y0 - x);
            this.applyBrushAt(x0 + x, y0 - y);

            if (err <= 0) {
                y += 1;
                err += 2 * y + 1;
            }
            if (err > 0) {
                x -= 1;
                err -= 2 * x + 1;
            }
        }
    }

    drawPreviewCircleStrict(x0, y0, x1, y1) {
        let r = Math.floor(Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2)));
        let x = r;
        let y = 0;
        let err = 0;

        while (x >= y) {
            this.drawPreviewBrushAt(x0 + x, y0 + y);
            this.drawPreviewBrushAt(x0 + y, y0 + x);
            this.drawPreviewBrushAt(x0 - y, y0 + x);
            this.drawPreviewBrushAt(x0 - x, y0 + y);
            this.drawPreviewBrushAt(x0 - x, y0 - y);
            this.drawPreviewBrushAt(x0 - y, y0 - x);
            this.drawPreviewBrushAt(x0 + y, y0 - x);
            this.drawPreviewBrushAt(x0 + x, y0 - y);

            if (err <= 0) {
                y += 1;
                err += 2 * y + 1;
            }
            if (err > 0) {
                x -= 1;
                err -= 2 * x + 1;
            }
        }
    }

    drawPreviewBrushAt(x, y) {
        const size = this.brushSize;
        const offset = Math.floor(size / 2);
        const canvasX = this.currentFrameSprite.x - (this.currentFrameSprite.width * this.currentFrameSprite.originX * this.currentFrameSprite.scaleX);
        const canvasY = this.currentFrameSprite.y - (this.currentFrameSprite.height * this.currentFrameSprite.originY * this.currentFrameSprite.scaleY);

        this.brushPreviewGraphic.fillStyle(0x00ffff, 0.5); // Cyan color for line preview

        if (this.brushShape === 'SQUARE') {
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    let drawX = x - offset + i;
                    let drawY = y - offset + j;
                    const displayX = canvasX + drawX * this.currentFrameSprite.scaleX;
                    const displayY = canvasY + drawY * this.currentFrameSprite.scaleY;
                    this.brushPreviewGraphic.fillRect(displayX, displayY, this.currentFrameSprite.scaleX, this.currentFrameSprite.scaleY);
                }
            }
        } else if (this.brushShape === 'CIRCLE') {
            const radiusSq = (size / 2) * (size / 2);
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    let dx = i - offset;
                    let dy = j - offset;
                    if (dx * dx + dy * dy <= radiusSq) {
                        let drawX = x + dx;
                        let drawY = y + dy;
                        const displayX = canvasX + drawX * this.currentFrameSprite.scaleX;
                        const displayY = canvasY + drawY * this.currentFrameSprite.scaleY;
                        this.brushPreviewGraphic.fillRect(displayX, displayY, this.currentFrameSprite.scaleX, this.currentFrameSprite.scaleY);
                    }
                }
            }
        }
    }

    applyToolAtPointer(pointer) {
        if (!this.currentFrameSprite) return;

        const localX = (pointer.worldX - (this.currentFrameSprite.x - this.currentFrameSprite.width * this.currentFrameSprite.originX * this.currentFrameSprite.scaleX)) / this.currentFrameSprite.scaleX;
        const localY = (pointer.worldY - (this.currentFrameSprite.y - this.currentFrameSprite.height * this.currentFrameSprite.originY * this.currentFrameSprite.scaleY)) / this.currentFrameSprite.scaleY;

        const px = Math.floor(localX);
        const py = Math.floor(localY);

        if (px < 0 || px >= this.currentFrameSprite.width || py < 0 || py >= this.currentFrameSprite.height) {
            return;
        }

        if (this.currentTool === "ROD") {
            const ox = px - (this.currentFrameSprite.width / 2);
            const oy = py - (this.currentFrameSprite.height / 2);
            this.rodOffsets[this.currentFrameIndex] = { x: ox, y: oy };
            this.drawRodIndicator();
            return;
        }

        const canvasFrame = this.frames[this.currentFrameIndex];
        const ctx = canvasFrame.getContext('2d', { willReadFrequently: true });

        if (this.currentTool === "PEN") {
            ctx.fillStyle = `rgba(${this.brushColor.r},${this.brushColor.g},${this.brushColor.b},1)`;
            ctx.globalCompositeOperation = "source-over";
            const offset = Math.floor(this.brushSize / 2);
            ctx.fillRect(px - offset, py - offset, this.brushSize, this.brushSize);
        } else if (this.currentTool === "ERASER") {
            ctx.globalCompositeOperation = "destination-out";
            const offset = Math.floor(this.brushSize / 2);
            ctx.fillRect(px - offset, py - offset, this.brushSize, this.brushSize);
            ctx.globalCompositeOperation = "source-over";
        }

        this.updateFrameTexture();
    }

    applyEyedropperAtPointer(pointer) {
        if (!this.currentFrameSprite) return;

        const localX = (pointer.worldX - (this.currentFrameSprite.x - this.currentFrameSprite.width * this.currentFrameSprite.originX * this.currentFrameSprite.scaleX)) / this.currentFrameSprite.scaleX;
        const localY = (pointer.worldY - (this.currentFrameSprite.y - this.currentFrameSprite.height * this.currentFrameSprite.originY * this.currentFrameSprite.scaleY)) / this.currentFrameSprite.scaleY;

        const px = Math.floor(localX);
        const py = Math.floor(localY);

        const canvasFrame = this.frames[this.currentFrameIndex];
        if (px >= 0 && px < canvasFrame.width && py >= 0 && py < canvasFrame.height) {
            const ctx = canvasFrame.getContext('2d', { willReadFrequently: true });
            const pixel = ctx.getImageData(px, py, 1, 1).data;

            // Only pick if it's not fully transparent
            if (pixel[3] > 0) {
                this.brushColor = { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] };

                // Convert RGB to HEX to update the HTML Color Picker
                const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
                    const hex = x.toString(16);
                    return hex.length === 1 ? '0' + hex : hex;
                }).join('');

                const colorInput = document.getElementById("editor-color");
                if (colorInput) {
                    colorInput.value = rgbToHex(pixel[0], pixel[1], pixel[2]);
                }

                // Automatically switch back to Pen for fluid workflow
                this.setTool("PEN");
            }
        }
    }

    applyPaintBucketAtPointer(pointer) {
        if (!this.currentFrameSprite) return;

        const localX = (pointer.worldX - (this.currentFrameSprite.x - this.currentFrameSprite.width * this.currentFrameSprite.originX * this.currentFrameSprite.scaleX)) / this.currentFrameSprite.scaleX;
        const localY = (pointer.worldY - (this.currentFrameSprite.y - this.currentFrameSprite.height * this.currentFrameSprite.originY * this.currentFrameSprite.scaleY)) / this.currentFrameSprite.scaleY;

        const px = Math.floor(localX);
        const py = Math.floor(localY);

        const canvasFrame = this.frames[this.currentFrameIndex];
        if (px >= 0 && px < canvasFrame.width && py >= 0 && py < canvasFrame.height) {
            this.executePaintBucket(px, py);
        }
    }

    executePaintBucket(startX, startY) {
        const canvas = this.frames[this.currentFrameIndex];
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        const W = canvas.width;
        const H = canvas.height;
        const toIndex = (x, y) => (y * W + x) * 4;

        const startIdx = toIndex(startX, startY);
        const targetColor = {
            r: data[startIdx], g: data[startIdx + 1], b: data[startIdx + 2], a: data[startIdx + 3]
        };

        const fillR = this.brushColor.r;
        const fillG = this.brushColor.g;
        const fillB = this.brushColor.b;
        const fillA = this.brushColor.a;

        // If clicking on exactly identical color with 0 tolerance, ignore to prevent infinite loop
        if (this.tolerance === 0 && targetColor.r === fillR && targetColor.g === fillG && targetColor.b === fillB && targetColor.a === fillA) {
            return;
        }

        const colorMatch = (r, g, b, a) => {
            if (targetColor.a === 0 && a === 0) return true; // Match transparent to transparent
            if (targetColor.a === 0 || a === 0) return false;

            const dr = targetColor.r - r;
            const dg = targetColor.g - g;
            const db = targetColor.b - b;
            const dist = Math.sqrt(dr * dr + dg * dg + db * db);
            return dist <= this.tolerance;
        };

        const pixelsToFill = [];

        if (!this.isGlobalWand) {
            const queue = [{ x: startX, y: startY }];
            const visited = new Set();
            const toKey = (x, y) => `${x},${y}`;
            visited.add(toKey(startX, startY));

            while (queue.length > 0) {
                const p = queue.shift();
                const idx = toIndex(p.x, p.y);

                if (colorMatch(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
                    pixelsToFill.push(idx);

                    const neighbors = [
                        { x: p.x - 1, y: p.y }, { x: p.x + 1, y: p.y },
                        { x: p.x, y: p.y - 1 }, { x: p.x, y: p.y + 1 }
                    ];

                    for (let n of neighbors) {
                        if (n.x >= 0 && n.x < W && n.y >= 0 && n.y < H) {
                            const key = toKey(n.x, n.y);
                            if (!visited.has(key)) {
                                visited.add(key);
                                queue.push(n);
                            }
                        }
                    }
                }
            }
        } else {
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const idx = toIndex(x, y);
                    if (colorMatch(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
                        pixelsToFill.push(idx);
                    }
                }
            }
        }

        // Apply fills physically to image data
        for (let i = 0; i < pixelsToFill.length; i++) {
            const idx = pixelsToFill[i];
            data[idx] = fillR;
            data[idx + 1] = fillG;
            data[idx + 2] = fillB;
            data[idx + 3] = fillA;
        }

        ctx.putImageData(imgData, 0, 0);
        this.updateFrameTexture();
    }

    applyWandAtPointer(pointer) {
        if (!this.currentFrameSprite) return;

        const localX = (pointer.worldX - (this.currentFrameSprite.x - this.currentFrameSprite.width * this.currentFrameSprite.originX * this.currentFrameSprite.scaleX)) / this.currentFrameSprite.scaleX;
        const localY = (pointer.worldY - (this.currentFrameSprite.y - this.currentFrameSprite.height * this.currentFrameSprite.originY * this.currentFrameSprite.scaleY)) / this.currentFrameSprite.scaleY;

        const px = Math.floor(localX);
        const py = Math.floor(localY);

        const canvasFrame = this.frames[this.currentFrameIndex];
        if (px >= 0 && px < canvasFrame.width && py >= 0 && py < canvasFrame.height) {
            this.lastWandClick = { x: px, y: py };
            const isShiftAdded = this.input.keyboard.checkDown(this.input.keyboard.addKey('SHIFT'), 2000) || this.input.keyboard.keys[16]?.isDown; // Check for shift key
            this.applyFloodFillSelection(px, py, isShiftAdded);
        }
    }

    applyFloodFillSelection(startX, startY, accumulate = false) {
        const canvas = this.frames[this.currentFrameIndex];
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        if (!accumulate) {
            this.selectedPixels = [];
        }
        const previousSelection = accumulate ? new Set(this.selectedPixels) : new Set();

        const W = canvas.width;
        const H = canvas.height;
        const toIndex = (x, y) => (y * W + x) * 4;

        const startIdx = toIndex(startX, startY);
        const targetColor = {
            r: data[startIdx], g: data[startIdx + 1], b: data[startIdx + 2], a: data[startIdx + 3]
        };

        if (targetColor.a === 0 && !accumulate) {
            this.clearWandSelection();
            return;
        }

        const colorMatch = (r, g, b, a) => {
            if (a === 0) return false;
            const dr = targetColor.r - r;
            const dg = targetColor.g - g;
            const db = targetColor.b - b;
            const dist = Math.sqrt(dr * dr + dg * dg + db * db);
            return dist <= this.tolerance;
        };

        if (!this.isGlobalWand) {
            const queue = [{ x: startX, y: startY }];
            const visited = new Set();
            const toKey = (x, y) => `${x},${y}`;
            visited.add(toKey(startX, startY));

            while (queue.length > 0) {
                const p = queue.shift();
                const idx = toIndex(p.x, p.y);

                if (colorMatch(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
                    if (!previousSelection.has(idx)) {
                        this.selectedPixels.push(idx);
                        previousSelection.add(idx);
                    }

                    const neighbors = [
                        { x: p.x - 1, y: p.y }, { x: p.x + 1, y: p.y },
                        { x: p.x, y: p.y - 1 }, { x: p.x, y: p.y + 1 }
                    ];

                    for (let n of neighbors) {
                        if (n.x >= 0 && n.x < W && n.y >= 0 && n.y < H) {
                            const key = toKey(n.x, n.y);
                            if (!visited.has(key)) {
                                visited.add(key);
                                queue.push(n);
                            }
                        }
                    }
                }
            }
        } else {
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const idx = toIndex(x, y);
                    if (colorMatch(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
                        if (!previousSelection.has(idx)) {
                            this.selectedPixels.push(idx);
                            previousSelection.add(idx);
                        }
                    }
                }
            }
        }

        this.renderWandSelectionOverlay();
    }

    renderWandSelectionOverlay() {
        if (!this.currentFrameSprite) return;

        if (!this.wandOverlaySprite) {
            const canvas = document.createElement("canvas");
            canvas.width = 1; canvas.height = 1;
            const tempKey = "wand_temp_key_" + Date.now();
            if (!this.textures.exists(tempKey)) {
                this.textures.addBase64(tempKey, canvas.toDataURL());
            }

            this.wandOverlaySprite = this.add.sprite(this.currentFrameSprite.x, this.currentFrameSprite.y, tempKey);
            this.wandOverlaySprite.setOrigin(0.5);
            this.wandOverlaySprite.setDepth(10);
            this.wandOverlaySprite.setScrollFactor(this.currentFrameSprite.scrollFactorX, this.currentFrameSprite.scrollFactorY);
        }

        const canvas = document.createElement("canvas");
        canvas.width = this.frames[this.currentFrameIndex].width;
        canvas.height = this.frames[this.currentFrameIndex].height;
        const ctx = canvas.getContext("2d");
        const imgData = ctx.createImageData(canvas.width, canvas.height);

        for (let i = 0; i < this.selectedPixels.length; i++) {
            const idx = this.selectedPixels[i];
            imgData.data[idx] = 255;
            imgData.data[idx + 1] = 0;
            imgData.data[idx + 2] = 255;
            imgData.data[idx + 3] = 200;
        }
        ctx.putImageData(imgData, 0, 0);

        const texKey = `wand_overlay_${Date.now()}`;
        this.textures.addBase64(texKey, canvas.toDataURL());

        this.textures.once('addtexture', () => {
            if (this.wandOverlaySprite) {
                const oldKey = this.wandOverlaySprite.texture.key;
                this.wandOverlaySprite.setTexture(texKey);
                if (oldKey && oldKey.startsWith("wand_overlay_")) {
                    this.textures.remove(oldKey);
                }
                this.wandOverlaySprite.setVisible(true);
            }
        });
    }

    clearWandSelection() {
        this.selectedPixels = [];
        if (this.wandOverlaySprite) {
            this.wandOverlaySprite.setVisible(false);
        }
        this.lastWandClick = null;
    }

    deleteSelectedArea() {
        if (this.selectedPixels.length === 0) return;

        this.saveUndoState();

        const canvas = this.frames[this.currentFrameIndex];
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < this.selectedPixels.length; i++) {
            const idx = this.selectedPixels[i];
            data[idx + 3] = 0; // Set Alpha to 0
        }
        ctx.putImageData(imgData, 0, 0);

        this.updateFrameTexture();
        this.clearWandSelection();
    }

    autoRemoveBackground(targetCanvas = null) {
        const canvas = targetCanvas || this.frames[this.currentFrameIndex];
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const W = canvas.width;
        const H = canvas.height;
        const imgData = ctx.getImageData(0, 0, W, H);
        const data = imgData.data;

        const getDist = (i, r2, g2, b2) => {
            return Math.sqrt((data[i] - r2) ** 2 + (data[i + 1] - g2) ** 2 + (data[i + 2] - b2) ** 2);
        };

        const bgSeeds = [
            { r: data[0], g: data[1], b: data[2] },
            { r: data[(W - 1) * 4], g: data[(W - 1) * 4 + 1], b: data[(W - 1) * 4 + 2] },
            { r: data[(H - 1) * W * 4], g: data[(H - 1) * W * 4 + 1], b: data[(H - 1) * W * 4 + 2] },
            { r: data[((H - 1) * W + (W - 1)) * 4], g: data[((H - 1) * W + (W - 1)) * 4 + 1], b: data[((H - 1) * W + (W - 1)) * 4 + 2] }
        ];

        const visited = new Uint8Array(W * H);
        const queue = [];
        const transparent = new Set();
        const tol = 60;

        // Add edges to queue
        for (let x = 0; x < W; x++) { queue.push({ x, y: 0 }); queue.push({ x, y: H - 1 }); }
        for (let y = 0; y < H; y++) { queue.push({ x: 0, y }); queue.push({ x: W - 1, y }); }

        while (queue.length > 0) {
            const { x, y } = queue.shift();
            const idx = (y * W + x);
            if (visited[idx]) continue;
            visited[idx] = 1;

            const i = idx * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];

            // Protect solid/dark/saturated pixels
            const sat = Math.max(r, g, b) - Math.min(r, g, b);
            if (sat > 20 || (r < 40 && g < 40 && b < 40)) continue;

            // Match seeds or checkerboard
            let isBG = false;
            for (let s of bgSeeds) { if (getDist(i, s.r, s.g, s.b) < tol) { isBG = true; break; } }

            const isGray = Math.abs(r - g) < 5 && Math.abs(g - b) < 5;
            if (isGray && (r > 180 || (r > 60 && r < 140))) isBG = true;

            if (isBG || a === 0) {
                transparent.add(idx);
                const neighbors = [{ x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 }];
                for (let n of neighbors) {
                    if (n.x >= 0 && n.x < W && n.y >= 0 && n.y < H) queue.push(n);
                }
            }
        }

        // Erosion (2px)
        let finalTrans = new Set(transparent);
        for (let step = 0; step < 2; step++) {
            let nextLayer = new Set();
            for (let idx of finalTrans) {
                const x = idx % W, y = Math.floor(idx / W);
                for (let [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                    const nx = x + dx, ny = y + dy;
                    if (nx >= 0 && nx < W && ny >= 0 && ny < H) nextLayer.add(ny * W + nx);
                }
            }
            for (let idx of nextLayer) finalTrans.add(idx);
        }

        // Apply Transparency & Find Bounds
        let minX = W, minY = H, maxX = -1, maxY = -1;
        let hasContent = false;
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const idx = (y * W + x);
                if (finalTrans.has(idx)) {
                    data[idx * 4 + 3] = 0;
                } else {
                    minX = Math.min(minX, x); minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
                    hasContent = true;
                }
            }
        }

        if (hasContent && !targetCanvas) { // Only autocrop for Character Editor frames for now
            ctx.putImageData(imgData, 0, 0);
            const croppedW = maxX - minX + 1;
            const croppedH = maxY - minY + 1;
            const croppedData = ctx.getImageData(minX, minY, croppedW, croppedH);
            canvas.width = croppedW;
            canvas.height = croppedH;
            canvas.getContext("2d").putImageData(croppedData, 0, 0);
        } else {
            ctx.putImageData(imgData, 0, 0);
        }

        if (!targetCanvas) this.updateFrameTexture();
    }

    updateFrameTexture() {
        if (!this.currentFrameSprite) return;

        const currentKey = this.currentFrameSprite.texture.key;
        const canvas = this.frames[this.currentFrameIndex];
        const newKey = `editor_frame_${this.currentFrameIndex}_${Date.now()}`;

        // Using addCanvas is more stable and faster than addBase64 for frequent updates
        this.textures.addCanvas(newKey, canvas);

        if (this.currentFrameSprite) {
            this.currentFrameSprite.setTexture(newKey);
            // Clean up old texture to prevent memory leak
            if (currentKey && currentKey.startsWith("editor_frame_")) {
                this.textures.remove(currentKey);
            }

            // Refresh Timeline Thumbnails
            this.updateHTMLTimeline();
        }
    }

    extractFramesFromSource() {
        const config = this.targetConfig[this.currentTarget];

        // Try to load custom asset first, then fallback to default source
        let sourceKey = config.key;
        if (this.currentTarget === "PLAYER" && this.textures.exists("player_sprite")) {
            sourceKey = "player_sprite";
        } else if (this.currentTarget === "FISH" && this.textures.exists("custom_fish_sprite")) {
            sourceKey = "custom_fish_sprite";
        }

        const sourceImage = this.textures.get(sourceKey).getSourceImage();
        const frameW = config.frameW || 210;
        const frameH = config.frameH || 200;

        if (!sourceImage) {
            console.error("Source image not found for", config.key);
            return;
        }

        const width = config.frameW || sourceImage.width;
        const height = config.frameH || sourceImage.height;
        const framesCount = config.isSingle ? 1 : Math.floor(sourceImage.width / width);

        for (let i = 0; i < framesCount; i++) {
            const canvasFrame = document.createElement('canvas');
            canvasFrame.width = width;
            canvasFrame.height = height;
            const ctx = canvasFrame.getContext('2d', { willReadFrequently: true });

            ctx.imageSmoothingEnabled = false; // Keep pixel art sharp when scaling

            if (config.isSingle && (sourceImage.width !== width || sourceImage.height !== height)) {
                ctx.drawImage(sourceImage, 0, 0, sourceImage.width, sourceImage.height, 0, 0, width, height);
            } else {
                ctx.drawImage(
                    sourceImage,
                    i * width, 0, width, height,
                    0, 0, width, height
                );
            }
            this.frames.push(canvasFrame);
            // Use default offsets from config if available, otherwise a generic default
            const defaultOffsets = config.defaultOffsets || [{ x: 0, y: -40 }];
            const offset = i < defaultOffsets.length ? defaultOffsets[i] : { x: 0, y: -40 };
            this.rodOffsets.push(offset);
        }

        this.renderCurrentFrame();
        this.updateHTMLTimeline();
    }

    renderCurrentFrame() {
        if (this.frames.length === 0) return;

        const frameCanvas = this.frames[this.currentFrameIndex];

        // Remove existing frame preview if any
        if (this.currentFrameSprite) {
            this.currentFrameSprite.destroy();
        }
        if (this.wandOverlaySprite) {
            this.wandOverlaySprite.destroy();
            this.wandOverlaySprite = null;
        }

        // Generate dynamic texture key
        const texKey = `editor_frame_${this.currentFrameIndex}_${Date.now()}`;
        if (this.textures.exists(texKey)) {
            this.textures.remove(texKey);
        }

        this.textures.addCanvas(texKey, frameCanvas);
        this.currentFrameSprite = this.add.sprite(VIEW_W / 2, VIEW_H / 2, texKey);

        this.setTool(this.currentTool);
        this.drawRodIndicator();
    }

    updateHTMLTimeline() {
        if (!this.timelineContainer) return;
        this.timelineContainer.innerHTML = ""; // Clear existing

        this.frames.forEach((frameCanvas, index) => {
            const wrapper = document.createElement("div");
            wrapper.style.display = "flex";
            wrapper.style.flexDirection = "column";
            wrapper.style.alignItems = "center";
            wrapper.style.marginRight = "10px";

            // Thumbnail Image
            const img = document.createElement("img");
            img.src = frameCanvas.toDataURL();
            img.style.height = "70px";
            img.style.backgroundColor = this.currentFrameIndex === index ? "#ffcc00" : "#444444";
            img.style.border = this.currentFrameIndex === index ? "3px solid #ffcc00" : "1px solid #777";
            img.style.cursor = "pointer";

            img.onclick = () => {
                this.currentFrameIndex = index;
                this.renderCurrentFrame();
                this.updateHTMLTimeline();
            };

            wrapper.appendChild(img);

            // Controls for this frame
            const controlDiv = document.createElement("div");
            controlDiv.style.marginTop = "5px";
            controlDiv.style.display = "flex";
            controlDiv.style.gap = "5px";

            const dupBtn = document.createElement("button");
            dupBtn.innerText = "Copy";
            dupBtn.style.fontSize = "10px";
            dupBtn.onclick = () => this.duplicateFrame(index);

            const delBtn = document.createElement("button");
            delBtn.innerText = "Del";
            delBtn.style.fontSize = "10px";
            delBtn.onclick = () => this.deleteFrame(index);

            controlDiv.appendChild(dupBtn);
            if (this.frames.length > 1) { // Prevent deleting last frame
                controlDiv.appendChild(delBtn);
            }
            wrapper.appendChild(controlDiv);

            this.timelineContainer.appendChild(wrapper);
        });

        // Add "New Frame" Button
        const addBtn = document.createElement("button");
        addBtn.innerText = "+ New Frame";
        addBtn.style.height = "70px";
        addBtn.style.cursor = "pointer";
        addBtn.onclick = () => this.addNewFrame();
        this.timelineContainer.appendChild(addBtn);
    }

    addNewFrame() {
        const canvasFrame = document.createElement('canvas');
        canvasFrame.width = 210;
        canvasFrame.height = 200;
        this.frames.push(canvasFrame);
        this.rodOffsets.push({ x: 0, y: -40 });
        this.currentFrameIndex = this.frames.length - 1;
        this.renderCurrentFrame();
        this.updateHTMLTimeline();
    }

    duplicateFrame(index) {
        this.saveUndoState();
        const originalCanvas = this.frames[index];
        const newCanvas = document.createElement('canvas');
        newCanvas.width = originalCanvas.width;
        newCanvas.height = originalCanvas.height;
        const ctx = newCanvas.getContext('2d');
        ctx.drawImage(originalCanvas, 0, 0);

        this.frames.splice(index + 1, 0, newCanvas);

        const originalOffset = this.rodOffsets[index];
        this.rodOffsets.splice(index + 1, 0, { x: originalOffset.x, y: originalOffset.y });

        this.currentFrameIndex = index + 1;
        this.renderCurrentFrame();
        this.updateHTMLTimeline();
    }

    deleteFrame(index) {
        if (this.frames.length <= 1) return;
        this.saveUndoState();
        this.frames.splice(index, 1);
        this.rodOffsets.splice(index, 1);

        if (this.currentFrameIndex >= this.frames.length) {
            this.currentFrameIndex = this.frames.length - 1;
        }

        this.renderCurrentFrame();
        this.updateHTMLTimeline();
    }

    exportSpritesheet() {
        if (this.frames.length === 0) return;

        const config = this.targetConfig[this.currentTarget];
        const safeFilename = this.workingFilename;

        // 1. Merge all frames into one large canvas spritesheet
        const frameW = this.frames[0].width;
        const frameH = this.frames[0].height;

        const mergedCanvas = document.createElement("canvas");
        mergedCanvas.width = frameW * this.frames.length;
        mergedCanvas.height = frameH;
        const ctx = mergedCanvas.getContext("2d");

        for (let i = 0; i < this.frames.length; i++) {
            ctx.drawImage(this.frames[i], i * frameW, 0);
        }

        // Trigger PNG Download
        const imgURL = mergedCanvas.toDataURL("image/png");
        const imgLink = document.createElement("a");
        imgLink.download = `${safeFilename}_spritesheet.png`;
        imgLink.href = imgURL;
        imgLink.click();

        // 2. Export coordinates as JSON (Only for CHAR mode)
        if (this.editorMode === "CHAR") {
            const exportData = {
                frameWidth: frameW,
                frameHeight: frameH,
                frames: this.frames.length,
                rodOffsets: this.rodOffsets
            };

            const jsonStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonStr], { type: "application/json" });
            const jsonURL = URL.createObjectURL(blob);

            const jsonLink = document.createElement("a");
            jsonLink.download = `${safeFilename}_offsets.json`;
            jsonLink.href = jsonURL;
            jsonLink.click();

            URL.revokeObjectURL(jsonURL);
        }
    }

    async exportSpritesheetAs() {
        if (this.frames.length === 0) return;

        // Feature fallback check
        if (!window.showSaveFilePicker) {
            alert("Your browser does not support the File System Access API. Falling back to default download.");
            return this.exportSpritesheet();
        }

        try {
            const config = this.targetConfig[this.currentTarget];
            // Get base name from user first
            const filenameInput = window.prompt("Enter base filename for 'Save As' (without extension):", this.workingFilename);
            if (!filenameInput) return; // Cancelled
            const safeFilename = filenameInput.replace(/[^a-z0-9_\-]/gi, '_') || this.workingFilename;

            const frameW = this.frames[0].width;
            const frameH = this.frames[0].height;

            const mergedCanvas = document.createElement("canvas");
            mergedCanvas.width = frameW * this.frames.length;
            mergedCanvas.height = frameH;
            const ctx = mergedCanvas.getContext("2d");

            for (let i = 0; i < this.frames.length; i++) {
                ctx.drawImage(this.frames[i], i * frameW, 0);
            }

            // --- Save PNG ---
            const pngHandle = await window.showSaveFilePicker({
                suggestedName: `${safeFilename}_spritesheet.png`,
                types: [{
                    description: 'PNG Image',
                    accept: { 'image/png': ['.png'] },
                }],
            });
            const pngStream = await pngHandle.createWritable();

            // Promise wrapper to Blob from canvas
            const blob = await new Promise(resolve => mergedCanvas.toBlob(resolve, 'image/png'));
            await pngStream.write(blob);
            await pngStream.close();

            // --- Save JSON (Only for CHAR mode) ---
            if (this.editorMode === "CHAR") {
                const exportData = {
                    frameWidth: frameW,
                    frameHeight: frameH,
                    frames: this.frames.length,
                    rodOffsets: this.rodOffsets
                };
                const jsonStr = JSON.stringify(exportData, null, 2);

                const jsonHandle = await window.showSaveFilePicker({
                    suggestedName: `${safeFilename}_offsets.json`,
                    types: [{
                        description: 'JSON Data',
                        accept: { 'application/json': ['.json'] },
                    }],
                });
                const jsonStream = await jsonHandle.createWritable();
                await jsonStream.write(jsonStr);
                await jsonStream.close();
            }

            alert("Successfully saved result!");

        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error("Save As Failed: ", err);
                alert("Failed to Save As: " + err.message);
            }
        }
    }

    drawRodIndicator() {
        if (!this.rodGraphic) {
            this.rodGraphic = this.add.graphics();
            this.rodGraphic.setDepth(100); // Ensure it renders above the main sprite
        }
        this.rodGraphic.clear();

        const offset = this.rodOffsets[this.currentFrameIndex];
        if (!offset) return;

        // Position of indicator relative to center of screen (where sprite is)
        const rx = (VIEW_W / 2) + offset.x;
        const ry = (VIEW_H / 2) + offset.y;

        this.rodGraphic.fillStyle(0x00ff00, 1);
        this.rodGraphic.lineStyle(2, 0xffffff, 1);
        this.rodGraphic.fillCircle(rx, ry, 3);
        this.rodGraphic.strokeCircle(rx, ry, 3);
    }

    exitToMenu() {
        if (this.toolbarContainer && this.toolbarContainer.parentNode) {
            this.toolbarContainer.parentNode.removeChild(this.toolbarContainer);
            this.toolbarContainer = null;
        }
        if (this.timelineContainer && this.timelineContainer.parentNode) {
            this.timelineContainer.parentNode.removeChild(this.timelineContainer);
            this.timelineContainer = null;
        }
        const style = document.getElementById("editor-styles");
        if (style && style.parentNode) {
            style.parentNode.removeChild(style);
        }
        const infoOverlay = document.getElementById("editor-info-overlay");
        if (infoOverlay && infoOverlay.parentNode) {
            infoOverlay.parentNode.removeChild(infoOverlay);
        }

        // Restore game UI layer
        const uiLayer = document.getElementById("ui-layer");
        if (uiLayer) uiLayer.style.display = "flex";
        this.sound.play("click");
        this.scene.start("TitleScene");
    }

    importVideo(file) {
        // 비디오 소스 주소 생성
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.src = url;
        video.muted = true;
        video.playsInline = true;

        const maxFrames = 30; // 최대 추출 갯수 제한
        const config = this.targetConfig[this.currentTarget];
        const targetW = config.frameW || 210;
        const targetH = config.frameH || 200;

        video.addEventListener("loadeddata", async () => {
            const duration = video.duration;
            if (!duration || !isFinite(duration)) {
                alert("Cannot determine video length.");
                URL.revokeObjectURL(url);
                return;
            }

            // 프레임 간격 설정: 영상 길이를 최대 프레임 수로 나눈 간격
            const interval = duration / maxFrames;
            const newFrames = [];
            const newOffsets = [];

            // UI 블로킹 방지를 위한 메시지
            if (this.toolbarContainer) {
                this.toolbarContainer.style.pointerEvents = "none";
                this.toolbarContainer.style.opacity = "0.5";
            }

            for (let t = 0; t <= duration && newFrames.length < maxFrames; t += interval) {
                video.currentTime = t;
                await new Promise((resolve) => {
                    video.addEventListener("seeked", resolve, { once: true });
                });

                // 프레임 추출 용 임시 캔버스 생성
                const canvasFrame = document.createElement('canvas');
                canvasFrame.width = targetW;
                canvasFrame.height = targetH;
                const ctx = canvasFrame.getContext('2d', { willReadFrequently: true });
                ctx.imageSmoothingEnabled = false;

                // 비디오 화면을 대상으로 리사이징 하여 그리기
                ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, targetW, targetH);

                newFrames.push(canvasFrame);
                // 기본 오프셋 적용
                newOffsets.push(config.defaultOffsets ? config.defaultOffsets[0] : { x: 0, y: -40 });
            }

            // 완료 처리
            this.frames = newFrames;
            this.rodOffsets = newOffsets;
            this.workingFilename = file.name.split('.').slice(0, -1).join('.');
            this.updateFilenameOverlay();

            this.currentFrameIndex = 0;
            this.undoStack = [];
            this.updateHTMLTimeline(); // Corrected method name
            this.renderCurrentFrame(); // Corrected method name

            URL.revokeObjectURL(url);
            if (this.toolbarContainer) {
                this.toolbarContainer.style.pointerEvents = "auto";
                this.toolbarContainer.style.opacity = "1";
            }
        });

        // 로드 에러 처리
        video.addEventListener("error", () => {
            alert("Error loading video file.");
            URL.revokeObjectURL(url);
        });

        // 비디오 파싱 시작을 위해 메모리에 로드
        video.load();
    }

    updateStudioVisibility() {
        const isChar = this.editorMode === "CHAR";
        const isEraser = this.editorMode === "ERASER";
        const isWorld = this.editorMode === "WORLD";

        // Toggle Phaser Objects
        // Now currentFrameSprite is our main workspace for ALL modes
        if (this.currentFrameSprite) this.currentFrameSprite.setVisible(true);
        if (this.wandOverlaySprite) this.wandOverlaySprite.setVisible(true);
        if (this.brushPreviewGraphic) this.brushPreviewGraphic.setVisible(true);
        if (this.rodGraphic) this.rodGraphic.setVisible(isChar);
        if (this.checkerboardBg) this.checkerboardBg.setVisible(true);

        // World Preview Sprites (Parallax check)
        if (this.worldSprites) {
            this.worldSprites.forEach((s, i) => {
                s.setVisible(isWorld && i === this.worldLayerIndex);
            });
        }

        // Toggle HTML Elements
        if (this.timelineContainer) {
            this.timelineContainer.style.display = isChar ? "flex" : "none";
        }

        // Hide/Show Mode Specific UI sections
        const secs = ["sec-char", "sec-eraser", "sec-world"];
        secs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = (id === `sec-${this.editorMode.toLowerCase()}`) ? "block" : "none";
        });

        // Toggle specific buttons in the common grid
        const btnRod = document.getElementById("btn-rod");
        if (btnRod) btnRod.style.display = isChar ? "flex" : "none";
    }

    updateFilenameOverlay() {
        const infoOverlay = document.getElementById("editor-info-overlay");
        if (infoOverlay) {
            infoOverlay.innerText = "File: " + this.workingFilename;
        }
    }

    changeTargetAsset(newTarget) {
        if (this.currentTarget === newTarget) return;
        this.currentTarget = newTarget;

        const config = this.targetConfig[this.currentTarget];
        this.workingFilename = config ? config.filename : "sprite";
        this.updateFilenameOverlay();

        // Clear history and frames
        this.undoStack = [];
        this.frames = [];
        this.rodOffsets = [];
        this.currentFrameIndex = 0;

        if (this.currentFrameSprite) {
            this.currentFrameSprite.destroy();
            this.currentFrameSprite = null;
        }

        this.hideBrushPreview();
        this.extractFramesFromSource();

        // Reset zoom and pan for new asset
        this.cameras.main.setZoom(newTarget === "PLAYER" ? 2 : 4);
        this.cameras.main.scrollX = 0;
        this.cameras.main.scrollY = 0;
    }

    loadImage(file) {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const config = this.targetConfig[this.currentTarget] || { isSingle: true };

            // For Single Assets (Eraser, World, etc.), use the image's inherent size if not specified
            const width = (config.isSingle && !config.frameW) ? img.width : (config.frameW || 210);
            const height = (config.isSingle && !config.frameH) ? img.height : (config.frameH || 200);

            // Calculate how many frames are in the image based on width
            let framesCount = config.isSingle ? 1 : Math.floor(img.width / width);
            if (framesCount === 0) framesCount = 1; // Ensure at least 1 frame

            this.frames = [];
            this.rodOffsets = [];
            this.undoStack = [];
            this.currentFrameIndex = 0;

            for (let i = 0; i < framesCount; i++) {
                const canvasFrame = document.createElement('canvas');
                canvasFrame.width = width;
                canvasFrame.height = height;
                const ctx = canvasFrame.getContext('2d', { willReadFrequently: true });
                ctx.imageSmoothingEnabled = false;

                if (config.isSingle && (img.width !== width || img.height !== height)) {
                    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, width, height);
                } else {
                    ctx.drawImage(
                        img,
                        i * width, 0, width, height,
                        0, 0, width, height
                    );
                }
                this.frames.push(canvasFrame);
                const defaultOffsets = config.defaultOffsets || [{ x: 0, y: -40 }];
                const offset = i < defaultOffsets.length ? defaultOffsets[i] : (defaultOffsets[0] || { x: 0, y: -40 });
                this.rodOffsets.push({ ...offset });
            }

            this.workingFilename = file.name.split('.').slice(0, -1).join('.'); // Set filename without extension
            this.updateFilenameOverlay();

            this.renderCurrentFrame();
            this.updateHTMLTimeline();
            URL.revokeObjectURL(url);
            this.sound.play("click");

            // Auto zoom for large images
            if (width > 500) this.cameras.main.setZoom(0.5);
            else this.cameras.main.setZoom(2);
        };
        img.onerror = () => {
            alert("Error loading image file.");
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }

    loadJSON(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data && data.rodOffsets && Array.isArray(data.rodOffsets)) {
                    // Check if frame count matches
                    if (data.rodOffsets.length !== this.frames.length) {
                        const confirmLoad = confirm(`Warning: JSON has ${data.rodOffsets.length} offsets, but current editor has ${this.frames.length} frames. Load anyway?`);
                        if (!confirmLoad) return;
                    }

                    this.rodOffsets = data.rodOffsets.map(offset => ({
                        x: offset.x || 0,
                        y: offset.y || 0
                    }));

                    this.workingFilename = file.name.split('.').slice(0, -1).join('.').replace('_offsets', ''); // Set filename without extension
                    this.updateFilenameOverlay();

                    this.renderCurrentFrame();
                    this.updateHTMLTimeline();
                    this.sound.play("click");
                } else {
                    alert("Invalid JSON format. Expected { rodOffsets: [...] }");
                }
            } catch (err) {
                console.error("Error parsing JSON:", err);
                alert("Failed to parse JSON file.");
            }
        };
        reader.readAsText(file);
    }

    updateEraserPreview() {
        if (!this.eraserCanvas) return;
        const key = "eraser_preview_" + Date.now();
        this.textures.addBase64(key, this.eraserCanvas.toDataURL());
        this.textures.once("addtexture", () => {
            if (this.eraserSprite) this.eraserSprite.destroy();
            this.eraserSprite = this.add.sprite(VIEW_W / 2, VIEW_H / 2, key);
            this.eraserSprite.setDepth(100); // High depth for UI preview
            this.eraserSprite.setVisible(this.editorMode === "ERASER");
        });
    }

    setupWorldDecorMode() {
        if (this.worldLayers) return;
        this.worldLayers = [
            { name: "Far Background", key: "apocalypse_bg", scale: 1.0, scroll: 0.05 },
            { name: "Near Background", key: "apocalypse_near_bg", scale: 0.1, scroll: 0.2 }
        ];
        this.worldSprites = this.worldLayers.map((l, i) => {
            const s = this.add.tileSprite(VIEW_W / 2, VIEW_H / 2, 1000, 600, l.key);
            s.setScale(l.scale);
            s.setDepth(10 + i);
            s.setVisible(false);

            // Allow clicking on a layer to "Load" it into the editor
            s.setInteractive();
            s.on("pointerdown", () => {
                if (confirm(`Load ${l.name} into the editor for painting?`)) {
                    this.loadWorldLayerToEditor(l.key);
                }
            });

            return s;
        });
        this.worldLayerIndex = 0;
    }

    loadWorldLayerToEditor(key) {
        const tex = this.textures.get(key);
        const source = tex.getSourceImage();
        if (!source) return;

        this.currentTarget = "WORLD_LAYER";
        this.targetConfig["WORLD_LAYER"] = { key, frameW: 0, frameH: 0, filename: key, isSingle: true };

        this.frames = [];
        this.rodOffsets = [];
        this.undoStack = [];
        this.currentTool = "PEN";
        this.workingFilename = "untitled"; // Track current active filename
        this.currentFrameIndex = 0;

        const canvas = document.createElement("canvas");
        canvas.width = source.width;
        canvas.height = source.height;
        canvas.getContext("2d").drawImage(source, 0, 0);

        this.frames.push(canvas);
        this.rodOffsets.push({ x: 0, y: 0 });

        this.renderCurrentFrame();
        this.updateHTMLTimeline();
        this.setTool("PEN");

        // Adjust zoom for potentially huge BG
        this.cameras.main.setZoom(0.2);
        this.cameras.main.centerOn(VIEW_W / 2, VIEW_H / 2);
    }

    updateWorldUI() {
        const l = this.worldLayers[this.worldLayerIndex];
        const getBtn = (id) => document.getElementById(id);
        getBtn("layer-scale").value = l.scale;
        getBtn("layer-scale-val").innerText = l.scale.toFixed(1);
        getBtn("layer-scroll").value = l.scroll;
        getBtn("layer-scroll-val").innerText = l.scroll.toFixed(2);

        if (this.worldSprites) {
            this.worldSprites.forEach((s, i) => s.setVisible(this.editorMode === "WORLD" && i === this.worldLayerIndex));
        }
    }

    applyWorldChanges(type, val) {
        if (!this.worldLayers) return;
        const l = this.worldLayers[this.worldLayerIndex];
        const s = this.worldSprites[this.worldLayerIndex];
        if (type === "scale") { l.scale = val; s.setScale(val); }
        if (type === "scroll") { l.scroll = val; }
    }

    update(time, delta) {
        if (!this.cursors) return;

        // Pan move speed adjusted by zoom
        const moveSpeed = (500 / this.cameras.main.zoom) * (delta / 1000);
        const cam = this.cameras.main;

        if (this.cursors.left.isDown) cam.scrollX -= moveSpeed;
        if (this.cursors.right.isDown) cam.scrollX += moveSpeed;
        if (this.cursors.up.isDown) cam.scrollY -= moveSpeed;
        if (this.cursors.down.isDown) cam.scrollY += moveSpeed;
    }
}
