import * as Phaser from "phaser";
import { BootScene } from "./scenes/Boot";
import { PreloadScene } from "./scenes/Preload";
import { PlayScene } from "./scenes/Play";

export const DESIGN_W = 384;
export const DESIGN_H = 256;

export function createHose31Game(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: DESIGN_W,
    height: DESIGN_H,
    backgroundColor: "#12243C",
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: DESIGN_W,
      height: DESIGN_H,
    },
    scene: [BootScene, PreloadScene, PlayScene],
    input: {
      keyboard: true,
    },
    audio: {
      disableWebAudio: true,
    },
    banner: false,
  });
}
