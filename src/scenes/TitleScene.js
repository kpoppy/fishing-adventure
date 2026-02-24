import { VIEW_W, VIEW_H, DEPTH, COLORS } from "../constants.js";

export class TitleScene extends Phaser.Scene {
    constructor() {
        super("TitleScene");
        this.menuItems = ["NEW GAME", "LOAD GAME", "OPTION", "EXIT"]; // Removed dev tools from main array
        this.selectedItemIndex = 0;
        this.isMenuVisible = false;
    }

    preload() {
        this.load.image("title_background", "assets/1000008044.png");
    }

    create() {
        // Background - Changed to regular image for menu art
        this.bg = this.add.image(VIEW_W / 2, VIEW_H / 2, "title_background");
        this.bg.setDisplaySize(VIEW_W, VIEW_H);
        // Removed setTint(0x555555) to show full vibrant colors of the new art

        // Logo (now text, but much bigger and stylish)
        this.logo = this.add.text(VIEW_W / 2, 160, "FISHING\nADVENTURE", {
            fontFamily: "Impact, Arial Black, sans-serif",
            fontSize: "76px",
            fontStyle: "bold",
            color: "#ffcc00", // Bright yellow/gold
            align: "center",
            stroke: "#330000",
            strokeThickness: 12,
            shadow: {
                offsetX: 6,
                offsetY: 6,
                color: '#000000',
                blur: 0,
                fill: true
            }
        }).setOrigin(0.5);

        // Bobbing Animation
        this.tweens.add({
            targets: this.logo,
            y: 145, // Bob gracefully between 160 and 145
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // "CLICK TO START" Text
        this.pressText = this.add.text(VIEW_W / 2, VIEW_H - 120, "PLEASE CLICK OR PRESS SPACE", {
            fontFamily: "Arial", fontSize: "30px", fontStyle: "bold", color: "#ffffff"
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

        // Toggle Dev Tools
        this.input.keyboard.on("keydown-D", () => {
            this.devToolsVisible = !this.devToolsVisible;
            if (this.devToolsGroup) {
                this.devToolsGroup.forEach(item => {
                    item.setVisible(this.devToolsVisible);
                });
            }
        });
    }

    showMenu() {
        if (this.isMenuVisible) return;
        this.isMenuVisible = true;
        this.pressText.setVisible(false);

        // Create Menu Buttons
        let startY = 330;
        const spacing = 38;

        this.menuButtons = [];

        this.menuItems.forEach((item, index) => {
            const btn = this.add.text(VIEW_W / 2, startY + (index * spacing), item, {
                fontFamily: "Arial",
                fontSize: "24px", // Reduced from 32px
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

        // Add Dev Tools to bottom right
        const toolStyle = {
            fontFamily: "Arial", fontSize: "16px", color: "#aaaaaa", fontStyle: "bold"
        };

        const studioBtn = this.add.text(VIEW_W - 20, VIEW_H - 20, "STUDIO (EDITOR)", toolStyle)
            .setOrigin(1, 1).setInteractive({ useHandCursor: true });

        this.devToolsGroup = [studioBtn];
        this.devToolsGroup.forEach(btn => {
            btn.on("pointerover", () => btn.setColor("#ffffff"));
            btn.on("pointerout", () => btn.setColor("#aaaaaa"));
            btn.on("pointerdown", () => this.handleMenuAction("STUDIO"));
            btn.setVisible(this.devToolsVisible);
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
            // 기존 테두리나 알파값 트윈 애니메이션을 멈추고 초기화
            this.tweens.killTweensOf(btn);
            btn.alpha = 1;

            if (i === index) {
                btn.setColor("#ffff00");
                btn.setScale(1.1);

                // 선택된 아이템에 깜빡임(Blink) 효과 추가
                this.tweens.add({
                    targets: btn,
                    alpha: 0.3,
                    duration: 400,
                    yoyo: true,
                    repeat: -1
                });
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
        else if (action === "STUDIO" || action === "CHARACTER EDITOR") {
            this.cameras.main.fade(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.start("CharacterEditorScene");
            });
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
