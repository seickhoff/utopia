import { Drifter, type Launch } from "./drifter.js";

/** The sprite slots the cartridge gives the sea: two for weather, two pirates, two fish schools. */
export type DrifterGroup = "weather" | "pirates" | "fish";

const SLOTS_PER_GROUP = 2;
/** The MOB numbers each group starts at; slots 2 and 3 are the governors' own sprites. */
export const FIRST_SLOT: Readonly<Record<DrifterGroup, number>> = {
  weather: 0,
  pirates: 4,
  fish: 6,
};
const GROUPS: readonly DrifterGroup[] = ["weather", "pirates", "fish"];

export class SeaSlots {
  private readonly groups: Record<DrifterGroup, Drifter[]> = { weather: [], pirates: [], fish: [] };
  private launched = 0;

  hasRoomFor(group: DrifterGroup): boolean {
    return this.groups[group].length < SLOTS_PER_GROUP;
  }

  launch(group: DrifterGroup, launch: Launch): void {
    this.launched += 1;
    this.groups[group].push(new Drifter(this.launched, launch));
  }

  inGroup(group: DrifterGroup): readonly Drifter[] {
    return this.groups[group];
  }

  /** Every drifter, in MOB slot order. */
  all(): Drifter[] {
    return GROUPS.flatMap((group) => this.groups[group]);
  }

  slotOf(drifter: Drifter): number {
    const group = GROUPS.find((candidate) => this.groups[candidate].includes(drifter)) ?? "weather";
    return FIRST_SLOT[group] + this.groups[group].indexOf(drifter);
  }

  /** Lets go of drifters that have left the screen or gone to the bottom. */
  clearAway(): void {
    for (const group of GROUPS) {
      this.groups[group] = this.groups[group].filter((drifter) => !drifter.isGone());
    }
  }

  clearAll(): void {
    for (const group of GROUPS) this.groups[group] = [];
  }
}
