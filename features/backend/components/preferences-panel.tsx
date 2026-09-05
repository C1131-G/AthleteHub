"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePreferences } from "@/lib/use-preferences";

const WEEK_STARTS = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Saturday", value: 6 },
] as const;

/**
 * Ranking distance, report week start, and backup count — the values the
 * dashboard, the report calendar, and the desktop backup rotation read. Theme
 * preference stays with next-themes; its switcher lives on this page.
 */
export const PreferencesPanel = () => {
  const { preferences, ready, update, updating } = usePreferences();
  const [rankingDistance, setRankingDistance] = useState("");
  const [backupCount, setBackupCount] = useState("");

  useEffect(() => {
    if (ready) {
      setRankingDistance(String(preferences.rankingDistance));
      setBackupCount(String(preferences.backupCount));
    }
  }, [preferences.backupCount, preferences.rankingDistance, ready]);

  const commitNumber = (
    raw: string,
    key: "backupCount" | "rankingDistance"
  ) => {
    const value = Number(raw);
    if (raw === "" || Number.isNaN(value)) {
      return;
    }
    update({ [key]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="preference-ranking-distance">
            Ranking distance (m)
          </Label>
          <Input
            id="preference-ranking-distance"
            min="1"
            onBlur={(event) =>
              commitNumber(event.target.value, "rankingDistance")
            }
            type="number"
            value={rankingDistance}
            onChange={(event) => setRankingDistance(event.target.value)}
          />
          <p className="text-muted-foreground text-sm">
            The distance the dashboard ranking compares scores at.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="preference-week-start">Week starts on</Label>
          <Select
            onValueChange={(value) => {
              const day = WEEK_STARTS.find(
                (option) => String(option.value) === value
              )?.value;
              if (day !== undefined) {
                update({ weekStartsOn: day });
              }
            }}
            value={String(preferences.weekStartsOn)}
          >
            <SelectTrigger id="preference-week-start">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEK_STARTS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-sm">
            Used to bucket sessions into report weeks.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="preference-backup-count">Backups to keep</Label>
          <Input
            id="preference-backup-count"
            max="30"
            min="1"
            onBlur={(event) => commitNumber(event.target.value, "backupCount")}
            type="number"
            value={backupCount}
            onChange={(event) => setBackupCount(event.target.value)}
          />
          <p className="text-muted-foreground text-sm">
            Rolling database copies kept on this device.
          </p>
        </div>
        <p
          aria-live="polite"
          className="text-muted-foreground self-end text-sm"
        >
          {updating ? "Saving…" : " "}
        </p>
      </CardContent>
    </Card>
  );
};
