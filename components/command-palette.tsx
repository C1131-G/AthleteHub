"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useAthletes } from "@/features/athlete/use-athletes";
import { searchPalette } from "@/lib/palette-search";
import type { PaletteItem } from "@/lib/palette-search";

const STATIC_ITEMS: PaletteItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/athletes", label: "Athletes" },
  { href: "/athletes/new", keywords: "create roster", label: "Add athlete" },
  { href: "/equipment", label: "Equipment" },
  { href: "/reports", label: "Reports" },
  { href: "/sessions", label: "Sessions" },
  { href: "/sessions/new", keywords: "log practice", label: "Record session" },
  { href: "/settings", label: "Settings" },
];

interface PaletteState {
  activeIndex: number;
  open: boolean;
  query: string;
}

/**
 * The ⌘K / Ctrl+K command palette: one input, one list, fully keyboard
 * driven (arrow keys move, Enter opens, Escape closes). Items are the static
 * destinations plus one per athlete, ranked by `searchPalette`.
 */
export const CommandPalette = () => {
  const { athletes } = useAthletes();
  const [palette, setPalette] = useState<PaletteState>({
    activeIndex: 0,
    open: false,
    query: "",
  });
  const inputRef = useRef<HTMLInputElement | null>(null);

  const items = useMemo<PaletteItem[]>(
    () => [
      ...STATIC_ITEMS,
      ...athletes.map((athlete) => ({
        href: `/athletes/${athlete.id}`,
        keywords: `${athlete.athleteId} ${athlete.category}`,
        label: athlete.fullName,
      })),
    ],
    [athletes]
  );

  const { activeIndex, open, query } = palette;
  const matches = useMemo(() => searchPalette(query, items), [items, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((current) => ({
          ...current,
          open: !current.open,
        }));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const openMatch = (index: number) => {
    const match = matches[index];
    if (match) {
      setPalette((current) => ({ ...current, open: false }));
      // A palette href is built from route literals defined above; the typed
      // router cannot infer that from a runtime string.
      window.location.assign(match.href);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24">
      <button
        aria-label="Close palette"
        className="bg-foreground/40 absolute inset-0 cursor-default"
        onClick={() => setPalette((current) => ({ ...current, open: false }))}
        type="button"
      />
      <dialog
        aria-label="Command palette"
        className="bg-card ring-foreground/10 relative w-full max-w-xl rounded-xl p-3 ring-1"
        open
      >
        <input
          aria-label="Search commands and athletes"
          autoComplete="off"
          className="border-border bg-input text-foreground w-full rounded-lg border p-2"
          id="palette-query"
          onChange={(event) => {
            setPalette((current) => ({
              ...current,
              activeIndex: 0,
              query: event.target.value,
            }));
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setPalette((current) => ({
                ...current,
                activeIndex: Math.min(
                  current.activeIndex + 1,
                  matches.length - 1
                ),
              }));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setPalette((current) => ({
                ...current,
                activeIndex: Math.max(current.activeIndex - 1, 0),
              }));
            } else if (event.key === "Enter") {
              event.preventDefault();
              openMatch(activeIndex);
            } else if (event.key === "Escape") {
              setPalette((current) => ({ ...current, open: false }));
            }
          }}
          placeholder="Search athletes and pages…"
          ref={inputRef}
          type="text"
        />
        <ul className="mt-2 max-h-72 overflow-y-auto">
          {matches.map((match, index) => (
            <li key={match.href}>
              <button
                className={`w-full rounded-lg px-3 py-2 text-left ${
                  index === activeIndex ? "bg-muted" : ""
                }`}
                onClick={() => openMatch(index)}
                onMouseEnter={() =>
                  setPalette((current) => ({ ...current, activeIndex: index }))
                }
                type="button"
              >
                {match.label}
              </button>
            </li>
          ))}
          {matches.length === 0 ? (
            <li className="text-muted-foreground px-3 py-2 text-sm">
              Nothing matches “{query}”.
            </li>
          ) : null}
        </ul>
      </dialog>
    </div>
  );
};
