import type { BuildingKind } from "@utopia/engine";
import type { KitStyle } from "../kit-style.js";
import type { District } from "./district.js";
import { factoryDistrict } from "./factory.js";
import { fortDistrict } from "./fort.js";
import { hospitalDistrict } from "./hospital.js";
import { housingDistrict } from "./housing.js";
import { rebelCamp } from "./rebel-camp.js";
import { schoolDistrict } from "./school.js";

/** What is built as a district. Crops are not: the terrain paints their fields. */
export type DevelopedKind = Exclude<BuildingKind, "crop">;

const DISTRICTS: Readonly<Record<DevelopedKind, (style: KitStyle) => District>> = {
  fort: fortDistrict,
  factory: factoryDistrict,
  school: schoolDistrict,
  hospital: hospitalDistrict,
  house: housingDistrict,
  rebel: rebelCamp,
};

export const DEVELOPED_KINDS: readonly DevelopedKind[] = [
  "fort",
  "factory",
  "school",
  "hospital",
  "house",
  "rebel",
];

export function isDeveloped(kind: string): kind is DevelopedKind {
  return DEVELOPED_KINDS.some((developed) => developed === kind);
}

/** The district an item is built as, with the side's colour on its flags and trim. */
export function districtOf(kind: DevelopedKind, style: KitStyle): District {
  return DISTRICTS[kind](style);
}
