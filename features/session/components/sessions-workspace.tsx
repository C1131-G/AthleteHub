"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AthletePicker } from "@/features/athlete/athlete-picker";

import { useSessions } from "../use-sessions";

export const SessionsWorkspace = () => {
  const desktopAvailable = globalThis.window?.electronAPI !== undefined;
  const [athleteId, setAthleteId] = useState("");
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const sessionsQuery = useSessions(athleteId);
  const sessions = useMemo(
    () =>
      (sessionsQuery.data ?? []).filter(
        (session) =>
          (!date || session.date === date) &&
          (!query ||
            `${session.technicalFocus} ${session.notes}`
              .toLowerCase()
              .includes(query.toLowerCase()))
      ),
    [date, query, sessionsQuery.data]
  );
  let sessionContent: ReactNode;
  if (!desktopAvailable) {
    sessionContent = (
      <p role="alert">
        Session history is available in the AthleteHub desktop app.
      </p>
    );
  } else if (!athleteId) {
    sessionContent = (
      <p className="text-muted-foreground">
        Choose an athlete to view sessions.
      </p>
    );
  } else if (sessionsQuery.data && sessions.length === 0) {
    sessionContent = (
      <p className="text-muted-foreground">No sessions match these filters.</p>
    );
  } else if (sessionsQuery.data) {
    sessionContent = (
      <ul className="space-y-3">
        {sessions.map((session) => (
          <li
            className="border-border flex items-center justify-between gap-4 rounded-md border p-3"
            key={session.id}
          >
            <div>
              <p className="font-medium">{session.date}</p>
              <p className="text-muted-foreground text-sm">
                {session.status === "draft" ? "Draft" : "Complete"} ·{" "}
                {session.ends.length} ends
              </p>
            </div>
            <Link
              className={buttonVariants({ size: "sm", variant: "outline" })}
              href={`/sessions/${session.id}`}
            >
              View session
            </Link>
          </li>
        ))}
      </ul>
    );
  } else if (sessionsQuery.isError) {
    sessionContent = (
      <p role="alert">Sessions could not be loaded. Try again.</p>
    );
  } else {
    sessionContent = <p aria-live="polite">Loading sessions…</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Find sessions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="sessions-athlete">Athlete</Label>
            <AthletePicker
              id="sessions-athlete"
              onChange={setAthleteId}
              value={athleteId}
            />
          </div>
          <div>
            <Label htmlFor="sessions-date">Date</Label>
            <DatePicker id="sessions-date" onChange={setDate} value={date} />
          </div>
          <div>
            <Label htmlFor="sessions-search">Search</Label>
            <Input
              id="sessions-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Focus or notes"
              value={query}
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recorded sessions</CardTitle>
        </CardHeader>
        <CardContent>{sessionContent}</CardContent>
      </Card>
    </div>
  );
};
