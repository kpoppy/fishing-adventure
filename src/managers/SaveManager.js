import { VIEW_W } from "../constants.js";

export class SaveManager {
    constructor(scene) {
        this.scene = scene;
        this.SAVE_KEY = "gostop_save";
        this.BEST_TIME_KEY = "godori-best-sec";
    }

    save(gameState) {
        const state = {
            progress: gameState.progress,
            inventory: gameState.inventory,
            discoveredFish: Array.from(gameState.discoveredFish), // Convert Set to Array for JSON
            upgrades: gameState.upgrades,
            pet: gameState.pet,
            savedAt: Date.now()
        };
        try {
            localStorage.setItem(this.SAVE_KEY, JSON.stringify(state));
            this.scene.effectManager.showFloatingText(VIEW_W - 100, 50, "SYSTEM SAVED", "#00ff00");
        } catch (e) {
            console.error("Save failed:", e);
        }
    }

    load() {
        try {
            const raw = localStorage.getItem(this.SAVE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            console.error("Load failed:", e);
            return null;
        }
    }

    clear() {
        localStorage.removeItem(this.SAVE_KEY);
    }

    readBestTime() {
        try {
            const raw = localStorage.getItem(this.BEST_TIME_KEY);
            if (!raw) return null;
            const value = Number(raw);
            return (Number.isFinite(value) && value > 0) ? value : null;
        } catch {
            return null;
        }
    }

    updateBestTime(currentSec) {
        const best = this.readBestTime();
        const nextBest = best === null ? currentSec : Math.min(best, currentSec);
        try {
            localStorage.setItem(this.BEST_TIME_KEY, String(nextBest));
        } catch {
            // Ignore
        }
        return nextBest;
    }
}
