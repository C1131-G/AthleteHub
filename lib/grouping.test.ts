import {
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import { computeGroupStats, describeBias } from "./grouping";

bunDescribe("group analytics", () => {
  bunTest("returns undefined with nothing plotted", () => {
    bunExpect(computeGroupStats([])).toBeUndefined();
  });

  bunTest("a single arrow has zero spread and radius", () => {
    bunExpect(computeGroupStats([{ x: 0.4, y: -0.2 }])).toEqual({
      centroid: { x: 0.4, y: -0.2 },
      groupSize: 0,
      meanRadius: 0,
    });
  });

  bunTest("a symmetric crosshair group has known geometry", () => {
    const stats = computeGroupStats([
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]);
    bunExpect(stats?.centroid).toEqual({ x: 0, y: 0 });
    bunExpect(stats?.meanRadius).toBe(1);
    bunExpect(stats?.groupSize).toBe(2);
  });

  bunTest("an offset cluster keeps its radius but carries the bias", () => {
    const stats = computeGroupStats([
      { x: 0.3, y: -0.4 },
      { x: 0.5, y: -0.4 },
      { x: 0.4, y: -0.2 },
      { x: 0.4, y: -0.6 },
    ]);
    // Horizontal pair sits 0.1 from the centroid (0.4, -0.4), vertical pair 0.2.
    bunExpect(stats?.centroid).toEqual({ x: 0.4, y: -0.4 });
    bunExpect(stats?.meanRadius).toBeCloseTo(0.15);
    bunExpect(stats?.groupSize).toBeCloseTo(0.4);
  });

  bunTest("bias copy names the miss direction", () => {
    bunExpect(describeBias({ x: 0, y: 0 })).toBe("centred on the aiming point");
    bunExpect(describeBias({ x: 0.01, y: -0.01 })).toBe(
      "centred on the aiming point"
    );
    bunExpect(describeBias({ x: 0.3, y: -0.4 })).toBe(
      "groups right and low of the aiming point"
    );
    bunExpect(describeBias({ x: -0.3, y: 0.01 })).toBe(
      "groups left of the aiming point"
    );
    bunExpect(describeBias({ x: 0, y: 0.4 })).toBe(
      "groups high of the aiming point"
    );
  });
});
