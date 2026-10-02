import { describe, expect, it } from "vitest";
import {
  DIORAMA_POSE,
  cameraPosition,
  frameShot,
  framingDistance,
  project,
} from "../src/scene/camera-framing.js";
import {
  foreReefMesh,
  heightAt,
  seabedMesh,
  seaFloorHeight,
  terrainMesh,
} from "../src/scene/terrain-mesh.js";
import { FORE_REEF_RUN, REEF, pastEdge } from "../src/scene/reef.js";
import { sampleField, signedDistance } from "../src/scene/distance-field.js";
import { MASK_HEIGHT, MASK_WIDTH, landMask, paddedLandMask } from "../src/scene/land-mask.js";

describe("landMask", () => {
  it("covers the islands' land pixels and nothing else", () => {
    const mask = landMask();

    expect([mask.length, mask[3 * 8 * MASK_WIDTH + 2 * 8 + 3], mask[0]]).toEqual([
      MASK_WIDTH * MASK_HEIGHT,
      1,
      0,
    ]);
  });

  it("counts a good deal of land on the two islands", () => {
    const land = landMask().reduce((sum, pixel) => sum + pixel, 0);

    expect(land).toBeGreaterThan(2500);
    expect(land).toBeLessThan(58 * 64);
  });
});

describe("signedDistance", () => {
  const strip = () => {
    const mask = new Uint8Array(10);
    mask.fill(1, 4, 7);
    return signedDistance(mask, 10);
  };

  it("is positive on land, growing away from the shore", () => {
    expect([...strip().values.slice(4, 7)]).toEqual([0.5, 1.5, 0.5]);
  });

  it("is negative at sea, growing away from the shore", () => {
    expect([...strip().values.slice(0, 4)]).toEqual([-3.5, -2.5, -1.5, -0.5]);
  });

  it("measures straight-line distances, not steps", () => {
    const mask = new Uint8Array(25);
    mask[0] = 1;
    const field = signedDistance(mask, 5);

    expect(field.values[4 * 5 + 3]).toBeCloseTo(0.5 - 5, 5);
  });

  it("blends between pixel centres", () => {
    expect(sampleField(strip(), { x: 5, y: 0.5 })).toBeCloseTo(1, 5);
  });
});

describe("terrain", () => {
  const mesh = () => terrainMesh(signedDistance(landMask(), MASK_WIDTH));

  it("lays a beach just above the sea and slopes away beneath it", () => {
    expect([heightAt(-1) < 0, heightAt(0) > 0, heightAt(1) < 0.1]).toEqual([true, true, true]);
    expect(heightAt(-10)).toBeCloseTo(-0.31, 5);
  });

  it("shelves gently across the bank, then falls away faster into the deep", () => {
    const bank = heightAt(-10) - heightAt(-11);
    const beyond = heightAt(-30) - heightAt(-31);

    expect(beyond).toBeGreaterThan(bank * 1.3);
  });

  it("levels out on the ocean floor far from land", () => {
    expect(heightAt(-200)).toBe(-4);
  });

  it("rises into low dunes inland, as a sandy cay does", () => {
    expect(heightAt(18)).toBeCloseTo(0.42, 5);
  });

  it("stays within its triangle budget", () => {
    expect(mesh().indices.length / 3).toBeLessThan(16_000);
  });

  it("builds no triangle out of nowhere", () => {
    const { positions, shores } = mesh();

    expect([positions.every(Number.isFinite), shores.every(Number.isFinite)]).toEqual([true, true]);
  });

  it("tells each vertex how far it lies from the shore, for fields to stop short of the sea", () => {
    const { shores, positions } = mesh();
    const lowest = positions.findIndex((value, index) => index % 3 === 1 && value < -0.05);

    expect([shores.length, shores[((lowest - 1) / 3) * 2] < 0]).toEqual([
      (positions.length / 3) * 2,
      true,
    ]);
  });

  it("tells each vertex how deep the water over it is, and none over land", () => {
    const { shores } = mesh();
    const vertices = Array.from({ length: shores.length / 2 }, (_, vertex) => ({
      distance: shores[vertex * 2],
      depth: shores[vertex * 2 + 1],
    }));
    const land = vertices.filter((vertex) => vertex.distance > 0);
    const sea = vertices.filter((vertex) => vertex.distance < -2);

    expect([land.every((v) => v.depth === 0), sea.every((v) => v.depth > 0)]).toEqual([true, true]);
  });
});

