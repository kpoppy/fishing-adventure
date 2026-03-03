import { MAX_WAVE } from "../constants.js";
import { GameConfig } from "../config/GameConfig.js";
import { languageManager } from "./LanguageManager.js";

export class UIManager {
    constructor(scene) {
        this.scene = scene;
        this.cacheElements();
        this.updateLabels(); // 초기 레이블 설정
    }

    cacheElements() {
        this.waveEl = document.getElementById("wave-text");
        this.enemyEl = document.getElementById("enemy-text");
        this.bossHud = document.getElementById("boss-hud");
        this.bossFill = document.getElementById("boss-fill");
        this.buoyancyEl = document.getElementById("buoyancy-text");
        this.weightEl = document.getElementById("weight-text");
        this.returnSpeedEl = document.getElementById("return-speed-text");
        this.recentCatchesEl = document.getElementById("recent-catches");

        // Survival Bars & Labels
        this.hpBar = document.getElementById("hp-bar");
        this.hungerBar = document.getElementById("hunger-bar");
        this.fuelBar = document.getElementById("fuel-bar");
        this.radBar = document.getElementById("rad-bar");

        this.lblHp = document.getElementById("lbl-hp");
        this.lblGulp = document.getElementById("lbl-gulp");
        this.lblFuel = document.getElementById("lbl-fuel");
        this.lblRad = document.getElementById("lbl-rad");

        this.timeEl = document.getElementById("time-text");
        this.moneyEl = document.getElementById("money-text");
        this.depthEl = document.getElementById("depth-meter");
        this.fishCountEl = document.getElementById("fish-count");

        this.modal = document.getElementById("game-modal");
        this.modalTitle = document.getElementById("modal-title");
        this.modalDesc = document.getElementById("modal-desc");
        this.uiLayer = document.getElementById("ui-layer");

        // New Overlays
        this.inventoryUI = document.getElementById("inventory-ui");
        this.inventoryList = document.getElementById("inventory-list");
        this.encyclopediaUI = document.getElementById("encyclopedia-ui");
        this.encyclopediaList = document.getElementById("encyclopedia-list");
        this.upgradeUI = document.getElementById("upgrade-ui");
        this.upgradeList = document.getElementById("upgrade-list");
        this.cheatUI = document.getElementById("cheat-ui");
        this.tankUI = document.getElementById("tank-ui");
        this.tankList = document.getElementById("tank-list");
        this.helpUI = document.getElementById("help-ui");
        this.worldMapUI = document.getElementById("world-map-ui");
        this.worldMapPlayerIcon = document.getElementById("map-player-icon");
        this.minimapDot = document.getElementById("player-dot");

        this.shopUI = document.getElementById("shop-ui");
        this.shopSellList = document.getElementById("shop-sell-list");
        this.shopBuyList = document.getElementById("shop-buy-list");
        this.lblSellInv = document.getElementById("lbl-sell-inventory");
        this.lblBuySupp = document.getElementById("lbl-buy-supplies");

        // Menu Titles
        this.inventoryTitle = document.querySelector("#inventory-ui h2");
        this.encyclopediaTitle = document.querySelector("#encyclopedia-ui h2");
        this.upgradeTitle = document.querySelector("#upgrade-ui h2");
        this.tankTitle = document.querySelector("#tank-ui h2");
        this.helpTitle = document.querySelector("#help-ui h2");
        this.cheatTitle = document.querySelector("#cheat-ui h2");

        // General Purpose VN Elements
        this.vnDialogueOverlay = document.getElementById("vn-dialogue-overlay");
        this.vnPortrait = document.getElementById("vn-portrait");
        this.vnNamePlate = document.getElementById("vn-name-plate");
        this.vnText = document.getElementById("vn-text");
        this.vnButtons = document.getElementById("vn-buttons");

        this.isTyping = false;
        this.typingTimer = null;
    }

