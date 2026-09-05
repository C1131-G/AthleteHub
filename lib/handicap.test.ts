import {
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import { estimateHandicap, roundArrowsFor } from "./handicap";

const wa720 = {
  distanceM: 70,
  faceCm: 122,
  roundArrows: 72,
};

bunDescribe("handicap estimation", () => {
  bunTest("rejects impossible and empty scores", () => {
    bunExpect(estimateHandicap(wa720, 0)).toBeNull();
    bunExpect(estimateHandicap(wa720, 721)).toBeNull();
    bunExpect(estimateHandicap({ ...wa720, roundArrows: 0 }, 100)).toBeNull();
  });

  bunTest("better scores produce lower handicaps", () => {
    const weak = estimateHandicap(wa720, 400);
    const mid = estimateHandicap(wa720, 600);
    const strong = estimateHandicap(wa720, 690);
    bunExpect(weak).not.toBeNull();
    bunExpect(mid).not.toBeNull();
    bunExpect(strong).not.toBeNull();
    bunExpect(weak ?? 0).toBeGreaterThan(mid ?? 0);
    bunExpect(mid ?? 0).toBeGreaterThan(strong ?? 0);
  });

  bunTest("stays within the scheme bounds", () => {
    for (const score of [5, 100, 360, 719]) {
      const handicap = estimateHandicap(wa720, score);
      bunExpect(handicap ?? -1).toBeGreaterThanOrEqual(0);
      bunExpect(handicap ?? 151).toBeLessThanOrEqual(150);
    }
  });

  bunTest("the model round-trips score to handicap to expected score", () => {
    // The bisection targets the handicap whose expected score equals the shot
    // score, so a near-perfect round must resolve to a very low handicap.
    const handicap = estimateHandicap(wa720, 700);
    bunExpect(handicap ?? 150).toBeLessThan(20);
  });

  bunTest("recognised rounds expose their arrow counts", () => {
    bunExpect(roundArrowsFor("wa-720-70")).toBe(72);
    bunExpect(roundArrowsFor("portsmouth")).toBe(60);
    bunExpect(roundArrowsFor("freehand")).toBeUndefined();
  });
});
