import { INITIAL_VIEW, type GameView, type GameViewSource } from "../hud/game-view.js";

/**
 * The bridge from the frame loop to React (via useSyncExternalStore). Updates that change nothing
 * notify no one, so React renders when a displayed value changes, not 60 times a second.
 */
export class GameStore implements GameViewSource {
  private view: GameView = INITIAL_VIEW;
  private readonly listeners = new Set<() => void>();

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getView = (): GameView => this.view;

  update(patch: Partial<GameView>): void {
    const keys = Object.keys(patch) as (keyof GameView)[];
    if (keys.every((key) => sameValue(patch[key], this.view[key]))) return;
    this.view = { ...this.view, ...patch };
    this.listeners.forEach((listener) => listener());
  }
}

/** View models are plain data, so two with the same content are the same view. */
function sameValue(next: unknown, previous: unknown): boolean {
  return next === previous || JSON.stringify(next) === JSON.stringify(previous);
}
