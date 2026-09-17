const GAME_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
  "Space",
]);

export type Actions = {
  moveX: number;
  moveY: number;
  spray: boolean;
};

function radialDeadzone(x: number, y: number, dz = 0.18) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale };
}

export class GameInput {
  keys = new Set<string>();
  injected: string[] | null = null;
  pointerSpray = false;
  overlaySpray = false;
  stickX = 0;
  stickY = 0;
  facingX = 0;
  facingY = -1;
  speed = 0;
  private attached = false;
  private unsubs: Array<() => void> = [];

  attach() {
    if (this.attached) return;
    this.attached = true;
    const onDown = (e: KeyboardEvent) => {
      this.keys.add(e.code);
      if (GAME_CODES.has(e.code)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
    };
    const clear = () => this.keys.clear();
    const onVis = () => {
      if (document.hidden) clear();
    };
    window.addEventListener("keydown", onDown, { passive: false });
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", onVis);
    this.unsubs.push(() => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", onVis);
    });
  }

  detach() {
    for (const u of this.unsubs) u();
    this.unsubs = [];
    this.attached = false;
    this.keys.clear();
    this.injected = null;
    this.pointerSpray = false;
    this.overlaySpray = false;
    this.stickX = 0;
    this.stickY = 0;
  }

  setKeys(codes: string[]) {
    this.injected = codes.length ? [...codes] : null;
  }

  setStick(x: number, y: number) {
    const v = radialDeadzone(x, y);
    this.stickX = v.x;
    this.stickY = v.y;
  }

  poll(): Actions {
    const src = this.injected ? new Set(this.injected) : this.keys;
    let mx = this.stickX;
    let my = this.stickY;

    if (src.has("KeyA") || src.has("ArrowLeft")) mx -= 1;
    if (src.has("KeyD") || src.has("ArrowRight")) mx += 1;
    if (src.has("KeyW") || src.has("ArrowUp")) my -= 1;
    if (src.has("KeyS") || src.has("ArrowDown")) my += 1;

    const pads = typeof navigator !== "undefined" ? navigator.getGamepads?.() ?? [] : [];
    let padSpray = false;
    for (const pad of pads) {
      if (!pad || pad.mapping !== "standard") continue;
      const stick = radialDeadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
      mx += stick.x;
      my += stick.y;
      if (pad.buttons[0]?.pressed || (pad.buttons[7]?.value ?? 0) > 0.4) padSpray = true;
      if (pad.buttons[12]?.pressed) my -= 1;
      if (pad.buttons[13]?.pressed) my += 1;
      if (pad.buttons[14]?.pressed) mx -= 1;
      if (pad.buttons[15]?.pressed) mx += 1;
    }

    const mag = Math.hypot(mx, my);
    if (mag > 1) {
      mx /= mag;
      my /= mag;
    } else if (mag < 0.08) {
      mx = 0;
      my = 0;
    }

    const spray = src.has("Space") || this.pointerSpray || this.overlaySpray || padSpray;

    return { moveX: mx, moveY: my, spray };
  }

  /** North = 0; +yaw is CCW toward west (player-visible left while moving forward). */
  getYaw() {
    return Math.atan2(-this.facingX, -this.facingY);
  }

  getSpeed() {
    return this.speed;
  }
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys?: (codes: string[]) => void;
    };
  }
}
