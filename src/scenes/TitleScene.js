import { VIEW_W, VIEW_H, DEPTH, COLORS } from "../constants.js";

export class TitleScene extends Phaser.Scene {
    constructor() {
        super("TitleScene");
        this.menuItems = ["NEW GAME", "LOAD GAME", "RANKING", "OPTION", "EXIT"];
        this.selectedItemIndex = 0;
        this.isMenuVisible = false;
    }

    preload() {
        this.load.image("background", "assets/background.png?v=2");
    }

    create() {
        // Background
        this.bg = this.add.tileSprite(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, "background");
        this.bg.setTint(0x555555);

        // Logo
        // Logo (now text)
        this.logo = this.add.text(VIEW_W / 2, VIEW_H / 2 - 100, "FISHING\nADVENTURE", {
            fontFamily: "Press Start 2P",
            fontSize: "60px",
            color: "#ffffff",
            align: "center",
            stroke: "#000000",
            strokeThickness: 8
        }).setOrigin(0.5);

        // Bobbing Animation
        this.tweens.add({
            targets: this.logo,
            y: this.logo.y - 10, // Adjusted for new text position
            duration: 1500, // Adjusted duration
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // "CLICK TO START" Text
        this.pressText = this.add.text(VIEW_W / 2, VIEW_H - 120, "PLEASE CLICK OR PRESS SPACE", {
            fontFamily: "Arial", fontSize: "24px", color: "#ffffff"
        }).setOrigin(0.5);

        this.tweens.add({
            targets: this.pressText,
            alpha: 0.2,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        // Menu Container (Hidden initially)
        this.menuContainer = this.add.container(0, 0);
        this.menuContainer.setVisible(false);

        // Input
        this.input.once("pointerdown", () => this.showMenu());
        this.input.keyboard.once("keydown-SPACE", () => this.showMenu());
        this.input.keyboard.on("keydown-Enter", () => this.selectMenu());
        this.input.keyboard.on("keydown-UP", () => this.navigateMenu(-1));
        this.input.keyboard.on("keydown-DOWN", () => this.navigateMenu(1));
    }

    showMenu() {
        if (this.isMenuVisible) return;
        this.isMenuVisible = true;
        this.pressText.setVisible(false);

        // Shift Logo Up
        this.tweens.add({
            targets: this.logo,
            y: 120,
            duration: 500,
            ease: 'Power2'
        });

        // Create Menu Buttons
        let startY = 240;
        const spacing = 50;

        this.menuButtons = [];

        this.menuItems.forEach((item, index) => {
            const btn = this.add.text(VIEW_W / 2, startY + (index * spacing), item, {
                fontFamily: "Arial",
                fontSize: "32px",
                fontStyle: "bold",
                color: index === 0 ? "#ffff00" : "#ffffff",
                stroke: "#000000",
                strokeThickness: 4
            }).setOrigin(0.5).setInteractive();

            btn.on("pointerover", () => {
                this.updateSelection(index);
            });
            btn.on("pointerdown", () => {
                this.handleMenuAction(item);
            });

            this.menuContainer.add(btn);
            this.menuButtons.push(btn);
        });

        this.menuContainer.setVisible(true);
        this.menuContainer.alpha = 0;
        this.tweens.add({
            targets: this.menuContainer,
            alpha: 1,
            duration: 500
        });
    }

    navigateMenu(direction) {
        if (!this.isMenuVisible) return;
        let next = this.selectedItemIndex + direction;
        if (next < 0) next = this.menuItems.length - 1;
        if (next >= this.menuItems.length) next = 0;
        this.updateSelection(next);
    }

    updateSelection(index) {
        this.selectedItemIndex = index;
        this.menuButtons.forEach((btn, i) => {
            if (i === index) {
                btn.setColor("#ffff00");
                btn.setScale(1.1);
            } else {
                btn.setColor("#ffffff");
                btn.setScale(1.0);
            }
        });
    }

    selectMenu() {
        if (!this.isMenuVisible) return;
        const item = this.menuItems[this.selectedItemIndex];
        this.handleMenuAction(item);
    }

    handleMenuAction(action) {
        if (action === "NEW GAME") {
            this.startGame(false);
        }
        else if (action === "LOAD GAME") {
            const save = localStorage.getItem("gostop_save");
            if (save) {
                this.startGame(true);
            } else {
                this.showToast("NO SAVE FILE FOUND");
            }
        }
        else if (action === "RANKING") {
            const best = localStorage.getItem("godori-best-sec");
            const msg = best ? `FASTEST CLEAR: ${best}s` : "NO RECORD YET";
            this.showToast(msg);
        }
        else if (action === "OPTION") {
            const isMuted = localStorage.getItem("gostop_mute") === "true";
            const newState = !isMuted;
            localStorage.setItem("gostop_mute", newState);
            this.showToast(newState ? "SOUND MUTED" : "SOUND ON");
        }
        else if (action === "EXIT") {
            this.showToast("CANNOT EXIT BROWSER WINDOW");
        }
    }

    startGame(loadSave) {
        this.cameras.main.fade(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
            this.scene.start("GameScene", { loadSave: loadSave });
        });
    }

    showToast(message) {
        const toast = this.add.text(VIEW_W / 2, VIEW_H - 50, message, {
            fontSize: "24px", color: "#ff5555", backgroundColor: "#000000"
        }).setOrigin(0.5).setPadding(10);

        this.tweens.add({
            targets: toast,
            y: VIEW_H - 100,
            alpha: 0,
            duration: 2000,
            onComplete: () => toast.destroy()
        });
    }
}
