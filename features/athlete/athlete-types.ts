export const athleteStatuses = ["active", "medical-leave", "inactive"] as const;
export const bowCategories = ["recurve", "compound", "barebow"] as const;

export type AthleteStatus = (typeof athleteStatuses)[number];
export type BowCategory = (typeof bowCategories)[number];

export interface Athlete {
  id: string;
  athleteId: string;
  fullName: string;
  dateOfBirth: string;
  photoUrl?: string;
  category: BowCategory;
  status: AthleteStatus;
  heightCm?: number;
  weightKg?: number;
  armSpanCm?: number;
  equipmentNotes: string;
  targetDistanceM?: number;
  targetScore?: number;
  technicalFocus: string;
  createdAt: string;
  updatedAt: string;
}

export type AthleteInput = Omit<Athlete, "id" | "createdAt" | "updatedAt">;
