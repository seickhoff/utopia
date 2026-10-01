import type { BuildingKind, Square } from "@utopia/engine";
import type { IslandView } from "./island-view.js";

export interface SiteRequest {
  readonly item: BuildingKind;
  readonly view: IslandView;
}

type SitePreference = (view: IslandView) => Square[];

/**
 * Where each kind of building goes, best site first (the manual's advice): the fort where it guards
 * the most land, the town in a ring round it, and crops, which come and go, out on the edges.
 */
const PREFERENCES: Readonly<Record<BuildingKind, SitePreference>> = {
  fort: fortSites,
  factory: townSites,
  crop: outlyingSites,
  school: townSites,
  hospital: townSites,
  house: townSites,
  rebel: () => [],
};

export function sitesFor(request: SiteRequest): Square[] {
  return PREFERENCES[request.item](request.view);
}

/** A fort keeps rebels off the eight squares round it. */
function fortSites(view: IslandView): Square[] {
  const guarding = (square: Square) =>
    square.neighbours().filter((near) => view.isOwnLand(near) && !view.isGuarded(near)).length;
  return view.buildableSquares().sort((one, other) => guarding(other) - guarding(one));
}

function townSites(view: IslandView): Square[] {
  const heart = townHeart(view);
  const nearest = freeSitesBesides(view, heart).sort(
    (one, other) => apart(one, heart) - apart(other, heart),
  );
  return withHeartLast(view, { sites: nearest, heart });
}

function outlyingSites(view: IslandView): Square[] {
  const heart = townHeart(view);
  const farthest = freeSitesBesides(view, heart).sort(
    (one, other) => apart(other, heart) - apart(one, heart),
  );
  return withHeartLast(view, { sites: farthest, heart });
}

/** The town's fort, or the square kept for it until one is built. */
function townHeart(view: IslandView): Square {
  const islandSquares = view.islandSquares();
  const fort = islandSquares.find((square) => view.holds({ square, item: "fort" }));
  return fort ?? fortSites(view)[0] ?? islandSquares[0];
}

function freeSitesBesides(view: IslandView, heart: Square): Square[] {
  return view.buildableSquares().filter((square) => square !== heart);
}

function withHeartLast(view: IslandView, choice: { sites: Square[]; heart: Square }): Square[] {
  return view.isBuildable(choice.heart) ? [...choice.sites, choice.heart] : choice.sites;
}

/** How many squares apart two squares are, counting diagonal steps as one. */
function apart(one: Square, other: Square): number {
  return Math.max(Math.abs(one.row - other.row), Math.abs(one.col - other.col));
}
