import { useEffect, useRef } from "react";
import { GameOverlay } from "./GameOverlay";

export function GameView() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof window === "undefined") return;
    let game: { destroy: (remove: boolean) => void } | undefined;
    let cancelled = false;

    void import("@/game/Hose31Game").then(({ createHose31Game }) => {
      if (cancelled || !hostRef.current) return;
      game = createHose31Game(hostRef.current);
    });

    return () => {
      cancelled = true;
      game?.destroy(true);
      host.replaceChildren();
    };
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-navy-deep text-cream">
      <div
        ref={hostRef}
        id="hose31-host"
        className="absolute inset-0 touch-none"
        style={{ touchAction: "none" }}
      />
      <GameOverlay />
    </main>
  );
}