    updateLabels() {
        const t = (k) => languageManager.t(k);

        if (this.lblHp) this.lblHp.textContent = t("hp");
        if (this.lblGulp) this.lblGulp.textContent = t("gulp");
        if (this.lblFuel) this.lblFuel.textContent = t("fuel");
        if (this.lblRad) this.lblRad.textContent = t("rad");

        if (this.lblSellInv) this.lblSellInv.textContent = t("sell_inventory");
        if (this.lblBuySupp) this.lblBuySupp.textContent = t("buy_supplies");

        // Menu Titles
        if (this.inventoryTitle) this.inventoryTitle.textContent = t("inventory");
        if (this.encyclopediaTitle) this.encyclopediaTitle.textContent = t("encyclopedia");
        if (this.upgradeTitle) this.upgradeTitle.textContent = t("boat_upgrade");
        if (this.tankTitle) this.tankTitle.textContent = t("live_well");
        if (this.helpTitle) this.helpTitle.textContent = t("h_title");
        if (this.cheatTitle) this.cheatTitle.textContent = t("debug_menu");

        // Footer Guide
        const fgBoatWorld = document.getElementById("fg-boat-world");
        const fgBoatLocal = document.getElementById("fg-boat-local");
        const fgPlayerLocal = document.getElementById("fg-player-local");
        const fgHelp = document.getElementById("fg-help");
        const fgBag = document.getElementById("fg-bag");
        const fgGuide = document.getElementById("fg-guide");
        const fgTank = document.getElementById("fg-tank");
        const fgRefit = document.getElementById("fg-refit");
        const fgFeed = document.getElementById("fg-feed");
        const fgPet = document.getElementById("fg-pet");
        const fgDebug = document.getElementById("fg-debug");
        const fgReset = document.getElementById("fg-reset");

        if (fgBoatWorld) fgBoatWorld.textContent = t("c_boat_world");
        if (fgBoatLocal) fgBoatLocal.textContent = t("c_boat_local");
        if (fgPlayerLocal) fgPlayerLocal.textContent = t("c_player_local");
        if (fgHelp) fgHelp.textContent = t("c_help");
        if (fgBag) fgBag.textContent = t("c_bag");
        if (fgGuide) fgGuide.textContent = t("c_guide");
        if (fgTank) fgTank.textContent = t("c_tank");
        if (fgRefit) fgRefit.textContent = t("c_refit");
        if (fgFeed) fgFeed.textContent = t("c_feed");
        if (fgPet) fgPet.textContent = t("c_pet");
        if (fgDebug) fgDebug.textContent = t("c_debug");
        if (fgReset) fgReset.textContent = t("c_reset");

        // Detailed Help Content
        const hMoveTitle = document.getElementById("h-move-title");
        const hEtcTitle = document.getElementById("h-etc-title");
        if (hMoveTitle) hMoveTitle.textContent = t("h_move_title");
        if (hEtcTitle) hEtcTitle.textContent = t("h_etc_title");

        for (let i = 1; i <= 4; i++) {
            const el = document.getElementById(`h-move-${i}`);
            if (el) el.textContent = t(`h_move_${i}`);
        }
        for (let i = 1; i <= 3; i++) {
            const el = document.getElementById(`h-etc-${i}`);
            if (el) el.textContent = t(`h_etc_${i}`);
        }
    }

    showDialogue(title, desc, buttons = []) {
        if (!this.modal) return;
        this.modal.style.display = "flex";
        this.modalTitle.textContent = title;
        this.modalDesc.textContent = desc;

        if (this.modalButtons) {
            this.modalButtons.innerHTML = "";
            buttons.forEach(btnInfo => {
                const btn = document.createElement("button");
                btn.className = "modal-btn";
                btn.textContent = btnInfo.text;
                btn.onclick = () => {
                    if (btnInfo.onClick) btnInfo.onClick();
                    this.hideModal();
                };
                this.modalButtons.appendChild(btn);
            });
        }
    }

    /**
     * 범용 비주얼 노벨 스타일 대화창 표시
     * @param {Object} options { portrait, name, text, buttons, typingSpeed }
     */
    showVNDialogue(options) {
        if (!this.vnDialogueOverlay) return;

        this.hideModal(); // 다른 UI 닫기
        this.vnDialogueOverlay.style.display = "flex";

        if (options.portrait) {
            this.vnPortrait.src = options.portrait;
            this.vnPortrait.parentElement.style.display = "flex";
        } else {
            this.vnPortrait.parentElement.style.display = "none";
        }

        if (this.vnNamePlate) {
            this.vnNamePlate.querySelector("span").textContent = options.name || "???";
        }

        // 대화 텍스트 타이핑 효과 적용
        if (options.text) {
            this.typeWriter("vn-text", options.text, options.typingSpeed || 30);
        }

        // 버튼 생성
        if (this.vnButtons) {
            this.vnButtons.innerHTML = "";
            if (options.buttons) {
                options.buttons.forEach(btnInfo => {
                    const btn = document.createElement("button");
                    btn.className = "modal-btn";
                    btn.textContent = btnInfo.text;
                    btn.onclick = () => {
                        if (btnInfo.onClick) btnInfo.onClick();
                        this.hideVN();
                    };
                    this.vnButtons.appendChild(btn);
                });
            }
        }
    }

    hideVN() {
        if (this.vnDialogueOverlay) {
            this.vnDialogueOverlay.style.display = "none";
            // 입력 충돌 방지를 위한 타임스탬프 기록
            if (this.scene && this.scene.time) {
                this.scene.lastMenuCloseTime = this.scene.time.now;
            }
        }
    }

