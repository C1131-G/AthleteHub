"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { DraftEnd } from "../session-form-state";
import type { SessionEndInput } from "../session-types";

interface SessionEndsEditorProps {
  arrowsPerEnd: number;
  ends: DraftEnd[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (
    index: number,
    field: keyof SessionEndInput,
    value: string
  ) => void;
  scoreSummary: { arrows: number; score: number };
}

export const SessionEndsEditor = ({
  arrowsPerEnd,
  ends,
  onAdd,
  onRemove,
  onUpdate,
  scoreSummary,
}: SessionEndsEditorProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Ends</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <p className="text-muted-foreground text-sm" aria-live="polite">
        Running score: <strong>{scoreSummary.score}</strong>. Recorded arrows:{" "}
        <strong>{scoreSummary.arrows}</strong>.
      </p>
      {ends.map((end, index) => (
        <div className="flex items-end gap-3" key={end.key}>
          <div className="flex-1 space-y-2">
            <Label htmlFor={`end-${index}-score`}>End {index + 1} score</Label>
            <Input
              id={`end-${index}-score`}
              min="0"
              onChange={(event) => onUpdate(index, "score", event.target.value)}
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
                onUpdate(index, "arrowCount", event.target.value)
              }
              type="number"
              value={end.arrowCount}
            />
          </div>
          <Button
            aria-label={`Remove end ${index + 1}`}
            disabled={ends.length === 1}
            onClick={() => onRemove(index)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <TrashIcon aria-hidden="true" />
          </Button>
        </div>
      ))}
      <Button onClick={onAdd} type="button" variant="outline">
        <PlusIcon aria-hidden="true" /> Add end
      </Button>
      <p className="sr-only">New ends use {arrowsPerEnd} arrows by default.</p>
    </CardContent>
  </Card>
);
