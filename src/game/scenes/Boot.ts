import * as Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "boot" });
  }

  create() {
    const g = this.add.graphics();
    g.setVisible(false);
    g.fillStyle(0x9ad8ff, 1);
    g.fillRect(0, 0, 3, 3);
    g.generateTexture("water-dot", 3, 3);
    g.clear();
    g.fillStyle(0xd7f4ff, 1);
    g.fillRect(0, 0, 3, 3);
    g.generateTexture("water-splash", 3, 3);
    g.destroy();
    this.scene.start("preload");
  }
}
