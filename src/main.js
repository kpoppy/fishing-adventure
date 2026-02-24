import { VIEW_W, VIEW_H } from "./constants.js";
import { GameScene } from "./scenes/GameScene.js?v=32";
import { TitleScene } from "./scenes/TitleScene.js?v=8";
import { CharacterEditorScene } from "./scenes/CharacterEditorScene.js?v=2";

const config = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: "#000000",
  scene: [TitleScene, GameScene, CharacterEditorScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  }
};

window.game = new Phaser.Game(config);
