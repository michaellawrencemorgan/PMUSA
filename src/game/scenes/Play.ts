import * as Phaser from "phaser";
import { gameBridge, gameInput } from "../bridge";
import { patchHud, type Phase } from "../hud";

const W = 384;
const H = 256;
const ROUND_S = 60;
const TANK_START = 0.7;
const TANK_DRAIN = 0.2;
const TANK_FILL = 0.58;
const MOVE_SPEED = 78;
const DROP_SPEED = 168;
const HOSE_LIFE = 280;
const SPARK_HP = 36;
const EMBER_HP = 4;
const DROP_DMG = 5;
const HYDRANT = { x: 366, y: 128 };
const PLAYER_SPAWN = { x: 192, y: 198 };

type FlameKind = "spark" | "ember";

type Drop = Phaser.Physics.Arcade.Image & {
  born?: number;
};

export class PlayScene extends Phaser.Scene {
  private phase: Phase = "title";
  private tank = TANK_START;
  private left = ROUND_S;
  private player!: Phaser.Physics.Arcade.Sprite;
  private hydrant!: Phaser.Physics.Arcade.Image;
  private flames!: Phaser.Physics.Arcade.Group;
  private drops!: Phaser.Physics.Arcade.Group;
  private blockers!: Phaser.Physics.Arcade.StaticGroup;
  private tankBar!: Phaser.GameObjects.Graphics;
  private hoseBeam!: Phaser.GameObjects.Graphics;
  private dropPulse = 0;
  private hudAcc = 0;
  private inputEnabledAt = 0;
  private splash!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super({ key: "play" });
  }

  init() {
    this.phase = "title";
    this.tank = TANK_START;
    this.left = ROUND_S;
    this.dropPulse = 0;
    this.hudAcc = 0;
    gameInput.facingX = 0;
    gameInput.facingY = -1;
    gameInput.speed = 0;
    gameInput.pointerSpray = false;
  }

  create() {
    gameInput.attach();
    this.ensureAnims();

    this.add.image(W / 2, H / 2, "yard").setDisplaySize(W, H).setDepth(0);

    this.blockers = this.physics.add.staticGroup();
    this.placeProp("class-a", 58, 62, 56, 58, 22, 18);
    this.placeProp("class-b", 322, 60, 62, 56, 24, 18);
    this.placeProp("engine", 192, 246, 78, 30, 54, 14);

    this.hydrant = this.physics.add.staticImage(HYDRANT.x, HYDRANT.y, "hydrant");
    this.hydrant.setDisplaySize(14, 20);
    this.hydrant.setDepth(HYDRANT.y);
    const hyBody = this.hydrant.body as Phaser.Physics.Arcade.StaticBody;
    hyBody.setSize(10, 12).setOffset(2, 8);

    this.player = this.physics.add.sprite(PLAYER_SPAWN.x, PLAYER_SPAWN.y, "firefighter", 12);
    this.player.setDisplaySize(16, 18);
    this.player.setDepth(PLAYER_SPAWN.y);
    const pBody = this.player.body as Phaser.Physics.Arcade.Body;
    pBody.setSize(10, 12);
    pBody.setOffset((this.player.width - 10) / 2, this.player.height - 13);
    pBody.setCollideWorldBounds(true);
    this.player.anims.play("idle-up");
    this.player.setDisplaySize(16, 18);

    this.flames = this.physics.add.group();
    this.spawnFlame(96, 118, "spark");
    this.spawnFlame(198, 84, "spark");
    this.spawnFlame(290, 132, "spark");

    this.drops = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 96,
      defaultKey: "water-dot",
    });

    this.splash = this.add.particles(0, 0, "water-splash", {
      lifespan: 180,
      speed: { min: 12, max: 40 },
      scale: { start: 1.4, end: 0.2 },
      alpha: { start: 0.85, end: 0 },
      quantity: 5,
      emitting: false,
      tint: [0x7ecbff, 0xbfe9ff],
    });
    this.splash.setDepth(40);

    this.tankBar = this.add.graphics().setDepth(60);
    this.hoseBeam = this.add.graphics().setDepth(25);

    this.physics.world.setBounds(8, 20, W - 16, H - 28);
    this.physics.add.collider(this.player, this.blockers);
    this.physics.add.collider(this.flames, this.blockers);
    this.physics.add.overlap(this.drops, this.flames, (dropObj, flameObj) => {
      this.hitFlame(dropObj as Drop, flameObj as Phaser.Physics.Arcade.Sprite);
    });

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (p.primaryDown) gameInput.pointerSpray = true;
    });
    this.input.on("pointerup", () => {
      gameInput.pointerSpray = false;
    });

    gameBridge.bind({
      startLane: () => this.begin(),
      restartLane: () => this.scene.restart(),
    });

    if (typeof window !== "undefined") {
      window.__controlsTest = {
        getYaw: () => gameInput.getYaw(),
        getSpeed: () => gameInput.getSpeed(),
        setKeys: (codes: string[]) => gameInput.setKeys(codes),
      };
    }

    patchHud({
      phase: "title",
      tank: this.tank,
      timeLeft: this.left,
      flameCount: 3,
      nearHydrant: false,
      progress: 1,
      ready: true,
    });

    this.events.once("shutdown", () => this.cleanup());
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta, 100) / 1000;
    const actions = gameInput.poll();
    if (this.time.now < this.inputEnabledAt) {
      actions.spray = false;
      gameInput.pointerSpray = false;
    }

    if (this.phase === "title" && gameInput.injected && gameInput.injected.length) {
      this.begin();
    }

    this.flickerFlames(dt);

    if (this.phase === "play") {
      this.stepPlay(dt, actions);
    } else {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      gameInput.speed = 0;
      this.recycleDrops(true);
      this.hoseBeam?.clear();
    }

    this.player.setDepth(this.player.y);
    this.drawTankBar();

    this.hudAcc += dt;
    if (this.hudAcc > 0.08 || this.phase !== "play") {
      this.hudAcc = 0;
      patchHud({
        phase: this.phase,
        tank: this.tank,
        timeLeft: this.left,
        flameCount: this.flames.countActive(true),
        nearHydrant: this.isNearHydrant(),
      });
    }
  }

  private begin() {
    if (this.phase !== "title") return;
    this.phase = "play";
    this.left = ROUND_S;
    this.tank = TANK_START;
    gameInput.pointerSpray = false;
    gameInput.overlaySpray = false;
    this.inputEnabledAt = this.time.now + 180;
    patchHud({ phase: "play", tank: this.tank, timeLeft: this.left });
  }

  private stepPlay(dt: number, actions: { moveX: number; moveY: number; spray: boolean }) {
    this.left = Math.max(0, this.left - dt);
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    if (actions.moveX !== 0 || actions.moveY !== 0) {
      gameInput.facingX = actions.moveX;
      gameInput.facingY = actions.moveY;
      body.setVelocity(actions.moveX * MOVE_SPEED, actions.moveY * MOVE_SPEED);
      gameInput.speed = MOVE_SPEED;
      this.playWalk(actions.moveX, actions.moveY);
    } else {
      body.setVelocity(0, 0);
      gameInput.speed = 0;
      this.playIdle();
    }

    const spraying = actions.spray && this.tank > 0;
    if (spraying) {
      this.tank = Math.max(0, this.tank - TANK_DRAIN * dt);
      this.emitHose(dt);
      this.drawHoseBeam(true);
    } else {
      this.drawHoseBeam(false);
    }

    if (this.isNearHydrant()) {
      this.tank = Math.min(1, this.tank + TANK_FILL * dt);
    }

    this.steerFlames(dt);
    this.recycleDrops(false);

    if (this.flames.countActive(true) === 0) {
      this.endRound("win");
      return;
    }
    if (this.left <= 0) {
      this.endRound("fail");
    }
  }

  private emitHose(dt: number) {
    this.dropPulse += dt;
    const fx = gameInput.facingX;
    const fy = gameInput.facingY;
    while (this.dropPulse > 0.018) {
      this.dropPulse -= 0.018;
      for (let i = 0; i < 2; i++) {
        const ox = (Math.random() - 0.5) * 8;
        const oy = (Math.random() - 0.5) * 8;
        const x = this.player.x + fx * 10 + ox * 0.2;
        const y = this.player.y + fy * 10 + oy * 0.2;
        const drop = this.drops.get(x, y, "water-dot") as Drop | null;
        if (!drop) return;
        drop.enableBody(true, x, y, true, true);
        drop.setActive(true).setVisible(true);
        drop.setAlpha(0.9);
        drop.setDepth(y + 8);
        drop.setDisplaySize(3, 3);
        drop.setTint(0xbfe9ff);
        drop.setVelocity(fx * DROP_SPEED + ox * 4, fy * DROP_SPEED + oy * 4);
        drop.born = this.time.now;
      }
    }
  }

  private recycleDrops(all: boolean) {
    const now = this.time.now;
    for (const child of this.drops.getChildren()) {
      const drop = child as Drop;
      if (!drop.active) continue;
      if (all || !drop.born || now - drop.born > HOSE_LIFE) {
        drop.disableBody(true, true);
      }
    }
  }

  private hitFlame(drop: Drop, flame: Phaser.Physics.Arcade.Sprite) {
    if (!drop.active || !flame.active) return;
    drop.disableBody(true, true);
    this.splash.emitParticleAt(flame.x, flame.y, 6);

    const hp = (flame.getData("hp") as number) - DROP_DMG;
    flame.setData("hp", hp);
    flame.setTintFill(0xffffff);
    this.time.delayedCall(50, () => {
      if (flame.active) flame.clearTint();
    });

    const body = flame.body as Phaser.Physics.Arcade.Body;
    body.velocity.x += gameInput.facingX * 42;
    body.velocity.y += gameInput.facingY * 42;

    if (hp <= 0) this.killFlame(flame);
  }

  private killFlame(flame: Phaser.Physics.Arcade.Sprite) {
    const kind = flame.getData("kind") as FlameKind;
    const x = flame.x;
    const y = flame.y;
    flame.destroy();
    if (kind === "spark" && Math.random() < 0.5 && this.flames.countActive(true) < 6) {
      this.cameras.main.shake(200, 0.012);
      this.spawnFlame(x - 8, y - 2, "ember");
      this.spawnFlame(x + 8, y + 4, "ember");
    }
  }

  private spawnFlame(x: number, y: number, kind: FlameKind) {
    const key = kind === "spark" ? "spark" : "ember";
    const sprite = this.flames.create(x, y, key, 0) as Phaser.Physics.Arcade.Sprite;
    sprite.setDisplaySize(kind === "spark" ? 14 : 10, kind === "spark" ? 16 : 12);
    sprite.setDepth(y);
    sprite.setData("kind", kind);
    sprite.setData("hp", kind === "spark" ? SPARK_HP : EMBER_HP);
    sprite.setData("wob", Math.random() * Math.PI * 2);
    sprite.anims.play(kind === "spark" ? "spark-flicker" : "ember-flicker");
    sprite.setDisplaySize(kind === "spark" ? 14 : 10, kind === "spark" ? 16 : 12);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(sprite.width * 0.55, sprite.height * 0.65);
    body.setOffset(sprite.width * 0.22, sprite.height * 0.28);
    body.setCollideWorldBounds(true);
    body.setBounce(0.4, 0.4);
    body.setMaxVelocity(48, 48);
    return sprite;
  }

  private steerFlames(dt: number) {
    const px = this.player.x;
    const py = this.player.y;
    const kids = this.flames.getChildren() as Phaser.Physics.Arcade.Sprite[];
    for (const flame of kids) {
      if (!flame.active) continue;
      const kind = flame.getData("kind") as FlameKind;
      const wob = (flame.getData("wob") as number) + dt * 3.1;
      flame.setData("wob", wob);
      const seek = kind === "spark" ? 16 : 28;
      const dx = px - flame.x;
      const dy = py - flame.y;
      const dist = Math.hypot(dx, dy) || 1;
      let vx = (dx / dist) * seek + Math.sin(wob) * 10;
      let vy = (dy / dist) * seek + Math.cos(wob * 0.7) * 8;
      for (const other of kids) {
        if (other === flame || !other.active) continue;
        const ox = flame.x - other.x;
        const oy = flame.y - other.y;
        const od = Math.hypot(ox, oy);
        if (od > 0 && od < 18) {
          vx += (ox / od) * 22;
          vy += (oy / od) * 22;
        }
      }
      const body = flame.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(vx, vy);
      flame.setDepth(flame.y);
    }
  }

  private flickerFlames(dt: number) {
    if (this.phase === "play") return;
    for (const child of this.flames.getChildren()) {
      const flame = child as Phaser.Physics.Arcade.Sprite;
      if (!flame.active) continue;
      const wob = (flame.getData("wob") as number) + dt * 2.4;
      flame.setData("wob", wob);
      flame.x += Math.sin(wob) * 6 * dt;
      flame.y += Math.cos(wob * 0.8) * 4 * dt;
      flame.setDepth(flame.y);
    }
  }

  private isNearHydrant() {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, this.hydrant.x, this.hydrant.y) < 26;
  }

  private playWalk(mx: number, my: number) {
    const key =
      Math.abs(mx) > Math.abs(my) ? (mx < 0 ? "walk-left" : "walk-right") : my < 0 ? "walk-up" : "walk-down";
    if (this.player.anims.currentAnim?.key !== key) {
      this.player.anims.play(key, true);
      this.player.setDisplaySize(16, 18);
    }
  }

  private playIdle() {
    const { facingX: fx, facingY: fy } = gameInput;
    const key =
      Math.abs(fx) > Math.abs(fy) ? (fx < 0 ? "idle-left" : "idle-right") : fy < 0 ? "idle-up" : "idle-down";
    if (this.player.anims.currentAnim?.key !== key) {
      this.player.anims.play(key, true);
      this.player.setDisplaySize(16, 18);
    }
  }

  private drawHoseBeam(on: boolean) {
    const g = this.hoseBeam;
    g.clear();
    if (!on) return;
    const fx = gameInput.facingX;
    const fy = gameInput.facingY;
    const x = this.player.x;
    const y = this.player.y;
    g.lineStyle(2, 0x7ecbff, 0.4);
    g.lineBetween(x + fx * 6, y + fy * 6, x + fx * 52, y + fy * 52);
    g.lineStyle(1, 0xe7f6ff, 0.7);
    g.lineBetween(x + fx * 6, y + fy * 6, x + fx * 48, y + fy * 48);
  }

  private drawTankBar() {
    const g = this.tankBar;
    g.clear();
    const x = this.player.x - 10;
    const y = this.player.y - 14;
    g.fillStyle(0x0b1624, 0.85);
    g.fillRect(x, y, 20, 3);
    const color = this.tank > 0.28 ? 0x4aa4e8 : 0xff6a00;
    g.fillStyle(color, 1);
    g.fillRect(x, y, Math.max(0, 20 * this.tank), 3);
    g.lineStyle(1, 0xc4a35a, 0.7);
    g.strokeRect(x, y, 20, 3);
  }

  private endRound(result: "win" | "fail") {
    if (this.phase !== "play") return;
    this.phase = result;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    gameInput.speed = 0;
    this.recycleDrops(true);
    this.hoseBeam?.clear();
    for (const child of this.flames.getChildren()) {
      const flame = child as Phaser.Physics.Arcade.Sprite;
      const fBody = flame.body as Phaser.Physics.Arcade.Body | undefined;
      fBody?.setVelocity(0, 0);
    }
    if (result === "fail") {
      this.cameras.main.fade(500, 255, 106, 0, false);
    }
    patchHud({
      phase: result,
      tank: this.tank,
      timeLeft: this.left,
      flameCount: this.flames.countActive(true),
    });
  }

  private placeProp(
    key: string,
    x: number,
    y: number,
    dw: number,
    dh: number,
    bodyW: number,
    bodyH: number,
  ) {
    const img = this.blockers.create(x, y, key) as Phaser.Physics.Arcade.Image;
    img.setDisplaySize(dw, dh);
    img.setDepth(y);
    const body = img.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(bodyW, bodyH);
    body.setOffset((img.width - bodyW) / 2, img.height - bodyH - 2);
    img.refreshBody();
    return img;
  }

  private ensureAnims() {
    if (this.anims.exists("walk-down")) return;
    const walk = (key: string, start: number) => {
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers("firefighter", { start, end: start + 3 }),
        frameRate: 8,
        repeat: -1,
      });
    };
    walk("walk-down", 0);
    walk("walk-left", 4);
    walk("walk-right", 8);
    walk("walk-up", 12);
    const idle = (key: string, frame: number) => {
      this.anims.create({
        key,
        frames: [{ key: "firefighter", frame }],
        frameRate: 1,
        repeat: -1,
      });
    };
    idle("idle-down", 0);
    idle("idle-left", 4);
    idle("idle-right", 8);
    idle("idle-up", 12);
    this.anims.create({
      key: "spark-flicker",
      frames: this.anims.generateFrameNumbers("spark", { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "ember-flicker",
      frames: this.anims.generateFrameNumbers("ember", { start: 0, end: 3 }),
      frameRate: 12,
      repeat: -1,
    });
  }

  private cleanup() {
    gameBridge.unbind();
    gameInput.pointerSpray = false;
    this.drops?.clear(true, true);
    this.flames?.clear(true, true);
  }
}
