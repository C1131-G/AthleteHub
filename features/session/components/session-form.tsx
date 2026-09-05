"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AthletePicker } from "@/features/athlete/athlete-picker";

import { applyRound, roundById, roundCatalogue } from "../rounds";
import { newEnd } from "../session-form-state";
import type { DraftEnd } from "../session-form-state";
import type {
  SessionArrowInput,
  SessionEndInput,
  SessionFormat,
} from "../session-types";
import { useSessions } from "../use-sessions";
import { SessionEndsEditor } from "./session-ends-editor";

const defaultFormat: SessionFormat = {
  arrowsPerEnd: 6,
  bowCategory: "recurve",
  distanceM: 70,
  indoor: false,
  maxScorePerArrow: 10,
  targetFaceCm: 122,
};

interface SessionFormState {
  date: string;
  durationMin: string;
  ends: DraftEnd[];
  /** One id per recording session; "" mints one on the first save. */
  sessionId: string;
  format: SessionFormat;
  notes: string;
  rpe: string;
  selectedAthleteId: string;
  technicalFocus: string;
}

export const SessionForm = ({ athleteId }: { athleteId: string }) => {
  const [form, setForm] = useState<SessionFormState>({
    date: "",
    durationMin: "",
    ends: [newEnd("end-1", defaultFormat.arrowsPerEnd)],
    format: defaultFormat,
    notes: "",
    rpe: "",
    selectedAthleteId: athleteId === "unassigned" ? "" : athleteId,
    sessionId: crypto.randomUUID(),
    technicalFocus: "",
  });
  const [feedback, setFeedback] = useState<{
    athleteLocked: boolean;
    error?: string;
    success?: string;
  }>({ athleteLocked: false });
  const updateForm = (patch: Partial<SessionFormState>) =>
    setForm((current) => ({ ...current, ...patch }));
  const scoreSummary = useMemo(
    () => ({
      arrows: form.ends.reduce((total, end) => total + end.arrowCount, 0),
      score: form.ends.reduce((total, end) => total + end.score, 0),
    }),
    [form.ends]
  );
  const { save } = useSessions(form.selectedAthleteId || athleteId);

  const updateEnd = (
    index: number,
    field: keyof SessionEndInput,
    value: string
  ) => {
    const numericValue = Number(value);
    updateForm({
      ends: form.ends.map((end, endIndex) =>
        endIndex === index ? { ...end, [field]: numericValue } : end
      ),
    });
  };

  // Plotted arrows are the source of truth for a plotted end's score, so the
  // two can never disagree with each other in the saved record.
  const updateEndArrows = (index: number, arrows: SessionArrowInput[]) => {
    updateForm({
      ends: form.ends.map((end, endIndex) =>
        endIndex === index
          ? {
              ...end,
              arrows,
              score: arrows.reduce((total, arrow) => total + arrow.score, 0),
            }
          : end
      ),
    });
  };

  const submit = (complete: boolean) => {
    // Minted on first save so the prerender never evaluates crypto.
    const sessionId =
      form.sessionId === "" ? crypto.randomUUID() : form.sessionId;
    if (form.sessionId === "") {
      updateForm({ sessionId });
    }
    setFeedback({ athleteLocked: feedback.athleteLocked });
    save.mutate(
      {
        complete,
        input: {
          athleteId: form.selectedAthleteId,
          date: form.date,
          durationMin:
            form.durationMin === "" ? undefined : Number(form.durationMin),
          ends: form.ends.map(({ key: _key, ...end }) => end),
          format: form.format,
          id: sessionId,
          kind: "practice",
          notes: form.notes,
          rpe: form.rpe === "" ? undefined : Number(form.rpe),
          technicalFocus: form.technicalFocus,
        },
      },
      {
        onError: (mutationError) =>
          setFeedback((current) => ({
            ...current,
            error:
              mutationError instanceof Error
                ? mutationError.message
                : "The session could not be saved.",
          })),
        onSuccess: (result) => {
          if (result.status === "invalid") {
            setFeedback((current) => ({
              ...current,
              error: Object.values(result.fieldErrors).join(" "),
            }));
            return;
          }
          setFeedback({
            athleteLocked: true,
            success: complete ? "Session completed and saved." : "Draft saved.",
          });
        },
      }
    );
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit(true);
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Session details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="session-athlete">Athlete</Label>
            <AthletePicker
              id="session-athlete"
              disabled={feedback.athleteLocked}
              onChange={(selectedAthleteId) =>
                updateForm({ selectedAthleteId })
              }
              value={form.selectedAthleteId}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-date">Date</Label>
            <DatePicker
              id="session-date"
              onChange={(date) => updateForm({ date })}
              value={form.date}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-round">Round</Label>
            <Select
              onValueChange={(value) => {
                // Clearing the selection (null) or picking Freehand both mean
                // a freehand session with no roundId.
                const round = value ? roundById(value) : undefined;
                updateForm({
                  ends: round
                    ? [newEnd(crypto.randomUUID(), round.arrowsPerEnd)]
                    : form.ends,
                  format: round
                    ? {
                        ...form.format,
                        ...applyRound(round),
                        bowCategory: form.format.bowCategory,
                      }
                    : { ...form.format, roundId: undefined },
                });
              }}
              value={form.format.roundId ?? "freehand"}
            >
              <SelectTrigger id="session-round">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="freehand">Freehand (no round)</SelectItem>
                {roundCatalogue.map((round) => (
                  <SelectItem key={round.id} value={round.id}>
                    {round.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-distance">Distance (m)</Label>
            <Input
              id="session-distance"
              min="1"
              onChange={(event) =>
                updateForm({
                  format: {
                    ...form.format,
                    distanceM: Number(event.target.value),
                  },
                })
              }
              type="number"
              value={form.format.distanceM}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-arrows">Arrows per end</Label>
            <Input
              id="session-arrows"
              min="1"
              onChange={(event) =>
                updateForm({
                  format: {
                    ...form.format,
                    arrowsPerEnd: Number(event.target.value),
                  },
                })
              }
              type="number"
              value={form.format.arrowsPerEnd}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-duration">Duration (min)</Label>
            <Input
              id="session-duration"
              min="1"
              onChange={(event) =>
                updateForm({ durationMin: event.target.value })
              }
              type="number"
              value={form.durationMin}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-rpe">Session RPE (1–10)</Label>
            <Input
              id="session-rpe"
              max="10"
              min="1"
              onChange={(event) => updateForm({ rpe: event.target.value })}
              type="number"
              value={form.rpe}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-focus">Technical focus</Label>
            <Input
              id="session-focus"
              onChange={(event) =>
                updateForm({ technicalFocus: event.target.value })
              }
              value={form.technicalFocus}
            />
          </div>
        </CardContent>
      </Card>
      <SessionEndsEditor
        arrowsPerEnd={form.format.arrowsPerEnd}
        ends={form.ends}
        maxScorePerArrow={form.format.maxScorePerArrow}
        onAdd={() =>
          updateForm({
            ends: [
              ...form.ends,
              newEnd(crypto.randomUUID(), form.format.arrowsPerEnd),
            ],
          })
        }
        onRemove={(index) =>
          updateForm({
            ends: form.ends.filter((_, endIndex) => endIndex !== index),
          })
        }
        onUpdate={updateEnd}
        onUpdateArrows={updateEndArrows}
        scoreSummary={scoreSummary}
      />
      <Card>
        <CardHeader>
          <CardTitle>Coach notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="sr-only" htmlFor="session-notes">
            Coach notes
          </Label>
          <Textarea
            className="min-h-28"
            id="session-notes"
            onChange={(event) => updateForm({ notes: event.target.value })}
            value={form.notes}
          />
        </CardContent>
      </Card>
      {feedback.error ? (
        <p className="text-destructive text-sm" role="alert">
          {feedback.error}
        </p>
      ) : null}
      <p aria-live="polite" className="text-muted-foreground text-sm">
        {feedback.success}
      </p>
      <div className="flex flex-wrap justify-end gap-3">
        <Button
          disabled={save.isPending}
          onClick={() => submit(false)}
          type="button"
          variant="outline"
        >
          Save draft
        </Button>
        <Button disabled={save.isPending} type="submit">
          {save.isPending ? "Saving…" : "Complete session"}
        </Button>
        <Button
          onClick={() => {
            updateForm({
              date: "",
              durationMin: "",
              ends: [newEnd(crypto.randomUUID(), form.format.arrowsPerEnd)],
              notes: "",
              rpe: "",
              selectedAthleteId: athleteId === "unassigned" ? "" : athleteId,
              sessionId: "",
              technicalFocus: "",
            });
            setFeedback({ athleteLocked: false });
          }}
          type="button"
          variant="ghost"
        >
          Start another session
        </Button>
      </div>
    </form>
  );
};
