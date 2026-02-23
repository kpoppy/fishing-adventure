export class EffectManager {
    constructor(scene) {
        this.scene = scene;
        this.sparkEmitter = null;
        this.explodeEmitter = null;
    }

    createAnimations() {
        if (!this.scene.anims.exists("hero-idle")) {
            this.scene.anims.create({
                key: "hero-idle",
                frames: [{ key: "player_sprite", frame: 0 }],
                frameRate: 1,
                repeat: -1
            });
        }
        if (!this.scene.anims.exists("hero-charge")) {
            this.scene.anims.create({
                key: "hero-charge",
                frames: [{ key: "player_sprite", frame: 1 }],
                frameRate: 1,
                repeat: -1
            });
        }
        if (!this.scene.anims.exists("hero-cast")) {
            this.scene.anims.create({
                key: "hero-cast",
                frames: [{ key: "player_sprite", frame: 2 }],
                frameRate: 1,
                repeat: -1
            });
        }
        if (!this.scene.anims.exists("hero-run")) {
            this.scene.anims.create({
                key: "hero-run",
                frames: [{ key: "player_sprite" }], // Placeholder
                frameRate: 10,
                repeat: -1
            });
        }
        if (!this.scene.anims.exists("hero-jump")) {
            this.scene.anims.create({
                key: "hero-jump",
                frames: [{ key: "player_sprite" }],
                frameRate: 1,
                repeat: -1
            });
        }
        if (!this.scene.anims.exists("enemy-float")) {
            this.scene.anims.create({
                key: "enemy-float",
                frames: [{ key: "atlas", frame: 2 }],
                frameRate: 8,
                repeat: -1
            });
        }
        if (!this.scene.anims.exists("boss-float")) {
            this.scene.anims.create({
                key: "boss-float",
                frames: [{ key: "atlas", frame: 3 }],
                frameRate: 8,
                repeat: -1
            });
        }
        if (!this.scene.anims.exists("godori-blink")) {
            this.scene.anims.create({
                key: "godori-blink",
                frames: [{ key: "atlas", frame: 1 }],
                frameRate: 5,
                repeat: -1
            });
        }
        /*
        if (!this.scene.anims.exists("gostop-fx-spin")) {
            this.scene.anims.create({
                key: "gostop-fx-spin",
                frames: this.scene.anims.generateFrameNumbers("gostopFxSheet", { start: 0, end: 3 }),
                frameRate: 9,
                repeat: -1
            });
        }
        */

        // Particle Managers (Disabled for safety)
        /*
        this.sparkEmitter = this.scene.add.particles(0, 0, "atlas", {
            frame: 4,
            lifespan: 300,
            speed: { min: 150, max: 350 },
            scale: { start: 0.4, end: 0 },
            blendMode: "ADD",
            emitting: false
        });

        this.explodeEmitter = this.scene.add.particles(0, 0, "atlas", {
            frame: 4,
            lifespan: 600,
            speed: { min: 50, max: 200 },
            scale: { start: 0.8, end: 0 },
            blendMode: "ADD",
            emitting: false
        });
        */
    }

    createExplosion(x, y, color = 0xffaa00) {
        if (!this.explodeEmitter) return;
        this.explodeEmitter.setPosition(x, y);
        this.explodeEmitter.particleTint = color;
        this.explodeEmitter.explode(16);
        this.scene.cameras.main.shake(150, 0.01);
    }

    createSpark(x, y) {
        if (!this.sparkEmitter) return;
        this.sparkEmitter.setPosition(x, y);
        this.sparkEmitter.particleTint = 0xffffaa;
        this.sparkEmitter.explode(4);
    }

    showFloatingText(x, y, message, color = "#ffffff") {
        const text = this.scene.add.text(x, y, message, {
            fontSize: "20px",
            color: color,
            stroke: "#000",
            strokeThickness: 3,
            fontFamily: "Impact, sans-serif",
            fontWeight: "bold"
        }).setOrigin(0.5);

        this.scene.tweens.add({
            targets: text,
            y: y - 40,
            alpha: 0,
            duration: 800,
            ease: "Power1",
            onComplete: () => text.destroy()
        });
    }

    shakeScreen(intensity = "MEDIUM") {
        const magnitude = {
            "LOW": 0.005,
            "MEDIUM": 0.015,
            "HIGH": 0.03
        }[intensity] || 0.01;

        const duration = {
            "LOW": 100,
            "MEDIUM": 200,
            "HIGH": 400
        }[intensity] || 200;

        this.scene.cameras.main.shake(duration, magnitude);
    }

    flashSprite(sprite, color = 0xffffff, duration = 60) {
        if (!sprite || !sprite.active) return;
        sprite.setTintFill(color);
        this.scene.time.delayedCall(duration, () => {
            if (sprite && sprite.active) {
                sprite.clearTint();
            }
        });
    }

    createSplash(x, y) {
        // Simple water splash effect using expanding circles
        for (let i = 0; i < 3; i++) {
            const circle = this.scene.add.circle(x, y, 2, 0xffffff, 0.6);
            circle.setDepth(100);
            this.scene.tweens.add({
                targets: circle,
                radius: 12 + (i * 8),
                alpha: 0,
                duration: 300 + (i * 100),
                ease: "Cubic.out",
                onComplete: () => circle.destroy()
            });
        }
    }
}
