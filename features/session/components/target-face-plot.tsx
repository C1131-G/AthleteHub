"use client";

// The target face is a role="application" widget that captures the arrow keys
// for keyboard dragging, which jsx-a11y's static analysis cannot model.
// oxlint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex

import { useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeGroupStats, describeBias } from "@/lib/grouping";

import type { SessionArrowInput } from "../session-types";

interface TargetFacePlotProps {
  arrows: SessionArrowInput[];
  faceCm?: number;
  maxArrows: number;
  maxScore: number;
  onChange: (arrows: SessionArrowInput[]) => void;
}

interface PlottedArrow {
  score: number;
  x: number;
  y: number;
}

const VIEW_BOX = 200;
const FACE_RADIUS = 90;
const RING_COLOURS = ["#f5f6f7", "#2b2f36", "#3b82f6", "#ef4444", "#facc15"];
const RING_COUNT = RING_COLOURS.length;
const KEYBOARD_STEP = 0.05;
const FINE_STEP = 0.01;
const DRAG_HIT_RADIUS = 0.08;

const clamp = (value: number) => Math.min(1, Math.max(-1, value));

/**
 * A default score for an arrow placed at a point, read straight off the rings:
 * the face is divided into maxScore rings of equal width, outermost scoring 1.
 */
const inferScore = (x: number, y: number, maxScore: number) =>
  Math.min(
    maxScore,
    Math.max(1, maxScore - Math.floor(Math.hypot(x, y) * maxScore))
  );

const toPlotted = (arrows: SessionArrowInput[]): PlottedArrow[] =>
  arrows.map((arrow) => ({
    score: arrow.score,
    x: arrow.x ?? 0,
    y: arrow.y ?? 0,
  }));

const fromPlotted = (arrows: PlottedArrow[]): SessionArrowInput[] =>
  arrows.map(({ score, x, y }) => ({ score, x, y }));

