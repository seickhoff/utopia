import { describe, expect, it } from "vitest";
import { ViewAngle } from "../src/app/view-angle.js";
import { TouchGestures, type Drag, type Finger } from "../src/input/touch-gestures.js";
import type { ScreenPosition } from "../src/board/screen-position.js";

const LEVEL = 45;

function aTouchBoard() {
  const taps: ScreenPosition[] = [];
  const drags: Drag[] = [];
  const view = new ViewAngle({ pitchDegrees: LEVEL });
  const gestures = new TouchGestures({
    tap: (at) => taps.push(at),
    drag: (drag) => drags.push(drag),
    camera: view,
  });
  return { gestures, taps, drags, view };
}

const finger = (pointerId: number, clientX: number, clientY: number): Finger => ({
  pointerId,
  clientX,
  clientY,
});

describe("TouchGestures with one finger", () => {
  it("taps where a lone finger lifts, if it barely moved", () => {
    const { gestures, taps } = aTouchBoard();
    gestures.down(finger(1, 100, 100));
    gestures.move(finger(1, 104, 102));

    gestures.up(finger(1, 104, 102));

    expect(taps).toEqual([{ clientX: 104, clientY: 102 }]);
  });

  it("drags with a finger that moves away, from where it landed to where it is", () => {
    const { gestures, drags } = aTouchBoard();
    gestures.down(finger(1, 100, 100));

    gestures.move(finger(1, 140, 100));

    expect(drags).toEqual([
      { from: { clientX: 100, clientY: 100 }, to: { clientX: 140, clientY: 100 } },
    ]);
  });

  it("does not tap where a finger that wandered lifts", () => {
    const { gestures, taps } = aTouchBoard();
    gestures.down(finger(1, 100, 100));
    gestures.move(finger(1, 140, 100));

    gestures.up(finger(1, 140, 100));

    expect(taps).toEqual([]);
  });

  it("does not tap when the browser takes the touch away", () => {
    const { gestures, taps } = aTouchBoard();
    gestures.down(finger(1, 100, 100));

    gestures.cancel(finger(1, 100, 100));

    expect(taps).toEqual([]);
  });
});

describe("TouchGestures with two fingers", () => {
  it("zooms in as the fingers spread apart", () => {
    const { gestures, view } = aTouchBoard();
    gestures.down(finger(1, 100, 100));
    gestures.down(finger(2, 200, 100));

    gestures.move(finger(2, 300, 100));

    expect(view.current().zoom).toBeCloseTo(2);
  });

  it("tilts toward the horizon as the fingers slide up together", () => {
    const { gestures, view } = aTouchBoard();
    gestures.down(finger(1, 100, 200));
    gestures.down(finger(2, 200, 200));

    gestures.move(finger(1, 100, 160));
    gestures.move(finger(2, 200, 160));

    expect(view.current().pitchDegrees).toBeCloseTo(LEVEL - 10);
  });

  it("turns the view round as two fingers twist, the board turning with them as a map does", () => {
    const { gestures, view } = aTouchBoard();
    gestures.down(finger(1, 100, 200));
    gestures.down(finger(2, 300, 200));

    gestures.move(
      finger(2, 100 + 200 * Math.cos(Math.PI / 4.5), 200 + 200 * Math.sin(Math.PI / 4.5)),
    );

    expect(view.current().headingDegrees).toBeCloseTo(-(40 - 12), 6);
  });

  it("keeps turning with the fingers once they have started, however little they twist", () => {
    const { gestures, view } = aTouchBoard();
    gestures.down(finger(1, 100, 200));
    gestures.down(finger(2, 300, 200));
    gestures.move(finger(2, 100, 400));

    gestures.move(
      finger(2, 100 + 200 * Math.cos(Math.PI / 2 - 0.05), 200 + 200 * Math.sin(Math.PI / 2 - 0.05)),
    );

    expect(view.current().headingDegrees).toBeCloseTo(-(90 - 12) + (0.05 * 180) / Math.PI, 6);
  });

  it("leaves the view facing as it was for the slight twist a pinch or a tilt gives", () => {
    const { gestures, view } = aTouchBoard();
    gestures.down(finger(1, 100, 200));
    gestures.down(finger(2, 300, 200));

    gestures.move(finger(2, 100 + 300 * Math.cos(0.1), 200 + 300 * Math.sin(0.1)));

    expect(view.current().headingDegrees).toBe(0);
  });

  it("drags nothing while the camera turns", () => {
    const { gestures, drags } = aTouchBoard();
    gestures.down(finger(1, 100, 100));
    gestures.down(finger(2, 200, 100));

    gestures.move(finger(2, 300, 100));

    expect(drags).toEqual([]);
  });

  it("never taps after a pinch, even as its last finger lifts where it landed", () => {
    const { gestures, taps } = aTouchBoard();
    gestures.down(finger(1, 100, 100));
    gestures.down(finger(2, 200, 100));
    gestures.up(finger(2, 200, 100));

    gestures.up(finger(1, 100, 100));

    expect(taps).toEqual([]);
  });

  it("taps again once every finger of a pinch has lifted", () => {
    const { gestures, taps } = aTouchBoard();
    gestures.down(finger(1, 100, 100));
    gestures.down(finger(2, 200, 100));
    gestures.up(finger(2, 200, 100));
    gestures.up(finger(1, 100, 100));
    gestures.down(finger(3, 50, 50));

    gestures.up(finger(3, 50, 50));

    expect(taps).toEqual([{ clientX: 50, clientY: 50 }]);
  });
});
