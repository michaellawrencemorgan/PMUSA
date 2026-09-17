import { GameInput } from "./input";

export const gameInput = new GameInput();

type LaneFns = {
  startLane: () => void;
  restartLane: () => void;
};

const fns: LaneFns = {
  startLane: () => {},
  restartLane: () => {},
};

export const gameBridge = {
  bind(next: LaneFns) {
    fns.startLane = next.startLane;
    fns.restartLane = next.restartLane;
  },
  unbind() {
    fns.startLane = () => {};
    fns.restartLane = () => {};
  },
  startLane() {
    fns.startLane();
  },
  restartLane() {
    fns.restartLane();
  },
};
