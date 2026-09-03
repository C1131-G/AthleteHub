"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

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
const newEnd = (key: string, arrowCount: number): DraftEnd => ({
  arrowCount,
  key,
  score: 0,
});

export const SessionForm = ({ athleteId }: { athleteId: string }) => {
  const [selectedAthleteId, setSelectedAthleteId] = useState(
    athleteId === "unassigned" ? "" : athleteId
  );
  const [date, setDate] = useState("");
  const [ends, setEnds] = useState<DraftEnd[]>([
    newEnd("end-1", defaultFormat.arrowsPerEnd),
  ]);
  const sessionIdRef = useRef("");
  const [format, setFormat] = useState(defaultFormat);
  const [notes, setNotes] = useState("");
  const [technicalFocus, setTechnicalFocus] = useState("");
  const [error, setError] = useState<string | undefined>();
  const { save } = useSessions(selectedAthleteId || athleteId);
  const desktopAvailable = globalThis.window?.electronAPI !== undefined;

  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = crypto.randomUUID();
    }
    if (!desktopAvailable) {
      setError("Session recording is available in the AthleteHub desktop app.");
    }
  }, [desktopAvailable]);

  const updateEnd = (
    index: number,
    field: keyof SessionEndInput,
    value: string
  ) => {
    const numericValue = Number(value);
    setEnds((current) =>
      current.map((end, endIndex) =>
        endIndex === index ? { ...end, [field]: numericValue } : end
      )
    );
  };

  const submit = (complete: boolean) => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = crypto.randomUUID();
    }
    setError(undefined);
    save.mutate(
      {
        complete,
        input: {
          athleteId: selectedAthleteId,
          date,
          ends: ends.map(({ key: _key, ...end }) => end),
          format,
          id: sessionIdRef.current,
          kind: "practice",
          notes,
          technicalFocus,
        },
      },
      {
        onError: (mutationError) =>
          setError(
            mutationError instanceof Error
              ? mutationError.message
              : "The session could not be saved."
          ),
        onSuccess: (result) => {
          if (result.status === "invalid") {
            setError(Object.values(result.fieldErrors).join(" "));
          }
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
              onChange={setSelectedAthleteId}
              value={selectedAthleteId}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-date">Date</Label>
            <DatePicker id="session-date" onChange={setDate} value={date} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-distance">Distance (m)</Label>
            <Input
              id="session-distance"
              min="1"
              onChange={(event) =>
                setFormat((current) => ({
                  ...current,
                  distanceM: Number(event.target.value),
                }))
              }
              type="number"
              value={format.distanceM}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-arrows">Arrows per end</Label>
            <Input
              id="session-arrows"
              min="1"
              onChange={(event) =>
                setFormat((current) => ({
                  ...current,
                  arrowsPerEnd: Number(event.target.value),
                }))
              }
              type="number"
              value={format.arrowsPerEnd}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-focus">Technical focus</Label>
            <Input
              id="session-focus"
              onChange={(event) => setTechnicalFocus(event.target.value)}
              value={technicalFocus}
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Ends</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ends.map((end, index) => (
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
                disabled={ends.length === 1}
                onClick={() =>
                  setEnds((current) =>
                    current.filter((_, endIndex) => endIndex !== index)
                  )
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
              setEnds((current) => [
                ...current,
                newEnd(crypto.randomUUID(), format.arrowsPerEnd),
              ])
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
            onChange={(event) => setNotes(event.target.value)}
            value={notes}
          />
        </CardContent>
      </Card>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
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
            window.location.reload();
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
