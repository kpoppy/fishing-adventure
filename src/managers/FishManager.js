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
        this.maxFish = 30; // Increased for testing (originally 10)

        // Debug spawn multiple immediately for rich testing
        for (let i = 0; i < 15; i++) {
            this.spawnRandomFish(true);
        }
    }

    update(time, delta) {
        this.spawnTimer += delta;
        // Faster spawn rate for testing (every ~0.8 sec + random)
        if (this.spawnTimer > 800 + Math.random() * 500 && this.fishes.countActive() < this.maxFish) {
            this.spawnRandomFish();
            this.spawnTimer = 0;
        }
    }

    spawnRandomFish(isInitial = false) {
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

        // Random X (left or right side usually, but if initial, spawn near screen view)
        let x;
        if (isInitial) {
            // Spawn broadly across the typical visible camera width range (e.g. 0 ~ 1200)
            x = Math.random() * 1200;
        } else {
            // Spawn standard outside of typical single view width
            x = Math.random() > 0.5 ? -100 : VIEW_W + 100;
        }

        const fish = new Fish(this.scene, x, y, typeKey);
        this.fishes.add(fish);

        // Ensure they swim towards center initially
        if (x < 0) {
            fish.direction = 1; // Moving Right
            fish.setFlipX(true);
        } else {
            fish.direction = -1; // Moving Left
            fish.setFlipX(false);
        }
        fish.setVelocityX(fish.moveSpeed * fish.direction);
    }
}
