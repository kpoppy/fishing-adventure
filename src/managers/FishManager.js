import { GameConfig } from "../config/GameConfig.js";
import { Fish } from "../entities/Fish.js";
import { VIEW_W } from "../constants.js";

export class FishManager {
    constructor(scene) {
        this.scene = scene;
        this.fishes = this.scene.add.group({
            classType: Fish,
            runChildUpdate: true
        });

        this.spawnTimer = 0;
        this.maxFish = 10;

        // Debug spawn one immediately
        this.spawnRandomFish();
    }

    update(time, delta) {
        this.spawnTimer += delta;
        if (this.spawnTimer > 2000 && this.fishes.countActive() < this.maxFish) {
            this.spawnRandomFish();
            this.spawnTimer = 0;
        }
    }

    spawnRandomFish() {
        // Randomly choose type based on probability (simple random for now)
        const types = Object.keys(GameConfig.Fish);
        const typeKey = types[Math.floor(Math.random() * types.length)];
        const config = GameConfig.Fish[typeKey];

        // Determine Y based on depth config
        // Depth is relative to WATER_LEVEL
        const depthMin = config.depth[0];
        const depthMax = config.depth[1];

        // Random Y in range
        const y = GameConfig.World.WATER_LEVEL + depthMin + Math.random() * (depthMax - depthMin);

        // Random X (left or right side)
        const x = Math.random() > 0.5 ? -50 : VIEW_W + 50;

        const fish = new Fish(this.scene, x, y, typeKey);
        this.fishes.add(fish);

        // Ensure they swim towards center initially
        if (x < 0) {
            fish.direction = 1;
        } else {
            fish.direction = -1;
        }
        fish.setVelocityX(fish.moveSpeed * fish.direction);
        fish.setFlipX(fish.direction < 0);
    }
}
