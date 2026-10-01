import { newGame, type GameEventSink, type SquareSnapshot } from "@utopia/engine";
import { describe, expect, it } from "vitest";
import { box, type Triangles } from "../src/scene/shapes.js";
import { TownModels } from "../src/scene/town-models.js";

const IGNORED: GameEventSink = { record: () => {} };
const squares = () => {
  const game = newGame({ options: {}, seed: 1, events: IGNORED });
  game.start();
  return game.snapshot().board.squares.slice(0, 3);
};
const cube = (square: SquareSnapshot): Triangles =>
  box({
    base: { x: square.col, y: 0, z: square.row },
    size: { x: 1, y: 1, z: 1 },
    colour: [1, 1, 1],
  });

describe("TownModels", () => {
  it("joins every square's model into one set of buffers", () => {
    const models = new TownModels(cube);

    expect(models.build(squares()).positions.length).toBe(3 * 12 * 9);
  });

  it("models only the squares that changed since the last build", () => {
    let modelled = 0;
    const models = new TownModels((square) => {
      modelled += 1;
      return cube(square);
    });
    const before = squares();
    models.build(before);

    models.build([before[0], before[1], { ...before[2], wreckFrame: 1 }]);

    expect(modelled).toBe(4);
  });

  it("gives every triangle a normal facing out of it", () => {
    const { normals } = new TownModels(cube).build(squares().slice(0, 1));
    const ups = Array.from({ length: normals.length / 3 }, (_, index) => normals[index * 3 + 1]);

    expect([ups.filter((up) => up === 1).length, ups.filter((up) => up === -1).length]).toEqual([
      6, 6,
    ]);
  });
});
