import {
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import { interpolateMark } from "./interpolate";
import type { SightMark } from "./sight-mark-types";

const mark = (
  id: string,
  bow: string,
  arrow: string,
  distanceM: number,
  markValue: string
): SightMark => ({
  arrow,
  athleteId: "athlete-1",
  bow,
  createdAt: "2026-09-01T00:00:00.000Z",
  distanceM,
  id,
  mark: markValue,
  note: "",
  updatedAt: "2026-09-01T00:00:00.000Z",
});

const recorded = [
  mark("m-18", "Recurve", "X10", 18, "1.00"),
  mark("m-50", "Recurve", "X10", 50, "2.00"),
  mark("m-30-other-bow", "Compound", "X10", 30, "9.99"),
];

bunDescribe("sight mark interpolation", () => {
  bunTest("returns an exact mark untouched", () => {
    bunExpect(interpolateMark(recorded, "Recurve", "X10", 18)).toEqual({
      distanceM: 18,
      mark: "1.00",
    });
  });

  bunTest("interpolates between the two bracketing marks", () => {
    bunExpect(interpolateMark(recorded, "Recurve", "X10", 34)).toEqual({
      distanceM: 34,
      mark: "1.50",
    });
  });

  bunTest("ignores marks for other bows or arrows", () => {
    // The compound 30 m mark brackets 34 m for that bow only.
    bunExpect(interpolateMark(recorded, "Compound", "X10", 34)).toBeDefined();
    // No Recurve/ACE marks exist, so there is nothing to interpolate from.
    bunExpect(interpolateMark(recorded, "Recurve", "ACE", 34)).toBeUndefined();
  });

  bunTest("outside the recorded range, returns the nearest mark", () => {
    bunExpect(interpolateMark(recorded, "Recurve", "X10", 70)).toEqual({
      distanceM: 70,
      mark: "2.00",
    });
    bunExpect(interpolateMark(recorded, "Recurve", "X10", 10)).toEqual({
      distanceM: 10,
      mark: "1.00",
    });
  });

  bunTest("no marks at all means no suggestion", () => {
    bunExpect(interpolateMark(recorded, "Barebow", "ACE", 30)).toBeUndefined();
  });
});
