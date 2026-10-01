import type { GameEvent, GameEventSink } from "@utopia/engine";

/** Collects the game's events between frames. */
export class EventBuffer implements GameEventSink {
  private buffered: GameEvent[] = [];

  record(event: GameEvent): void {
    this.buffered.push(event);
  }

  events(): readonly GameEvent[] {
    return this.buffered;
  }

  clear(): void {
    this.buffered = [];
  }
}