    setHUDVisible(visible) {
        if (this.uiLayer) {
            this.uiLayer.style.display = visible ? "flex" : "none";
        }
    }

    hideModal() {
        if (this.modal) this.modal.style.display = "none";
        if (this.inventoryUI) this.inventoryUI.style.display = "none";
        if (this.encyclopediaUI) this.encyclopediaUI.style.display = "none";
        if (this.upgradeUI) this.upgradeUI.style.display = "none";
        if (this.cheatUI) this.cheatUI.style.display = "none";
        if (this.tankUI) this.tankUI.style.display = "none";
        if (this.shopUI) this.shopUI.style.display = "none";
        if (this.vnDialogueOverlay) this.vnDialogueOverlay.style.display = "none";
        if (this.helpUI) this.helpUI.style.display = "none";

        // 입력 충돌 방지를 위한 타임스탬프 기록
        if (this.scene && this.scene.time) {
            this.scene.lastMenuCloseTime = this.scene.time.now;
        }
    }

    toggleShop(gameState, dataManager) {
        if (!this.shopUI) return;
        if (this.shopUI.style.display === "flex") {
            this.shopUI.style.display = "none";
            if (this.typingTimer) clearTimeout(this.typingTimer);
            this.isTyping = false;
        } else {
            this.hideModal();
            this.shopUI.style.display = "flex";
            this.updateShop(gameState, dataManager);

            // 타이핑 효과 적용
            const welcomeText = "거래소 규칙이다. 무기 집어치우고 허튼짓 마라. 신선한 물건이라도 가져왔나? 연료랑 부품은 넉넉하니 거래할 거 있으면 내놓고, 아님 비켜.";
            this.typeWriter("shop-dialog-text", welcomeText);
        }
    }

    typeWriter(elementId, text, speed = 30) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (this.typingTimer) clearTimeout(this.typingTimer);
        this.isTyping = true;
        element.textContent = "";

