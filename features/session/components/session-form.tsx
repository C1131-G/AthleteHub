"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AthletePicker } from "@/features/athlete/athlete-picker";

import type { SessionEndInput, SessionFormat } from "../session-types";
import { useSessions } from "../use-sessions";

const defaultFormat: SessionFormat = {
  arrowsPerEnd: 6,
  bowCategory: "recurve",
  distanceM: 70,
  indoor: false,
  maxScorePerArrow: 10,
  targetFaceCm: 122,
};

type DraftEnd = SessionEndInput & { key: string };
interface SessionFormState {
  date: string;
  ends: DraftEnd[];
  format: SessionFormat;
  notes: string;
  selectedAthleteId: string;
  technicalFocus: string;
}

const newEnd = (key: string, arrowCount: number): DraftEnd => ({
  arrowCount,
  key,
  score: 0,
});

export const SessionForm = ({ athleteId }: { athleteId: string }) => {
  const [form, setForm] = useState<SessionFormState>({
    date: "",
    ends: [newEnd("end-1", defaultFormat.arrowsPerEnd)],
    format: defaultFormat,
    notes: "",
    selectedAthleteId: athleteId === "unassigned" ? "" : athleteId,
    technicalFocus: "",
  });
  const sessionIdRef = useRef("");
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
  const desktopAvailable = globalThis.window?.electronAPI !== undefined;

  const initializeSessionRecording = () => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = crypto.randomUUID();
    }
    if (!desktopAvailable) {
      setFeedback((current) => ({
        ...current,
        error: "Session recording is available in the AthleteHub desktop app.",
      }));
    }
  };
  useEffect(initializeSessionRecording, [desktopAvailable]);

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

  const submit = (complete: boolean) => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = crypto.randomUUID();
    }
    setFeedback({ athleteLocked: feedback.athleteLocked });
    save.mutate(
      {
        complete,
        input: {
          athleteId: form.selectedAthleteId,
          date: form.date,
          ends: form.ends.map(({ key: _key, ...end }) => end),
          format: form.format,
          id: sessionIdRef.current,
          kind: "practice",
          notes: form.notes,
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
      <Card>
        <CardHeader>
          <CardTitle>Ends</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm" aria-live="polite">
            Running score: <strong>{scoreSummary.score}</strong>. Recorded
            arrows: <strong>{scoreSummary.arrows}</strong>.
          </p>
          {form.ends.map((end, index) => (
            <div className="flex items-end gap-3" key={end.key}>
              <div className="flex-1 space-y-2">
                <Label htmlFor={`end-${index}-score`}>
                  End {index + 1} score
                </Label>
                <Input
                  id={`end-${index}-score`}
                  min="0"
                  onChange={(event) =>
                    updateEnd(index, "score", event.target.value)
                  }
                  type="number"
                  value={end.score}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor={`end-${index}-arrows`}>Arrows</Label>
                <Input
                  id={`end-${index}-arrows`}
                  min="1"
                  onChange={(event) =>
                    updateEnd(index, "arrowCount", event.target.value)
                  }
                  type="number"
                  value={end.arrowCount}
                />
              </div>
              <Button
                aria-label={`Remove end ${index + 1}`}
                disabled={form.ends.length === 1}
                onClick={() =>
                  updateForm({
                    ends: form.ends.filter((_, endIndex) => endIndex !== index),
                  })
                }
                size="icon"
                type="button"
                variant="ghost"
              >
                <TrashIcon aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button
            onClick={() =>
              updateForm({
                ends: [
                  ...form.ends,
                  newEnd(crypto.randomUUID(), form.format.arrowsPerEnd),
                ],
              })
            }
            type="button"
            variant="outline"
          >
            <PlusIcon aria-hidden="true" /> Add end
          </Button>
        </CardContent>
      </Card>
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
          disabled={save.isPending || !desktopAvailable}
          onClick={() => submit(false)}
          type="button"
          variant="outline"
        >
          Save draft
        </Button>
        <Button disabled={save.isPending || !desktopAvailable} type="submit">
          {save.isPending ? "Saving…" : "Complete session"}
        </Button>
        <Button
          onClick={() => {
            sessionIdRef.current = crypto.randomUUID();
            updateForm({
              date: "",
              ends: [newEnd(crypto.randomUUID(), form.format.arrowsPerEnd)],
              notes: "",
              selectedAthleteId: athleteId === "unassigned" ? "" : athleteId,
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
