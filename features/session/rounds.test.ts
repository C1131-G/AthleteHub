import {
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import { applyRound, roundById, roundCatalogue } from "./rounds";
import { sessionFormatSchema } from "./session-types";

bunDescribe("round catalogue", () => {
  bunTest("every round pre-fills a format the schema accepts", () => {
    for (const round of roundCatalogue) {
      const format = {
        bowCategory: "recurve",
        ...applyRound(round),
      };
      const parsed = sessionFormatSchema.safeParse(format);
      bunExpect(parsed.success).toBe(true);
    }
  });

  bunTest("rounds are unique and resolvable by id", () => {
    const ids = roundCatalogue.map((round) => round.id);
    bunExpect(new Set(ids).size).toBe(ids.length);
    bunExpect(roundById("wa-720-70")?.distanceM).toBe(70);
    bunExpect(roundById("unknown-round")).toBeUndefined();
  });

  bunTest("applying a round leaves the bow category alone", () => {
    const round = roundById("portsmouth");
    bunExpect(round).toBeDefined();
    const applied = applyRound(round ?? roundCatalogue[0]);
    bunExpect("bowCategory" in applied).toBe(false);
    bunExpect(applied.roundId).toBe("portsmouth");
  });
});