        let i = 0;
        const type = () => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                this.typingTimer = setTimeout(type, speed);
            } else {
                this.isTyping = false;
                this.typingTimer = null;
            }
        };
        type();
    }

    toggleInventory(gameState, dataManager) {
        if (!this.inventoryUI) return;

        if (this.inventoryUI.style.display === "flex") {
            this.inventoryUI.style.display = "none";
        } else {
            this.hideModal(); // Close others
            this.inventoryUI.style.display = "flex";
            this.updateInventory(gameState, dataManager);
        }
    }

    toggleWorldMap() {
        if (!this.worldMapUI) return;
        if (this.worldMapUI.style.display === "flex") {
            this.worldMapUI.style.display = "none";
        } else {
            this.hideModal();
            this.worldMapUI.style.display = "flex";
        }
    }

    updateMaps(posX, posY, worldBounds, angle = 0, flipX = false) {
        // posX is world X, posY is internal virtual depth (0 to 10000)

        // 0. Update Player Icon Rotation (World Map)
        if (this.worldMapPlayerIcon) {
            // Apply Phaser angle and flipX to CSS transform (compensate for initial translate)
            // 기본 이모지 방향이 왼쪽이므로, flipX 상태에 따라 scaleX를 반대로 적용
            const scaleX = flipX ? 1 : -1;
            this.worldMapPlayerIcon.style.transform = `translate(-50%, -50%) rotate(${angle}deg) scaleX(${scaleX})`;
        }

        // 1. Minimap Update (Repeating Grid for local navigation)
        if (this.minimapDot && this.minimapDot.parentElement) {
            const container = this.minimapDot.parentElement; // #minimap-container
            // 격자 패턴 이동 (로컬 감각 유지를 위해 반복)
            const mx = -(posX % 5000) / 5000 * 100;
            const my = -(posY % 2000) / 2000 * 100;
            container.style.backgroundPosition = `${mx}px ${my}px`;
        }

        // 2. Scenario Points Update (Both World Map & Minimap)
        const mapContent = document.getElementById("world-map-content");
        const minimapContainer = document.getElementById("minimap-container");

        if (this.scene.scenarioPoints) {
            Object.entries(this.scene.scenarioPoints).forEach(([id, pos]) => {
                // --- A. World Map Update ---
                if (this.worldMapUI && mapContent) {
                    const mapW = 12000; // Big Zoom for visibility
                    const mapH = 2400; // Big Zoom
                    const totalWidth = 2000000;
                    const totalHeight = 2000000;

                    const pointId = `point-${id}`;
                    let point = document.getElementById(pointId);
                    if (!point) {
                        point = document.createElement("div");
                        point.className = "map-point";
                        point.id = pointId;
                        mapContent.appendChild(point);
                    }

                    // World map icons
                    let labelText = "";
                    if (id === "outpost") {
                        point.textContent = "⛽";
                        point.title = "NEUTRAL ZONE BARGE (Trading Post)";
                        point.style.fontSize = "32px";
                        point.style.filter = "drop-shadow(0 0 10px #ffcc00)";
                        labelText = "거래소";
                    } else if (id === "rift") {
                        point.textContent = "🌋";
                        point.title = "Scenario 1: Crustal Rift";
                        labelText = "지각 균열";
                    } else if (id === "seepage") {
                        point.textContent = "🏚️";
                        point.title = "Scenario 2: Cooling Seepage";
                        labelText = "냉각수 유출지";
                    } else if (id === "filter") {
                        point.textContent = "💎";
                        point.title = "Scenario 3: Limestone Filter";
                        labelText = "석회암 필터";
                    } else if (id === "plant") {
                        point.textContent = "🦾";
                        point.title = "Scenario 4: Ghost Desalinator";
                        labelText = "유령 담수화 시설";
                    }

                    // Add text label below icon
                    let label = point.querySelector(".map-point-label");
                    if (!label) {
                        label = document.createElement("div");
                        label.className = "map-point-label";
                        point.appendChild(label);
                    }
                    label.textContent = labelText;

                    // Relative to center (0,0) of our massive map
                    const px = ((pos.x + (totalWidth / 2)) / totalWidth) * mapW;
                    const py = ((pos.y + (totalHeight / 2)) / totalHeight) * mapH;
                    point.style.left = `${px}px`;
                    point.style.top = `${py}px`;
                    point.style.transform = "translate(-50%, -50%)";
                }

                // --- B. Minimap Update (Outpost only for clarity) ---
                if (minimapContainer && id === "outpost") {
                    const miniPointId = `mini-point-${id}`;
                    let miniPoint = document.getElementById(miniPointId);
                    if (!miniPoint) {
                        miniPoint = document.createElement("div");
                        miniPoint.className = "minimap-point";
                        miniPoint.id = miniPointId;
                        minimapContainer.appendChild(miniPoint);
                    }

                    // Display as dots on minimap (Yellow for outpost)
                    miniPoint.style.backgroundColor = "#ffcc00";
                    miniPoint.style.boxShadow = "0 0 8px #ffcc00";
                    miniPoint.style.width = "8px";
                    miniPoint.style.height = "8px";
                    miniPoint.style.border = "1px solid #fff";

                    // Calculate relative position based on 5000x2000 local grid
                    const relX = ((pos.x - posX) / 5000) * 100 + 50;
                    const relY = ((pos.y - posY) / 2000) * 100 + 50;

                    // Clamping for outpost to stay on edge if out of bounds
                    const clampedX = Math.max(5, Math.min(95, relX));
                    const clampedY = Math.max(5, Math.min(95, relY));

                    miniPoint.style.left = `${clampedX}%`;
                    miniPoint.style.top = `${clampedY}%`;

                    // Outpost is critical, show always but with subtle opacity if far
                    if (Math.abs(relX - 50) > 50 || Math.abs(relY - 50) > 50) {
                        miniPoint.style.opacity = "0.5";
                    } else {
                        miniPoint.style.opacity = "1.0";
                    }
                    miniPoint.style.display = "block";
                }
            });
        }

        // 3. World Map Content Translation
        if (this.worldMapUI && mapContent) {
            const viewportW = 800;
            const viewportH = 480;
            const mapW = 12000;
            const mapH = 2400;
            const totalWidth = 2000000;
            const totalHeight = 2000000;

            // 중앙(0,0)을 기준으로 하는 상대 좌표 비율 계산
            const relX = (posX + (totalWidth / 2)) / totalWidth;
            const relY = (posY + (totalHeight / 2)) / totalHeight;

            // 중앙 정렬 로직 보정: 
            // 배 아이콘이 이미 #world-map-container의 중앙(viewportW/2, viewportH/2)에 고정되어 있으므로,
            // 맵 콘텐츠의 (relX, relY) 지점도 컨테이너의 중앙에 정확히 겹치도록 이동량을 계산합니다.
            const offsetX = (viewportW * 0.5) - (relX * mapW);
            const offsetY = (viewportH * 0.5) - (relY * mapH);

            mapContent.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        }
    }

    toggleEncyclopedia(gameState, dataManager) {
        if (!this.encyclopediaUI) return;

        if (this.encyclopediaUI.style.display === "flex") {
            this.encyclopediaUI.style.display = "none";
        } else {
            this.hideModal(); // Close others
            this.encyclopediaUI.style.display = "flex";
            this.updateEncyclopedia(gameState, dataManager);
        }
    }

    updateInventory(gameState, dataManager) {
        if (!this.inventoryList) return;
        this.inventoryList.innerHTML = "";

        const items = gameState.inventory;
        const itemIds = Object.keys(items);

        const t = (k) => languageManager.t(k);
        if (itemIds.length === 0) {
            this.inventoryList.innerHTML = `<p style='grid-column: span 2; text-align: center;'>${t("empty_bag")}</p>`;
            return;
        }

        itemIds.forEach(id => {
            const count = items[id];
            // 1. 다국어 매니저에서 직접 키(ID)로 번역 찾기
            let name = t(id);
            let desc = "";

            // 2. 만약 번역이 ID와 같다면(못 찾았다면) 물고기 데이터에서 검색
            if (name === id) {
                const fishData = dataManager.getAllFish().find(f => f.component === id);
                if (fishData) {
                    name = fishData.componentName;
                    desc = fishData.description;
                }
            }

            const itemDiv = document.createElement("div");
            itemDiv.className = "ui-item";
            itemDiv.innerHTML = `
                <div class="name">${name}</div>
                <div class="count">${t("owned_count")}: ${count}</div>
            `;
            this.inventoryList.appendChild(itemDiv);
        });
    }

    updateEncyclopedia(gameState, dataManager) {
        if (!this.encyclopediaList) return;
        this.encyclopediaList.innerHTML = "";
        const t = (k) => languageManager.t(k);

        const allFish = dataManager.getAllFish();

        allFish.forEach(fish => {
            const discovered = gameState.isFishDiscovered(fish.id);
            const itemDiv = document.createElement("div");
            itemDiv.className = discovered ? "ui-item" : "ui-item locked-item";

            if (discovered) {
                itemDiv.innerHTML = `
                    <div class="name">${fish.name}</div>
                    <div class="desc">${fish.scientificName}</div>
                    <div class="desc" style="color: #66ccff; margin-top: 8px;">[특수 성분]</div>
                    <div class="desc">${fish.componentName}</div>
                `;
            } else {
                itemDiv.innerHTML = `
                    <div class="name">???</div>
                    <div class="desc">${t("not_discovered")}</div>
                `;
            }
            this.encyclopediaList.appendChild(itemDiv);
        });
    }

    toggleUpgrade(gameState, dataManager) {
        if (!this.upgradeUI) return;

        if (this.upgradeUI.style.display === "flex") {
            this.upgradeUI.style.display = "none";
        } else {
            this.hideModal();
            this.upgradeUI.style.display = "flex";
            this.updateUpgradeList(gameState, dataManager);
        }
    }

    updateUpgradeList(gameState, dataManager) {
        if (!this.upgradeList) return;
        this.upgradeList.innerHTML = "";
        const t = (k) => languageManager.t(k);

        const upgradeOptions = [
            { id: "speed", name: t("up_speed_name"), component: "ISOTOPE_BATTERY", desc: t("up_speed_desc") },
            { id: "armor", name: t("up_armor_name"), component: "ANTI_RAD_LEAD", desc: t("up_armor_desc") },
            { id: "light", name: t("up_light_name"), component: "GLOW_BONE", desc: t("up_light_desc") }
        ];

        upgradeOptions.forEach(opt => {
            const level = gameState.upgrades[opt.id] || 0;
            const cost = (level + 1) * 2; // Progressive cost: 2, 4, 6...
            const hasEnough = gameState.hasItem(opt.component, cost);

            const itemDiv = document.createElement("div");
            itemDiv.className = "ui-item";
            itemDiv.innerHTML = `
                <div class="name">${opt.name} (Lv.${level})</div>
                <div class="desc">${opt.desc}</div>
                <div class="desc" style="color: ${hasEnough ? '#00ff00' : '#ff4444'}; margin-top: 8px;">
                    ${t("up_need")}: ${cost} ${opt.component}
                </div>
                <button class="modal-btn" style="margin-top: 10px; font-size: 14px; padding: 8px;" 
                    ${hasEnough ? '' : 'disabled'}>
                    ${t("upgrade")}
                </button>
            `;

            const btn = itemDiv.querySelector("button");
            if (hasEnough) {
                btn.onclick = () => {
                    gameState.removeItem(opt.component, cost);
                    gameState.upgradeBoat(opt.id);
                    this.updateUpgradeList(gameState, dataManager);
                    // Signal scene to update visuals/logic if needed
                    this.scene.events.emit("boat-upgraded", opt.id);
                };
            }

            this.upgradeList.appendChild(itemDiv);
        });
    }

    showGameOver(isWin, timeSec, kills) {
        if (!this.modal) return;

        this.modal.style.display = "flex";
        this.modalTitle.textContent = isWin ? "VICTORY" : "GAME OVER";
        this.modalTitle.style.backgroundImage = isWin
            ? "linear-gradient(to bottom, #fff, #gold)"
            : "linear-gradient(to bottom, #ccc, #666)";
        this.modalTitle.style.textShadow = isWin
            ? "0 0 20px rgba(255, 215, 0, 0.8)"
            : "0 0 10px rgba(0, 0, 0, 0.8)";

        this.modalDesc.textContent = `Time: ${timeSec.toFixed(1)}s | Kills: ${kills}`;
    }

    update(state) {
        if (!state) return;

        // Time Update
        if (this.timeEl && state.gameTime) {
            const h = String(state.gameTime.hours).padStart(2, '0');
            const m = String(state.gameTime.minutes).padStart(2, '0');
            this.timeEl.textContent = `${h}:${m}`;
        }

        // Depth Meter
        if (document.getElementById("depth-meter")) {
            const depth = state.depth || 0;
            document.getElementById("depth-meter").textContent = `DEPTH: ${depth.toFixed(1)}m`;
        }

        // Fish Count
        if (document.getElementById("fish-count")) {
            const fish = state.fish !== undefined ? state.fish : 0;
            document.getElementById("fish-count").textContent = `FISH: ${fish}`;
        }

        // Buoyancy
        if (this.buoyancyEl) {
            if (state.buoyancy !== undefined) {
                this.buoyancyEl.style.display = "block";
                this.buoyancyEl.textContent = `BUOYANCY: ${state.buoyancy}`;
            } else {
                this.buoyancyEl.style.display = "none";
            }
        }

        // Weight
        if (this.weightEl) {
            if (state.weight !== undefined) {
                this.weightEl.style.display = "block";
                this.weightEl.textContent = `WEIGHT: ${state.weight}`;
            } else {
                this.weightEl.style.display = "none";
            }
        }

        // Return Speed
        if (this.returnSpeedEl) {
            if (state.returnSpeed !== undefined) {
                this.returnSpeedEl.style.display = "block";
                this.returnSpeedEl.textContent = `RETURN SPD: ${state.returnSpeed.toFixed(2)}`;
            } else {
                this.returnSpeedEl.style.display = "none";
            }
        }

        // Money
        if (document.getElementById("money-text")) {
            const money = state.money !== undefined ? state.money : 0;
            document.getElementById("money-text").textContent = `$${money}`;
        }

        if (this.moneyEl && state.money !== undefined) {
            this.moneyEl.textContent = `$${state.money}`;
        }

        if (this.depthEl && state.depth !== undefined) {
            this.depthEl.textContent = `DEPTH: ${state.depth.toFixed(1)}m`;
        }

        // Survival Bars Update
        if (state.survival) {
            const s = state.survival;
            if (this.hpBar) this.hpBar.style.width = `${(s.hp / s.maxHp) * 100}%`;
            if (this.hungerBar) this.hungerBar.style.width = `${(s.hunger / s.maxHunger) * 100}%`;
            if (this.fuelBar) this.fuelBar.style.width = `${(s.fuel / s.maxFuel) * 100}%`;
            if (this.radBar) this.radBar.style.width = `${(s.radiation / s.maxRadiation) * 100}%`;
        }

        if (this.fishCountEl && state.fishCaught !== undefined) {
            this.fishCountEl.textContent = `FISH: ${state.fishCaught}`;
        }

        // Recent Catches UI Update
        if (state.recentCatches && this.recentCatchesEl) {
            this.updateRecentCatchesUI(state.recentCatches);
        }

    }

    updateRecentCatchesUI(catches) {
        // Only update if the content actually changes to avoid flickering or unnecessary DOM ops
        const currentContent = this.recentCatchesEl.getAttribute("data-catches");
        const newContent = catches.join(",");

        if (currentContent === newContent) return;
        this.recentCatchesEl.setAttribute("data-catches", newContent);
        this.recentCatchesEl.innerHTML = "";

        // 이미지 추출을 위한 임시 캔버스 생성
        if (!this.tempCanvas) {
            this.tempCanvas = document.createElement("canvas");
            this.tempContext = this.tempCanvas.getContext("2d");
        }

        catches.forEach(fishId => {
            const item = document.createElement("div");
            item.className = "catch-item";
            item.style.display = "flex";
            item.style.alignItems = "center";
            item.style.gap = "12px";
            item.style.marginBottom = "8px";
            item.style.width = "100%";

            const icon = document.createElement("div");
            const upperId = fishId.toUpperCase();
            icon.className = "catch-icon";
            icon.setAttribute("data-type", upperId);

            // DataManager의 통합 데이터 가져오기
            const fishData = this.scene.dataManager.getFish(upperId) || this.scene.dataManager.getFish("GOLDFISH");

            // Phaser 텍스처 매니저에서 실제 로드된 소스 이미지 가져오기
            const texKey = fishData.image || "fish_sprite";
            const texture = this.scene.textures.get(texKey);

            if (texture && texture.source && texture.source[0]) {
                const sourceImg = texture.source[0].image;

                // Blob URL 대신 Data URL 추출 (보안 및 수명 주기 문제 예방)
                let imgSrc = sourceImg.src;
                if (imgSrc.startsWith("blob:")) {
                    try {
                        this.tempCanvas.width = sourceImg.width;
                        this.tempCanvas.height = sourceImg.height;
                        this.tempContext.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
                        this.tempContext.drawImage(sourceImg, 0, 0);
                        imgSrc = this.tempCanvas.toDataURL();
                    } catch (e) {
                        console.warn("[UIManager] Failed to convert blob to dataURL", e);
                    }
                }

                icon.style.backgroundImage = `url("${imgSrc}")`;
                icon.style.backgroundColor = "rgba(40, 40, 60, 0.8)";
                icon.style.backgroundRepeat = "no-repeat";
                icon.style.imageRendering = "pixelated";

                if (texKey === "custom_fish_sprite") {
                    // 커스텀/박스형 물고기 (단일 이미지 처리)
                    icon.style.backgroundSize = "contain";
                    icon.style.backgroundPosition = "center";
                } else if (fishData.frame !== undefined) {
                    // 스프라이트 시트 기반 물고기 (32px -> 48px 스케일링)
                    const cols = 20;
                    const col = fishData.frame % cols;
                    const row = Math.floor(fishData.frame / cols);
                    icon.style.backgroundSize = "960px 960px"; // 640px * 1.5
                    icon.style.backgroundPosition = `-${col * 48}px -${row * 48}px`;
                }
            }

            const nameEl = document.createElement("div");
            nameEl.className = "catch-name";
            nameEl.textContent = fishData ? fishData.name : fishId;
            nameEl.style.color = "#fff";
            nameEl.style.fontSize = "14px";
            nameEl.style.fontWeight = "bold";
            nameEl.style.textShadow = "1px 1px 2px #000";

            item.appendChild(icon);
            item.appendChild(nameEl);
            this.recentCatchesEl.appendChild(item);
        });
    }

    toggleCheatMenu() {
        if (!this.cheatUI) return;

        if (this.cheatUI.style.display === "flex") {
            this.cheatUI.style.display = "none";
        } else {
            this.hideModal();
            this.cheatUI.style.display = "flex";
            this.setupCheatHandlers();
        }
    }

    setupCheatHandlers() {
        const btnMoney = document.getElementById("cheat-money");
        const btnItems = document.getElementById("cheat-items");
        const btnFish = document.getElementById("cheat-fish");
        const btnUpgrade = document.getElementById("cheat-upgrade");
        const btnPet = document.getElementById("cheat-pet");

        if (btnMoney) btnMoney.onclick = () => this.scene.events.emit("cheat-money");
        if (btnItems) btnItems.onclick = () => this.scene.events.emit("cheat-items");
        if (btnFish) btnFish.onclick = () => this.scene.events.emit("cheat-fish");
        if (btnUpgrade) btnUpgrade.onclick = () => this.scene.events.emit("cheat-upgrade");
        if (btnPet) btnPet.onclick = () => this.scene.events.emit("cheat-pet");

        // Jump buttons
        const jumpRift = document.getElementById("jump-rift");
        const jumpSeepage = document.getElementById("jump-seepage");
        const jumpFilter = document.getElementById("jump-filter");
        const jumpPlant = document.getElementById("jump-plant");
        const jumpOutpost = document.getElementById("jump-outpost");

        if (jumpRift) jumpRift.onclick = () => this.scene.events.emit("debug-jump", "rift");
        if (jumpSeepage) jumpSeepage.onclick = () => this.scene.events.emit("debug-jump", "seepage");
        if (jumpFilter) jumpFilter.onclick = () => this.scene.events.emit("debug-jump", "filter");
        if (jumpPlant) jumpPlant.onclick = () => this.scene.events.emit("debug-jump", "plant");
        if (jumpOutpost) jumpOutpost.onclick = () => this.scene.events.emit("debug-jump", "outpost");
    }

    toggleTank(gameState, dataManager) {
        if (!this.tankUI) return;

        if (this.tankUI.style.display === "flex") {
            this.tankUI.style.display = "none";
        } else {
            this.hideModal();
            this.tankUI.style.display = "flex";
            this.updateTank(gameState, dataManager);
        }
    }

    updateTank(gameState, dataManager) {
        if (!this.tankList) return;
        this.tankList.innerHTML = "";
        const t = (k) => languageManager.t(k);

        const captured = gameState.capturedFish || [];

        if (captured.length === 0) {
            this.tankList.innerHTML = `<p style='grid-column: span 2; text-align: center; color: #88ccee;'>${t("empty_tank")}</p>`;
            return;
        }

        captured.forEach(fishEntry => {
            const data = dataManager.getFish(fishEntry.id);
            if (!data) return;

            const fishDiv = document.createElement("div");
            fishDiv.className = "fish-entry";
            fishDiv.innerHTML = `
                <div class="info">
                    <div class="name">${data.name}</div>
                    <div class="details">${t("caught_depth")}: ${fishEntry.depth.toFixed(1)}m</div>
                </div>
                <div class="status" style="font-size: 10px; color: #00ff00;">LIVE</div>
            `;
            this.tankList.appendChild(fishDiv);
        });
    }

    toggleHelp() {
        if (!this.helpUI) {
            console.error("[UIManager] helpUI element not found!");
            return;
        }

        if (this.helpUI.style.display === "flex") {
            this.helpUI.style.display = "none";
        } else {
            this.hideModal();
            this.helpUI.style.display = "flex";
        }
    }
    updateShop(gameState, dataManager) {
        if (!this.shopSellList || !this.shopBuyList) return;
        this.shopSellList.innerHTML = "";
        this.shopBuyList.innerHTML = "";
        const t = (k) => languageManager.t(k);

        // 1. Sell Section: List items in inventory that have value (fish components)
        const items = gameState.inventory;
        Object.keys(items).forEach(id => {
            const count = items[id];
            if (count <= 0) return;

            const fishData = dataManager.getAllFish().find(f => f.component === id);
            if (fishData) {
                const itemDiv = document.createElement("div");
                itemDiv.className = "ui-item";
                itemDiv.style.flexDirection = "row";
                itemDiv.style.justifyContent = "space-between";
                itemDiv.style.alignItems = "center";

                const sellPrice = Math.floor(fishData.id.length * 5); // Dummy sell price or use fish value

                itemDiv.innerHTML = `
                    <div style="flex: 1;">
                        <div class="name">${fishData.componentName}</div>
                        <div class="desc">${t("owned_count")}: ${count} | ${t("per_unit")} $${sellPrice}</div>
                    </div>
                    <button class="modal-btn" style="font-size: 10px; padding: 5px 10px;">SELL ALL</button>
                `;

                const btn = itemDiv.querySelector("button");
                btn.onclick = () => {
                    const totalGain = count * sellPrice;
                    gameState.money += totalGain;
                    gameState.removeItem(id, count);
                    this.updateShop(gameState, dataManager);
                    this.scene.events.emit("money-updated");
                };

                this.shopSellList.appendChild(itemDiv);
            }
        });

        if (this.shopSellList.innerHTML === "") {
            this.shopSellList.innerHTML = `<div class='desc'>${t("no_sell_items")}</div>`;
        }

        // 2. Buy Section: Supplies
        const shopItems = [
            { id: "FUEL", name: t("item_fuel_name"), desc: t("item_fuel_desc"), cost: 50, action: () => { gameState.restoreFuel(30); } },
            { id: "REPAIR_KIT", name: t("item_repair_name"), desc: t("item_repair_desc"), cost: 100, action: () => { gameState.restoreHP(20); } },
            { id: "RATION", name: t("item_ration_name"), desc: t("item_ration_desc"), cost: 30, action: () => { gameState.feed(40); } }
        ];

        shopItems.forEach(item => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "ui-item";
            itemDiv.style.flexDirection = "row";
            itemDiv.style.justifyContent = "space-between";
            itemDiv.style.alignItems = "center";

            const canAfford = gameState.money >= item.cost;

            itemDiv.innerHTML = `
                <div style="flex: 1;">
                    <div class="name">${item.name}</div>
                    <div class="desc">${item.desc} | $${item.cost}</div>
                </div>
                <button class="modal-btn" style="font-size: 10px; padding: 5px 10px;" ${canAfford ? "" : "disabled"}>BUY</button>
            `;

            const btn = itemDiv.querySelector("button");
            btn.onclick = () => {
                if (gameState.money >= item.cost) {
                    gameState.money -= item.cost;
                    item.action();
                    this.updateShop(gameState, dataManager);
                    this.scene.events.emit("money-updated");
                }
            };

            this.shopBuyList.appendChild(itemDiv);
        });
    }
}
