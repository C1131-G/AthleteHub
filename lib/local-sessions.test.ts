import {
  beforeEach as bunBeforeEach,
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import type { SessionRecordInput } from "../electron/backend";
import { createLocalSessions } from "./local-sessions";
import { createMemoryStorage } from "./test/memory-storage";

/**
 * The browser dev path stores sessions as JSON, so a field the desktop path
 * knows about but the schema drops would fail silently. These tests pin the
 * arrow fields through the same save/reload cycle the dev loop uses.
 */
bunBeforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: createMemoryStorage(),
  });
});

const arrowInput = (id: string): SessionRecordInput => ({
  actualArrows: 3,
  athleteId: "athlete-1",
  date: "2026-09-04",
  durationMin: 60,
  ends: [
    {
      arrowCount: 3,
      arrows: [
        { score: 10, x: 0.02, y: -0.01 },
        { score: 9, x: -0.3, y: 0.2 },
        { score: 5, x: null, y: null },
      ],
      score: 24,
    },
  ],
  equipmentSetupId: null,
  formatSnapshot: JSON.stringify({
    arrowsPerEnd: 3,
    bowCategory: "recurve",
    distanceM: 70,
    indoor: false,
    maxScorePerArrow: 10,
    targetFaceCm: 122,
  }),
  id,
  kind: "practice",
  notes: "",
  plannedArrows: 3,
  rpe: 5,
  status: "complete",
  technicalFocus: "",
});

bunDescribe("the browser-side session accessor", () => {
  bunTest("round-trips plotted arrows through storage", async () => {
    const stored = await createLocalSessions().save(arrowInput("local-1"));
    bunExpect(stored.ends[0]?.arrows).toEqual([
      { score: 10, x: 0.02, y: -0.01 },
      { score: 9, x: -0.3, y: 0.2 },
      { score: 5, x: null, y: null },
    ]);

    // A fresh instance simulates a reload: everything must come back out.
    const reloaded = await createLocalSessions().get("local-1");
    bunExpect(reloaded?.ends).toEqual(stored.ends);
  });

  bunTest("loads pre-arrow sessions with an empty arrow list", async () => {
    globalThis.localStorage.setItem(
      "athletehub.local.sessions",
      JSON.stringify([
        {
          actualArrows: 6,
          athleteId: "athlete-1",
          createdAt: "2026-09-01T00:00:00.000Z",
          date: "2026-09-01",
          ends: [{ arrowCount: 6, score: 54 }],
          equipmentSetupId: null,
          formatSnapshot: "{}",
          id: "legacy-1",
          kind: "practice",
          notes: "",
          plannedArrows: 6,
          status: "complete",
          technicalFocus: "",
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
      ])
    );

    const loaded = await createLocalSessions().get("legacy-1");
    bunExpect(loaded?.ends).toEqual([{ arrowCount: 6, arrows: [], score: 54 }]);
  });
});