describe("seabed", () => {
  const PAD = 96;
  const seabed = () => {
    const padded = paddedLandMask(PAD);
    return seabedMesh({ field: signedDistance(padded.mask, padded.width), step: 8, pad: PAD });
  };

  it("reaches well past the board on every side", () => {
    const xs = seabed().positions.filter((_, index) => index % 3 === 0);

    expect([Math.min(...xs), Math.max(...xs)]).toEqual([-22, 22]);
  });

  it("gives the water over it the depth of the sea floor there, reef and all", () => {
    const { shores, positions } = seabed();
    const vertices = Array.from({ length: shores.length / 2 }, (_, vertex) => vertex);
    const mismatched = vertices.filter((vertex) => {
      const [x, z] = [positions[vertex * 3], positions[vertex * 3 + 2]];
      const floor = seaFloorHeight({ distance: shores[vertex * 2], x, z });
      return Math.abs(shores[vertex * 2 + 1] - Math.max(0, -floor)) > 1e-5;
    });

    expect(mismatched).toEqual([]);
  });

  it("lies beneath the land, so the islands' own mesh shows over it", () => {
    const heights = seabed().positions.filter((_, index) => index % 3 === 1);

    expect(Math.max(...heights)).toBeLessThan(heightAt(14));
  });

  it("stays within its triangle budget", () => {
    expect(seabed().indices.length / 3).toBeLessThan(7_000);
  });
});

describe("the fore-reef's ring", () => {
  const SEABED_PAD = 96;
  const ring = () => foreReefMesh(SEABED_PAD);
  const vertices = () => {
    const { positions, shores, indices } = ring();
    return [...new Set(indices)].map((vertex) => ({
      x: positions[vertex * 3],
      y: positions[vertex * 3 + 1],
      z: positions[vertex * 3 + 2],
      depth: shores[vertex * 2 + 1],
    }));
  };

  it("runs on past where the fore-reef meets the ocean floor, on every side", () => {
    const xs = vertices().map((vertex) => Math.abs(vertex.x));
    const zs = vertices().map((vertex) => Math.abs(vertex.z));

    expect([
      Math.max(...xs) > REEF.halfWidth + FORE_REEF_RUN,
      Math.max(...zs) > REEF.halfDepth + FORE_REEF_RUN,
    ]).toEqual([true, true]);
  });

  it("leaves the sailable sea and the reef round it to the finer seabed", () => {
    const nearest = Math.min(...vertices().map((vertex) => pastEdge(vertex.x, vertex.z)));

    expect(nearest).toBeGreaterThan(5);
  });

  it("tucks under the seabed's edge, so the finer mesh shows wherever the two overlap", () => {
    const seabedSink = 0.05;
    const overlapping = vertices().filter(
      (vertex) => Math.abs(vertex.x) < 22 && Math.abs(vertex.z) < 17.5,
    );
    const above = overlapping.filter(
      (vertex) => vertex.y >= seaFloorHeight({ distance: -60, ...vertex }) - seabedSink,
    );

    expect([overlapping.length > 0, above]).toEqual([true, []]);
  });

  it("gives the water over it the depth of the sea floor there", () => {
    const mismatched = vertices().filter((vertex) => {
      const floor = seaFloorHeight({ distance: -60, ...vertex });
      return Math.abs(vertex.depth - Math.max(0, -floor)) > 1e-5;
    });

    expect(mismatched).toEqual([]);
  });

  it("stays within its triangle budget", () => {
    expect(ring().indices.length / 3).toBeLessThan(6_000);
  });
});