export const TargetFacePlot = ({
  arrows,
  faceCm,
  maxArrows,
  maxScore,
  onChange,
}: TargetFacePlotProps) => {
  const faceRef = useRef<SVGSVGElement | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const plotted = toPlotted(arrows);

  const pointFromEvent = (event: React.PointerEvent<SVGSVGElement>) => {
    const face = faceRef.current;
    if (!face) {
      return null;
    }
    const rect = face.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 2 - 1),
      y: clamp(-(((event.clientY - rect.top) / rect.height) * 2 - 1)),
    };
  };

  const replace = (index: number, arrow: PlottedArrow) => {
    const next = plotted.map((current, current_index) =>
      current_index === index ? arrow : current
    );
    onChange(fromPlotted(next));
  };

  const handleFaceClick = (event: React.PointerEvent<SVGSVGElement>) => {
    if (plotted.length >= maxArrows) {
      return;
    }
    const point = pointFromEvent(event);
    if (!point) {
      return;
    }
    const next = [
      ...plotted,
      {
        score: inferScore(point.x, point.y, maxScore),
        x: point.x,
        y: point.y,
      },
    ];
    setSelectedIndex(next.length - 1);
    onChange(fromPlotted(next));
  };

  const handleFacePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = pointFromEvent(event);
    if (!point) {
      return;
    }
    const hit = plotted.findIndex(
      (arrow) =>
        Math.hypot(arrow.x - point.x, arrow.y - point.y) <= DRAG_HIT_RADIUS
    );
    if (hit !== -1) {
      setSelectedIndex(hit);
      dragIndexRef.current = hit;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handleFacePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const index = dragIndexRef.current;
    const point = pointFromEvent(event);
    const arrow = index === null ? undefined : plotted[index];
    if (index === null || !arrow || !point) {
      return;
    }
    replace(index, { ...arrow, x: point.x, y: point.y });
  };

  const endDrag = () => {
    dragIndexRef.current = null;
  };

  const handleFaceKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = selectedIndex ?? (plotted.length > 0 ? 0 : null);
    if (index === null) {
      return;
    }
    const step = event.shiftKey ? FINE_STEP : KEYBOARD_STEP;
    const arrow = plotted[index];
    if (!arrow) {
      return;
    }
    const moveFor = (key: string) => {
      switch (key) {
        case "ArrowDown": {
          return { x: 0, y: -step };
        }
        case "ArrowLeft": {
          return { x: -step, y: 0 };
        }
        case "ArrowRight": {
          return { x: step, y: 0 };
        }
        case "ArrowUp": {
          return { x: 0, y: step };
        }
        default: {
          break;
        }
      }
    };
    const move = moveFor(event.key);
    if (!move) {
      return;
    }
    event.preventDefault();
    setSelectedIndex(index);
    replace(index, {
      ...arrow,
      x: clamp(arrow.x + move.x),
      y: clamp(arrow.y + move.y),
    });
  };

  const removeSelected = () => {
    if (selectedIndex === null) {
      return;
    }
    onChange(
      fromPlotted(plotted.filter((_, index) => index !== selectedIndex))
    );
    setSelectedIndex(null);
  };

  const selectedArrow =
    selectedIndex === null ? undefined : plotted[selectedIndex];
  const group = computeGroupStats(plotted);
  const radiusToCm = faceCm
    ? (value: number) => Math.round(value * (faceCm / 2))
    : null;

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      {/* The application role with a tabindex is deliberate: it is the ARIA
          pattern for a widget that captures the arrow keys for dragging. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
      <div
        aria-label={
          plotted.length === 0
            ? "Target face editor. Click the face to place arrows, or move the selected arrow with the arrow keys."
            : `Target face editor with ${plotted.length} plotted arrows. Use the arrow keys to move the selected arrow; hold Shift for fine steps.`
        }
        className="shrink-0 cursor-crosshair touch-none rounded-xl border p-2 focus-visible:outline-2"
        onKeyDown={handleFaceKeyDown}
        role="application"
        tabIndex={0}
      >
        <svg
          aria-hidden="true"
          height={VIEW_BOX}
          onClick={handleFaceClick}
          onPointerDown={handleFacePointerDown}
          onPointerMove={handleFacePointerMove}
          onPointerUp={endDrag}
          ref={faceRef}
          role="presentation"
          viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`}
          width={VIEW_BOX}
        >
          {Array.from({ length: RING_COUNT }, (ring, ringIndex) => (
            <circle
              cx={VIEW_BOX / 2}
              cy={VIEW_BOX / 2}
              fill={
                RING_COLOURS[
                  // Outermost ring first, gold (the last colour) in the middle.
                  RING_COUNT - 1 - ringIndex
                ]
              }
              key={ringIndex}
              r={FACE_RADIUS * ((ringIndex + 1) / RING_COUNT)}
              stroke="#0a0b0d"
              strokeWidth={0.5}
            />
          ))}
          {plotted.map((arrow, index) => (
            <circle
              cx={VIEW_BOX / 2 + arrow.x * FACE_RADIUS}
              cy={VIEW_BOX / 2 - arrow.y * FACE_RADIUS}
              fill={index === selectedIndex ? "#0a0b0d" : "#ffffff"}
              key={`${arrow.x}-${arrow.y}-${index}`}
              opacity={0.85}
              r={4}
              stroke={index === selectedIndex ? "#facc15" : "#0a0b0d"}
              strokeWidth={1.5}
            />
          ))}
        </svg>
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          {plotted.length}/{maxArrows} arrows placed. Click the face to place an
          arrow; drag it to adjust. Focus the face and use the arrow keys to
          nudge the selected arrow (Shift for fine steps).
        </p>
        {selectedArrow ? (
          <div className="flex items-end gap-2">
            <div className="w-24 space-y-1">
              <Label htmlFor="target-face-arrow-score">
                Arrow {(selectedIndex ?? 0) + 1} score
              </Label>
              <Input
                id="target-face-arrow-score"
                max={maxScore}
                min="0"
                onChange={(event) => {
                  if (selectedIndex === null) {
                    return;
                  }
                  const score = Number(event.target.value);
                  if (Number.isNaN(score)) {
                    return;
                  }
                  replace(selectedIndex, { ...selectedArrow, score });
                }}
                type="number"
                value={selectedArrow.score}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="target-face-arrow-position">Position</Label>
              <p
                className="text-muted-foreground h-9 text-sm leading-9"
                id="target-face-arrow-position"
              >
                x {selectedArrow.x.toFixed(2)}, y {selectedArrow.y.toFixed(2)}
              </p>
            </div>
            <button
              className="text-destructive text-sm underline underline-offset-4"
              onClick={removeSelected}
              type="button"
            >
              Remove arrow
            </button>
          </div>
        ) : null}
        {group && plotted.length > 0 ? (
          <p aria-live="polite" className="text-muted-foreground text-sm">
            Group of {plotted.length}: mean radius{" "}
            {radiusToCm
              ? `${radiusToCm(group.meanRadius)} cm`
              : group.meanRadius.toFixed(2)}
            , spread{" "}
            {radiusToCm
              ? `${radiusToCm(group.groupSize)} cm`
              : group.groupSize.toFixed(2)}
            . {describeBias(group.centroid)}.
          </p>
        ) : null}
      </div>
    </div>
  );
};
