import {
  beforeEach as bunBeforeEach,
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import { createMemoryStorage } from "@/lib/test/memory-storage";

import { athleteRepository } from "./athlete-repository";
import type { AthleteInput } from "./athlete-types";

const STORAGE_KEY = "athletehub.athletes.v1";

bunBeforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: createMemoryStorage(),
  });
});

const athleteInput = (overrides: Partial<AthleteInput> = {}): AthleteInput => ({
  athleteId: "AH-500",
  category: "recurve",
  dateOfBirth: "2004-06-15",
  equipmentNotes: "",
  fullName: "New Archer",
  status: "active",
  technicalFocus: "Release",
  ...overrides,
});

const storedAthletes = (): unknown[] =>
  JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY) ?? "[]");

bunDescribe("athlete persistence", () => {
  bunTest("seeds the roster on first read", () => {
    bunExpect(athleteRepository.list()).toHaveLength(10);
    bunExpect(storedAthletes()).toHaveLength(10);
  });

  bunTest("skips stored records that no longer parse", () => {
    athleteRepository.list();
    const stored = storedAthletes();
    globalThis.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...stored, { id: "broken" }, "not an object"])
    );

    // One corrupt record must not discard the rest of the roster.
    bunExpect(athleteRepository.list()).toHaveLength(10);
  });

  bunTest("rejects a record whose fields have the wrong type", () => {
    globalThis.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        // A duck-type guard would accept this: the keys are all present.
        { athleteId: null, fullName: {}, id: 1 },
      ])
    );
    bunExpect(
      athleteRepository
        .list()
        .every((athlete) => athlete.id.startsWith("seed-"))
    ).toBe(true);
  });

  bunTest("rejects a record with an impossible date of birth", () => {
    const [first, ...rest] = athleteRepository.list();
    if (!first) {
      throw new Error("expected the seeded roster");
    }
    globalThis.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ ...first, dateOfBirth: "2005-02-30" }, ...rest])
    );
    bunExpect(athleteRepository.list()).toHaveLength(9);
  });
});

bunDescribe("athlete mutations", () => {
  bunTest("creates an athlete at the top of the roster", () => {
    athleteRepository.list();
    const created = athleteRepository.create(athleteInput());
    bunExpect(created.id).toBeTruthy();
    bunExpect(created.createdAt).toBe(created.updatedAt);
    bunExpect(athleteRepository.list()[0]?.fullName).toBe("New Archer");
  });

  bunTest("updates an athlete and keeps its identity", () => {
    const created = athleteRepository.create(athleteInput());
    const updated = athleteRepository.update(
      created.id,
      athleteInput({ fullName: "Renamed Archer" })
    );
    bunExpect(updated?.id).toBe(created.id);
    bunExpect(updated?.createdAt).toBe(created.createdAt);
    bunExpect(athleteRepository.get(created.id)?.fullName).toBe(
      "Renamed Archer"
    );
  });

  bunTest("returns nothing for an unknown athlete", () => {
    bunExpect(athleteRepository.get("missing")).toBeUndefined();
    bunExpect(
      athleteRepository.update("missing", athleteInput())
    ).toBeUndefined();
  });
});
