import { VIEW_W, VIEW_H } from "./constants.js";
import { GameScene } from "./scenes/GameScene.js?v=31";
import { TitleScene } from "./scenes/TitleScene.js?v=4";

const config = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: "#1a1a2e",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 900 },
      debug: true // Enable debug to see bodies
    }
  },
  scene: [TitleScene, GameScene]
};

window.game = new Phaser.Game(config);
