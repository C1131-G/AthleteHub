import type { SessionEndInput } from "./session-types";

export type DraftEnd = SessionEndInput & { key: string };

export const newEnd = (key: string, arrowCount: number): DraftEnd => ({
  arrowCount,
  key,
  score: 0,
});
