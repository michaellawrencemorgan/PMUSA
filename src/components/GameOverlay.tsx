import { Droplets } from "lucide-react";
import { useCallback, useRef } from "react";
import { gameBridge, gameInput } from "@/game/bridge";
import { useHud } from "@/game/hud";

function formatClock(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function GameOverlay() {
  const { phase, progress, ready, tank, timeLeft, flameCount, nearHydrant } = useHud();

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
      <HudStrip
        phase={phase}
        tank={tank}
        timeLeft={timeLeft}
        flameCount={flameCount}
        nearHydrant={nearHydrant}
        progress={progress}
      />
      {phase === "title" && <TitleCard ready={ready} progress={progress} />}
      {phase === "win" && <WinCard />}
      {phase === "fail" && <FailCard />}
      {(phase === "play" || phase === "title") && <TouchControls visible={phase === "play"} />}
    </div>
  );
}

function HudStrip({
  phase,
  tank,
  timeLeft,
  flameCount,
  nearHydrant,
  progress,
}: {
  phase: string;
  tank: number;
  timeLeft: number;
  flameCount: number;
  nearHydrant: boolean;
  progress: number;
}) {
  const low = tank < 0.28;
  return (
    <header className="flex items-start justify-between gap-3 px-4 pt-3 pb-2 sm:px-6 sm:pt-4">
      <div>
        <p className="font-display text-lg tracking-[0.22em] text-gold">HOSE 31</p>
        <p className="text-[10px] tracking-[0.14em] text-muted uppercase">Camarillo</p>
      </div>
      <div className="rounded-md border border-border bg-navy/80 px-3 py-1.5 text-center">
        <p className="font-display text-2xl tabular-nums tracking-widest text-gold leading-none">
          {formatClock(timeLeft)}
        </p>
        <p className="mt-1 text-[10px] tracking-[0.18em] text-muted uppercase">Lane clock</p>
      </div>
      <div className="text-right">
        <p className={`text-xs tabular-nums tracking-widest ${low ? "text-fire" : "text-cream"}`}>
          WATER {Math.round(tank * 100)}%
        </p>
        <p className="text-[10px] tracking-[0.12em] text-muted uppercase">
          {nearHydrant ? "Hydrant fill" : `${flameCount} spark${flameCount === 1 ? "" : "s"}`}
        </p>
        <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-sm bg-navy-mid" aria-hidden>
          <div
            className={`h-full ${low ? "bg-fire" : "bg-water"}`}
            style={{ width: `${Math.round(tank * 100)}%` }}
          />
        </div>
        {phase === "loading" && <span className="sr-only">{progress}</span>}
      </div>
    </header>
  );
}

function TitleCard({ ready, progress }: { ready: boolean; progress: number }) {
  return (
    <div className="flex flex-1 items-center justify-center px-5">
      <div className="pointer-events-auto w-full max-w-md rounded-xl border border-border bg-navy/92 px-6 py-7 text-center shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
        <p className="font-display text-5xl tracking-[0.18em] text-gold sm:text-6xl">HOSE 31</p>
        <p className="mt-2 text-sm tracking-[0.08em] text-cream">
          Camarillo Airport · Live Fire Training Complex
        </p>
        <p className="mt-3 text-[11px] tracking-[0.22em] text-muted uppercase">
          Ground. People. School.
        </p>
        <button
          type="button"
          disabled={!ready}
          onClick={() => gameBridge.startLane()}
          className="mt-6 inline-flex h-12 min-w-44 items-center justify-center rounded-md bg-gold px-6 font-display text-lg tracking-[0.2em] text-navy-deep transition-transform duration-150 ease-out hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
        >
          {ready ? "START LANE" : "STAGING"}
        </button>
        {!ready && (
          <div className="mx-auto mt-4 h-1.5 w-40 overflow-hidden rounded-sm bg-navy-mid">
            <div className="h-full bg-gold" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
        <p className="mt-4 text-[11px] leading-relaxed text-muted">
          WASD or arrows move. Hold Space or click to stream. Hydrant on the east edge refills the tank.
        </p>
      </div>
    </div>
  );
}

function WinCard() {
  return (
    <div className="flex flex-1 items-center justify-center px-5">
      <div className="pointer-events-auto w-full max-w-md rounded-xl border border-gold/50 bg-navy/94 px-6 py-8 text-center">
        <p className="font-display text-3xl tracking-[0.16em] text-gold sm:text-4xl">
          LANE HELD · CAMARILLO
        </p>
        <p className="mt-3 text-sm text-cream">All sparks out. The drill pad is yours.</p>
        <button
          type="button"
          onClick={() => gameBridge.restartLane()}
          className="mt-6 inline-flex h-12 min-w-44 items-center justify-center rounded-md bg-gold px-6 font-display text-lg tracking-[0.18em] text-navy-deep transition-transform duration-150 ease-out hover:brightness-110 active:scale-[0.98]"
        >
          RUN IT AGAIN
        </button>
      </div>
    </div>
  );
}

function FailCard() {
  return (
    <div className="flex flex-1 items-center justify-center bg-fire/25 px-5">
      <div className="pointer-events-auto w-full max-w-md rounded-xl border border-fire/60 bg-navy/94 px-6 py-8 text-center">
        <p className="font-display text-3xl tracking-[0.16em] text-fire">LANE LOST</p>
        <p className="mt-3 text-sm text-cream">Clock hit zero with fire still up.</p>
        <button
          type="button"
          onClick={() => gameBridge.restartLane()}
          className="mt-6 inline-flex h-12 min-w-44 items-center justify-center rounded-md bg-gold px-6 font-display text-lg tracking-[0.18em] text-navy-deep transition-transform duration-150 ease-out hover:brightness-110 active:scale-[0.98]"
        >
          RESTART LANE
        </button>
      </div>
    </div>
  );
}

function TouchControls({ visible }: { visible: boolean }) {
  const padRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);

  const readStick = useCallback((clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const nx = (clientX - cx) / (r.width * 0.5);
    const ny = (clientY - cy) / (r.height * 0.5);
    const mag = Math.hypot(nx, ny);
    const k = mag > 1 ? 1 / mag : 1;
    gameInput.setStick(nx * k, ny * k);
  }, []);

  const endStick = useCallback(() => {
    pointerId.current = null;
    gameInput.setStick(0, 0);
  }, []);

  return (
    <div
      className={`touch-only mt-auto flex items-end justify-between px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 ${visible ? "pointer-events-none" : "pointer-events-none hidden"}`}
    >
      <div
        ref={padRef}
        className="pointer-events-auto relative size-[7.5rem] rounded-full border border-border bg-navy/55 touch-none sm:size-32"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => {
          pointerId.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          readStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (pointerId.current !== e.pointerId) return;
          readStick(e.clientX, e.clientY);
        }}
        onPointerUp={endStick}
        onPointerCancel={endStick}
        aria-label="Move"
      >
        <span className="absolute inset-6 rounded-full border border-gold/30" />
      </div>
      <button
        type="button"
        className="pointer-events-auto flex size-16 items-center justify-center rounded-full border border-gold/50 bg-navy-mid text-gold shadow-[0_8px_20px_rgba(0,0,0,0.35)] sm:size-[4.5rem]"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          gameInput.overlaySpray = true;
        }}
        onPointerUp={() => {
          gameInput.overlaySpray = false;
        }}
        onPointerCancel={() => {
          gameInput.overlaySpray = false;
        }}
        aria-label="Spray"
      >
        <Droplets className="size-7" strokeWidth={1.75} />
      </button>
    </div>
  );
}
