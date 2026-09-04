import {
  beforeEach as bunBeforeEach,
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import { createLocalCollections } from "./local-collections";
import { createMemoryStorage } from "./test/memory-storage";

bunBeforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: createMemoryStorage(),
  });
});

const athlete = (id: string, code: string, fullName: string) => ({
  category: "recurve",
  code,
  dateOfBirth: "2005-01-01",
  fullName,
  id,
  snapshot: JSON.stringify({ fullName, id }),
  status: "active",
});

const weekly = (id: string, athleteId: string, weekStart: string) => ({
  athleteId,
  id,
  snapshot: JSON.stringify({ athleteId, id, weekStart }),
  status: "completed",
  weekStart,
});

bunDescribe("the browser-side collections", () => {
  bunTest("orders athletes by name and reports by recency", async () => {
    const collections = createLocalCollections();
    await collections.athletes.save(athlete("a", "AH-002", "Zoya"));
    await collections.athletes.save(athlete("b", "AH-001", "Aarav"));
    const athletes = await collections.athletes.list();
    bunExpect(athletes.map((row) => row.id)).toEqual(["b", "a"]);

    await collections.weeklyReports.save(weekly("w1", "x", "2026-03-02"));
    await collections.weeklyReports.save(weekly("w2", "x", "2026-03-09"));
    const weeks = await collections.weeklyReports.list();
    bunExpect(weeks.map((row) => row.id)).toEqual(["w2", "w1"]);
  });

  bunTest("rejects a second record on a unique value", async () => {
    const collections = createLocalCollections();
    await collections.athletes.save(athlete("a", "AH-001", "Aarav"));
    // Mirrors the database's P2002, so the services handle both the same way.
    await bunExpect(
      collections.athletes.save(athlete("b", "AH-001", "Someone"))
    ).rejects.toThrow();
  });

  bunTest("updating a record keeps its own unique value", async () => {
    const collections = createLocalCollections();
    await collections.athletes.save(athlete("a", "AH-001", "Aarav"));
    const updated = await collections.athletes.save(
      athlete("a", "AH-001", "Aarav Renamed")
    );
    bunExpect(updated.id).toBe("a");
    bunExpect(await collections.athletes.list()).toHaveLength(1);
  });

  bunTest("hides archived rows and can list only those", async () => {
    const collections = createLocalCollections();
    await collections.athletes.save(athlete("a", "AH-001", "Aarav"));
    await collections.athletes.archive("a");

    bunExpect(await collections.athletes.list()).toEqual([]);
    bunExpect(
      await collections.athletes.list({ includeArchived: true })
    ).toHaveLength(1);
    bunExpect(
      await collections.athletes.list({ archivedOnly: true })
    ).toHaveLength(1);

    await collections.athletes.restore("a");
    bunExpect(await collections.athletes.list()).toHaveLength(1);
    bunExpect(await collections.athletes.list({ archivedOnly: true })).toEqual(
      []
    );
  });

  bunTest("scopes a list to one athlete", async () => {
    const collections = createLocalCollections();
    await collections.weeklyReports.save(weekly("w1", "a1", "2026-03-02"));
    await collections.weeklyReports.save(weekly("w2", "a2", "2026-03-02"));

    bunExpect(
      await collections.weeklyReports.list({ athleteId: "a1" })
    ).toHaveLength(1);
  });

  bunTest("keeps reading when one stored row is unreadable", async () => {
    const collections = createLocalCollections();
    await collections.athletes.save(athlete("a", "AH-001", "Aarav"));
    const stored: unknown[] = JSON.parse(
      globalThis.localStorage.getItem("athletehub.local.athletes") ?? "[]"
    );
    globalThis.localStorage.setItem(
      "athletehub.local.athletes",
      JSON.stringify([...stored, { id: "broken" }, "not an object"])
    );

    bunExpect(await collections.athletes.list()).toHaveLength(1);
  });
});
