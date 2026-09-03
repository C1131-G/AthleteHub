import { readStoredArray, writeStored } from "@/lib/storage";

import { athleteSchema } from "./athlete-types";
import type { Athlete, AthleteInput } from "./athlete-types";

const STORAGE_KEY = "athletehub.athletes.v1";

const seedAthletes: Athlete[] = [
  "Jatin Kumar",
  "Suryansh Singh",
  "Tanmay Sharma",
  "Roshan Verma",
  "Aryan Raj",
  "Bhawana Devi",
  "Pragya Singh",
  "Manasvi Gupta",
  "Nikita Yadav",
  "Amrita Kumari",
].map((fullName, index) => {
  const now = new Date().toISOString();
  return {
    armSpanCm: 175,
    athleteId: `AH-${String(index + 1).padStart(3, "0")}`,
    category: "recurve",
    createdAt: now,
    dateOfBirth: "2005-01-01",
    equipmentNotes: "Profile imported from the July monthly report.",
    fullName,
    heightCm: 170,
    id: `seed-${index + 1}`,
    status: "active",
    targetDistanceM: 70,
    targetScore: 650,
    technicalFocus: "Shot routine and release consistency",
    updatedAt: now,
    weightKg: 65,
  };
});

const readAthletes = (): Athlete[] => {
  const stored = readStoredArray(STORAGE_KEY);
  if (stored.length === 0) {
    writeStored(STORAGE_KEY, seedAthletes);
    return seedAthletes;
  }

  // Keep every record that still parses: one corrupt entry must not discard
  // the rest of the roster.
  const athletes = stored.flatMap((value) => {
    const result = athleteSchema.safeParse(value);
    return result.success ? [result.data] : [];
  });
  return athletes.length > 0 ? athletes : seedAthletes;
};

const writeAthletes = (athletes: Athlete[]) =>
  writeStored(STORAGE_KEY, athletes);

export interface AthleteRepository {
  list: () => Athlete[];
  get: (id: string) => Athlete | undefined;
  create: (input: AthleteInput) => Athlete;
  update: (id: string, input: AthleteInput) => Athlete | undefined;
}

export const athleteRepository: AthleteRepository = {
  create: (input) => {
    const athletes = readAthletes();
    const now = new Date().toISOString();
    const athlete: Athlete = {
      ...input,
      createdAt: now,
      id: crypto.randomUUID(),
      updatedAt: now,
    };
    writeAthletes([athlete, ...athletes]);
    return athlete;
  },
  get: (id) => readAthletes().find((athlete) => athlete.id === id),
  list: () => readAthletes(),
  update: (id, input) => {
    const athletes = readAthletes();
    const existing = athletes.find((athlete) => athlete.id === id);
    if (!existing) {
      return;
    }

    const updated: Athlete = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    writeAthletes(
      athletes.map((athlete) => (athlete.id === id ? updated : athlete))
    );
    return updated;
  },
};
