"use client";

import Link from "next/link";

import { ArchiveAction } from "@/components/archive-action";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { initials } from "@/lib/format";

import { categoryLabel, statusLabel } from "../athlete-labels";
import type { Athlete } from "../athlete-types";
import { useAthletes } from "../use-athletes";

export const AthleteCard = ({ athlete }: { athlete: Athlete }) => (
  <li className="flex items-start gap-3 px-6 py-4">
    <Avatar>
      <AvatarImage src={athlete.photoUrl} alt="" />
      <AvatarFallback>{initials(athlete.fullName)}</AvatarFallback>
    </Avatar>
    <div className="min-w-0 flex-1">
      <Link
        className="font-medium hover:underline"
        href={`/athletes/${athlete.id}`}
      >
        {athlete.fullName}
      </Link>
      <p className="text-muted-foreground text-xs">{athlete.athleteId}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge variant={athlete.status === "active" ? "default" : "secondary"}>
          {statusLabel[athlete.status]}
        </Badge>
        <span className="text-muted-foreground text-xs">
          {categoryLabel[athlete.category]}
          {athlete.targetDistanceM ? ` · ${athlete.targetDistanceM} m` : ""}
        </span>
      </div>
    </div>
    <Link
      className={buttonVariants({ size: "sm", variant: "outline" })}
      href={`/athletes/${athlete.id}/edit`}
    >
      Edit
    </Link>
  </li>
);

export const AthleteRow = ({
  athlete,
  archived,
}: {
  archived?: boolean;
  athlete: Athlete;
}) => {
  const { archiveAthlete, restoreAthlete } = useAthletes();
  return (
    <TableRow>
      {/* The athlete names the row, so it is a header cell. */}
      <TableHead className="h-auto p-3 font-normal" scope="row">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={athlete.photoUrl} alt="" />
            <AvatarFallback>{initials(athlete.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <Link
              className="font-medium hover:underline"
              href={`/athletes/${athlete.id}`}
            >
              {athlete.fullName}
            </Link>
            <p className="text-muted-foreground text-xs">{athlete.athleteId}</p>
          </div>
        </div>
      </TableHead>
      <TableCell>{categoryLabel[athlete.category]}</TableCell>
      <TableCell>
        <Badge variant={athlete.status === "active" ? "default" : "secondary"}>
          {statusLabel[athlete.status]}
        </Badge>
      </TableCell>
      <TableCell>
        {athlete.targetDistanceM ? `${athlete.targetDistanceM} m` : "Not set"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Link
            className={buttonVariants({ size: "sm", variant: "ghost" })}
            href={`/athletes/${athlete.id}`}
          >
            View
          </Link>
          <Link
            className={buttonVariants({ size: "sm", variant: "outline" })}
            href={`/athletes/${athlete.id}/edit`}
          >
            Edit
          </Link>
          {archived ? (
            <Button
              onClick={() => restoreAthlete(athlete.id)}
              size="sm"
              variant="outline"
            >
              Restore
            </Button>
          ) : (
            <ArchiveAction
              label={athlete.fullName}
              onArchive={() => archiveAthlete(athlete.id)}
            />
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};
