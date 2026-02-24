import { MAX_WAVE } from "../constants.js";

export class UIManager {
    constructor(scene) {
        this.scene = scene;
        this.cacheElements();
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

        this.hpBar = document.getElementById("hp-bar");
        this.hpText = document.getElementById("hp-text");
        this.ultBar = document.getElementById("ult-bar");
        this.ultText = document.getElementById("ult-text");

        this.timeEl = document.getElementById("time-text");
        this.killEl = document.getElementById("kill-text");
        this.godoriEl = document.getElementById("godori-text");

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
        if (this.helpUI) this.helpUI.style.display = "none";
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

        if (itemIds.length === 0) {
            this.inventoryList.innerHTML = "<p style='grid-column: span 2; text-align: center;'>가방이 비어 있습니다.</p>";
            return;
        }

        itemIds.forEach(id => {
            const count = items[id];
            // Find component name if possible (this is a bit tricky, might need a central item DB later)
            // For now, let's just show ID or look up in dataManager
            let name = id;
            let desc = "";
            const fishData = dataManager.getAllFish().find(f => f.component === id);
            if (fishData) {
                name = fishData.componentName;
                desc = fishData.description;
            }

            const itemDiv = document.createElement("div");
            itemDiv.className = "ui-item";
            itemDiv.innerHTML = `
                <div class="name">${name}</div>
                <div class="count">보유: ${count}</div>
            `;
            this.inventoryList.appendChild(itemDiv);
        });
    }

    updateEncyclopedia(gameState, dataManager) {
        if (!this.encyclopediaList) return;
        this.encyclopediaList.innerHTML = "";

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
                    <div class="desc">아직 발견하지 못함</div>
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

        const upgradeOptions = [
            { id: "speed", name: "엔진 트랜스미션", component: "ISOTOPE_BATTERY", desc: "이동 속도가 증가합니다." },
            { id: "armor", name: "항방사선 장갑", component: "ANTI_RAD_LEAD", desc: "방사능 파도 저항 및 충돌 내성이 강화됩니다." },
            { id: "light", name: "심해 탐사 서치라이트", component: "GLOW_BONE", desc: "심해에서의 가시거리가 넓어집니다." }
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
                    필요: ${cost}개의 ${opt.component}
                </div>
                <button class="modal-btn" style="margin-top: 10px; font-size: 14px; padding: 8px;" 
                    ${hasEnough ? '' : 'disabled'}>
                    UPGRADE
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

        if (this.timeEl && state.gameTime) {
            const h = String(state.gameTime.hours).padStart(2, '0');
            const m = String(state.gameTime.minutes).padStart(2, '0');
            this.timeEl.textContent = `${h}:${m}`;
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

        catches.forEach(fishId => {
            const item = document.createElement("div");
            item.className = "catch-item";

            const icon = document.createElement("div");
            icon.className = "catch-icon";
            icon.setAttribute("data-type", fishId);

            const nameEl = document.createElement("div");
            nameEl.className = "catch-name";

            const fishData = this.scene.dataManager.getFish(fishId);
            nameEl.textContent = fishData ? fishData.name : fishId;

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

        const captured = gameState.capturedFish || [];

        if (captured.length === 0) {
            this.tankList.innerHTML = "<p style='grid-column: span 2; text-align: center; color: #88ccee;'>수조가 비어 있습니다.</p>";
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
                    <div class="details">잡힌 깊이: ${fishEntry.depth.toFixed(1)}m</div>
                </div>
                <div class="status" style="font-size: 10px; color: #00ff00;">LIVE</div>
            `;
            this.tankList.appendChild(fishDiv);
        });
    }

    toggleHelp() {
        if (!this.helpUI) return;

        if (this.helpUI.style.display === "flex") {
            this.helpUI.style.display = "none";
        } else {
            this.hideModal();
            this.helpUI.style.display = "flex";
        }
    }
}
