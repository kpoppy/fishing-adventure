import { GameConfig } from "../config/GameConfig.js";

export class Fish extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, typeKey) {
        let texKey = "fish_sprite";
        if (scene.textures.exists("custom_fish_sprite")) {
            const img = scene.textures.get("custom_fish_sprite").getSourceImage();
            if (img && img.width > 0) texKey = "custom_fish_sprite";
        }

        super(scene, x, y, texKey);
        this.scene = scene;
        this.typeKey = typeKey || "GOLDFISH";
        const config = GameConfig.Fish[this.typeKey] || GameConfig.Fish.GOLDFISH;

        this.hp = config.hp;
        this.value = config.price;
        this.moveSpeed = config.speed;
        this.color = config.color;

        // Slightly increase the display size to make the pixel art visible
        this.setDisplaySize(48, 48);
        // Removed setTint(this.color) to show original pixel art colors

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.setAllowGravity(false); // Fish don't fall
        this.setCollideWorldBounds(true);
        this.setBounce(1);

        // State
        this.state = "SWIM"; // SWIM, CHASE, BITE, HOOKED
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.setVelocityX(this.moveSpeed * this.direction);
        // Original sprite faces Left. So flipX=true makes it face Right.
        this.setFlipX(this.direction > 0);

        // Randomly change direction timer
        this.changeDirTimer = 0;
    }

    update(time, delta) {
        if (!this.active) return;

        if (this.state === "SWIM") {
            this.swimBehavior(time, delta);
            this.checkForBait();
        } else if (this.state === "CHASE") {
            this.chaseBehavior();
        } else if (this.state === "HOOKED") {
            this.hookedBehavior();
        }
    }

    swimBehavior(time, delta) {
        this.changeDirTimer += delta;
        if (this.changeDirTimer > 3000 + Math.random() * 2000) {
            this.direction *= -1;
            this.setVelocityX(this.moveSpeed * this.direction);
            this.setFlipX(this.direction > 0);
            this.changeDirTimer = 0;
        }

        // Bob up and down slightly
        this.setVelocityY(Math.sin(time * 0.002) * 10);
    }

    getMouthPosition() {
        let offsetX = -this.displayWidth / 2; // Default left edge (since original sprite faces left)
        let offsetY = 0; // Default center vertically

        const offsetsData = this.scene.cache.json.get("fish_offsets");
        if (offsetsData && offsetsData.rodOffsets && offsetsData.rodOffsets[0]) {
            // Note: The Editor displays the sprite. If the user clicked the mouth, that offset is raw relative to center.
            offsetX = offsetsData.rodOffsets[0].x * this.scaleX;
            offsetY = offsetsData.rodOffsets[0].y * this.scaleY;
        }

        // Original faces Left. If flipX=true(facing Right), we invert offsetX.
        const mouthX = this.x + (this.flipX ? -offsetX : offsetX);
        const mouthY = this.y + offsetY;

        return { x: mouthX, y: mouthY, offsetX, offsetY };
    }

    checkForBait() {
        const bobber = this.scene.bobber;
        // Only chase if bobber is active, in water, AND doesn't already have a hooked fish
        if (bobber && bobber.active && bobber.inWater && !bobber.hookedFish) {
            const mouth = this.getMouthPosition();

            const dist = Phaser.Math.Distance.Between(mouth.x, mouth.y, bobber.x, bobber.y);
            if (dist < 100) {
                this.state = "CHASE";
            }
        }
    }

    chaseBehavior() {
        const bobber = this.scene.bobber;
        if (!bobber || !bobber.active || !bobber.inWater) {
            this.state = "SWIM";
            this.setVelocityX(this.moveSpeed * this.direction);
            this.setFlipX(this.direction > 0);
            return;
        }

        const mouth = this.getMouthPosition();
        const dist = Phaser.Math.Distance.Between(mouth.x, mouth.y, bobber.x, bobber.y);

        if (dist < 5) { // Mouth is close enough to bite the hook
            this.state = "HOOKED";
            this.setVelocity(0, 0);
            bobber.hookedFish = this; // Attach self to bobber

            // Adjust fish position so mouth perfectly overlaps hook
            this.x = bobber.x - (this.flipX ? -mouth.offsetX : mouth.offsetX);
            this.y = bobber.y - mouth.offsetY;

            // Noticeable bite effect
            if (this.scene.effectManager) {
                this.scene.effectManager.showFloatingText(this.x, this.y - 20, "HIT!", "#ff0000");
                this.scene.effectManager.flashSprite(this, 0xffaaaa, 100);
            }
            if (this.scene.soundManager) {
                this.scene.soundManager.play("splash");
            }
        } else {
            // Calculate angle from mouth to bobber
            const angle = Phaser.Math.Angle.Between(mouth.x, mouth.y, bobber.x, bobber.y);

            // Move entire fish based on the angle so the mouth goes towards the bobber
            const speed = this.moveSpeed * 1.5;
            this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

            // Update facing direction based on velocity
            this.setFlipX(this.body.velocity.x > 0); // Faces right if velocity is positive
        }
    }

    hookedBehavior() {
        const bobber = this.scene.bobber;
        // If bobber is gone, or it's not our bobber, or bobber is not tracking US as the hooked fish, return to swimming
        if (!bobber || !bobber.active || bobber.hookedFish !== this) {
            this.state = "SWIM";
            this.setAngle(0);
            this.setVelocityX(this.moveSpeed * this.direction);
            this.setFlipX(this.direction > 0);
            return;
        }

        // Strictly follow the bobber
        const mouth = this.getMouthPosition();
        this.x = bobber.x - (this.flipX ? -mouth.offsetX : mouth.offsetX);
        this.y = bobber.y - mouth.offsetY;

        // Add a struggling wiggle effect
        this.setAngle(Math.sin(this.scene.time.now * 0.05) * 15);
    }
}
