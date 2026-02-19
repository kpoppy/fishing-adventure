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
    }

    hideModal() {
        if (this.modal) this.modal.style.display = "none";
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
        // Depth Meter
        if (document.getElementById("depth-meter")) {
            const depth = state.depth || 0;
            document.getElementById("depth-meter").textContent = `DEPTH: ${depth.toFixed(1)}m`;
        }

        // Fish Count
        if (document.getElementById("fish-count")) {
            document.getElementById("fish-count").textContent = `FISH: ${state.fish}`;
        }

        // Money
        if (document.getElementById("money-text")) {
            document.getElementById("money-text").textContent = `$${state.money}`;
        }

        // Time
        if (this.timeEl) this.timeEl.textContent = `${state.time.toFixed(1)}s`;
    }

}
