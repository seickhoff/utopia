import { describe, expect, it } from "vitest";
import { CLOUD_LOOKS } from "../src/scene/cloud-looks.js";
import { FUNNEL_OPACITY, funnelReach, stormVolume } from "../src/scene/hurricane-body.js";

const rising = (values: readonly number[]) =>
  values.every((value, index) => index === 0 || value > values[index - 1]);

describe("stormVolume", () => {
  it("stands a hurricane's body up from the height it floats at, far wider than it is tall", () => {
    const look = CLOUD_LOOKS.hurricane;
    const volume = stormVolume(look);

    expect([volume.radius, volume.height > 0.5, volume.height < look.radius / 2]).toEqual([
      look.radius,
      true,
      true,
    ]);
  });
});

describe("funnelReach", () => {
  const look = CLOUD_LOOKS.hurricane;
  const reaches = Array.from({ length: 11 }, (_, step) => funnelReach({ look, up: step / 10 }));

  it("hangs from the eye, as wide as the eye where it leaves the cloud", () => {
    expect([reaches[10], reaches[10] < look.radius * 0.12]).toEqual([
      funnelReach({ look, up: 1 }),
      true,
    ]);
  });

  it("narrows all the way down to the sea, like a tornado, without closing", () => {
    expect([rising(reaches), reaches[0] > 0, reaches[0] < reaches[10] / 2]).toEqual([
      true,
      true,
      true,
    ]);
  });

  it("is mostly see-through", () => {
    expect(FUNNEL_OPACITY).toBe(0.15);
  });
});
