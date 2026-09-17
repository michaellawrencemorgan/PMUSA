import * as Phaser from "phaser";
import { patchHud } from "../hud";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "preload" });
  }

  preload() {
    patchHud({ progress: 0 });
    this.load.image("yard", "/game/yard.png");
    this.load.image("class-a", "/game/class-a.png");
    this.load.image("class-b", "/game/class-b.png");
    this.load.image("engine", "/game/engine.png");
    this.load.image("hydrant", "/game/hydrant.png");
    this.load.spritesheet("firefighter", "/game/firefighter.png", {
      frameWidth: 96,
      frameHeight: 96,
    });
    this.load.spritesheet("spark", "/game/spark.png", {
      frameWidth: 128,
      frameHeight: 128,
    });
    this.load.spritesheet("ember", "/game/ember.png", {
      frameWidth: 128,
      frameHeight: 128,
    });
    this.load.on("progress", (value: number) => {
      patchHud({ progress: value });
    });
  }

  create() {
    this.scene.start("play");
  }
}