describe("camera framing", () => {
  const BOARD = [-10.3, 10.3].flatMap((x) =>
    [-5.8, 5.8].flatMap((z) => [0, 0.7].map((y) => ({ x, y, z }))),
  );
  const inView = (aspect: number) => {
    const distance = framingDistance(DIORAMA_POSE, { aspect, corners: BOARD, margin: 0.04 });
    return BOARD.map((corner) => project(DIORAMA_POSE, { corner, distance, aspect }));
  };

  it("keeps every corner of the board in view on a wide screen", () => {
    expect(inView(16 / 9).every((seen) => Math.abs(seen.x) <= 1 && Math.abs(seen.y) <= 1)).toBe(
      true,
    );
  });

  it("keeps every corner in view on a narrow one", () => {
    expect(inView(4 / 3).every((seen) => Math.abs(seen.x) <= 1 && Math.abs(seen.y) <= 1)).toBe(
      true,
    );
  });

  it("centres the playing area on the screen, top to bottom", () => {
    const framing = { aspect: 1.77, corners: BOARD, margin: 0 };
    const shot = frameShot(DIORAMA_POSE, framing);
    const pose = { ...DIORAMA_POSE, target: shot.target };
    const ys = BOARD.map(
      (corner) => project(pose, { corner, distance: shot.distance, aspect: 1.77 }).y,
    );

    expect(Math.max(...ys) + Math.min(...ys)).toBeCloseTo(0, 2);
  });

  it("fills the screen's width with the playing area, edge to edge", () => {
    const framing = { aspect: 1.77, corners: BOARD, margin: 0 };
    const shot = frameShot(DIORAMA_POSE, framing);
    const pose = { ...DIORAMA_POSE, target: shot.target };
    const xs = BOARD.map(
      (corner) => project(pose, { corner, distance: shot.distance, aspect: 1.77 }).x,
    );

    expect(Math.max(...xs)).toBeCloseTo(1, 2);
  });

  it("stands on the far side of what it looks at: looking east, it stands to the west", () => {
    const pose = { ...DIORAMA_POSE, headingDegrees: 90, target: { x: 0, y: 0, z: 0 } };
    const eye = cameraPosition(pose, 10);

    expect([eye.x < 0, Math.abs(eye.z) < 1e-9, eye.y > 0]).toEqual([true, true, true]);
  });

  it("keeps the whole board in view however the view is turned, side-on included", () => {
    const turned = [0, 90, 135, 180].map((headingDegrees) => {
      const pose = { ...DIORAMA_POSE, headingDegrees };
      const framing = { aspect: 16 / 9, corners: BOARD, margin: 0.04 };
      const shot = frameShot(pose, framing);
      return BOARD.map((corner) =>
        project(
          { ...pose, target: shot.target },
          { corner, distance: shot.distance, aspect: 16 / 9 },
        ),
      ).every((seen) => seen.depth > 0 && Math.abs(seen.x) <= 1.001 && Math.abs(seen.y) <= 1.001);
    });

    expect(turned).toEqual([true, true, true, true]);
  });

  it("stands no farther back than it must", () => {
    const tightest = Math.max(
      ...inView(16 / 9).flatMap((seen) => [Math.abs(seen.x), Math.abs(seen.y)]),
    );

    expect(tightest).toBeCloseTo(0.96, 2);
  });
});

describe("the barrier reef", () => {
  const crestAt = (x: number) => {
    const steps = Array.from({ length: 400 }, (_, step) => 5 + step * 0.002);
    return steps.find((z) => Math.abs(pastEdge(x, z) - REEF.offset) < 0.002) ?? 0;
  };

  it("rises to just under the surface round the sailable sea, however deep the water inside", () => {
    const z = crestAt(3);

    expect(seaFloorHeight({ distance: -60, x: 3, z })).toBeCloseTo(-0.03, 2);
  });

  it("runs a little inside the sailable sea's edge, where a boat's hull meets it", () => {
    expect(crestAt(0) > 5.2 && crestAt(0) < 5.5).toBe(true);
  });

  it("falls away beyond its crest at a steady grade of one in ten", () => {
    const floorAt = (out: number) => seaFloorHeight({ distance: -60, x: 0, z: 5.5 + out });

    expect((floorAt(4) - floorAt(24)) / 20).toBeCloseTo(0.1, 2);
  });

  it("levels out on the ocean floor some forty squares out", () => {
    const floorAt = (out: number) => seaFloorHeight({ distance: -60, x: 0, z: 5.5 + out });

    expect([floorAt(36) > REEF.oceanFloor, floorAt(44)]).toEqual([true, REEF.oceanFloor]);
  });

  it("slopes down smoothly beyond its crest on every side, deeper with every step out", () => {
    const outward = [
      (step: number) => ({ x: 0, z: 5.6 + step }),
      (step: number) => ({ x: 0, z: -5.6 - step }),
      (step: number) => ({ x: 10.1 + step, z: 0 }),
      (step: number) => ({ x: -10.1 - step, z: 0 }),
    ];
    const profiles = outward.map((point) =>
      [0, 1, 2, 3, 4].map((step) => seaFloorHeight({ distance: -60, ...point(step) })),
    );
    const smooth = profiles.every((heights) =>
      heights
        .slice(1)
        .every((height, step) => height < heights[step] && heights[step] - height < 1.4),
    );

    expect(smooth).toBe(true);
  });

  it("leaves the islands' own land as it is", () => {
    expect(seaFloorHeight({ distance: 6, x: -8, z: 0 })).toBe(heightAt(6));
  });
});
