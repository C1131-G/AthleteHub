"use client";

import {
  ArrowLeftIcon,
  PencilSimpleIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { categoryLabel } from "@/features/athlete/athlete-labels";
import { useAthletes } from "@/features/athlete/use-athletes";
import { formatDate, initials } from "@/lib/format";

import { equipmentHref, equipmentSetupEditHref } from "../equipment-routes";
import { useEquipment } from "../use-equipment";
import { EquipmentSkeleton } from "./equipment-skeleton";
import { EquipmentTable } from "./equipment-table";

export const EquipmentPreview = ({
  athleteId,
  setupId,
}: {
  athleteId: string;
  setupId: string;
}) => {
  const { athletes, ready: athletesReady } = useAthletes();
  const { listByAthlete, ready: equipmentReady } = useEquipment();
  const athlete = athletes.find((item) => item.id === athleteId);
  const setups = listByAthlete(athleteId);
  const setupIndex = setups.findIndex((item) => item.id === setupId);
  const setup = setupIndex === -1 ? undefined : setups[setupIndex];
  const previous = setup ? setups[setupIndex + 1] : undefined;
  const isCurrent = setupIndex === 0;

  if (!athletesReady || !equipmentReady) {
    return <EquipmentSkeleton />;
  }

  if (!athlete || !setup) {
    return (
      <Empty className="min-h-72 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WrenchIcon />
          </EmptyMedia>
          <EmptyTitle>Equipment setup not found</EmptyTitle>
          <EmptyDescription>
            This setup may have been removed or the link is incorrect.
          </EmptyDescription>
          <Link className={buttonVariants()} href={equipmentHref()}>
            Back to equipment
          </Link>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <article className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarImage src={athlete.photoUrl} alt="" />
            <AvatarFallback>{initials(athlete.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {athlete.fullName}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {athlete.athleteId} · Setup recorded{" "}
              {formatDate(setup.recordedAt)}
            </p>
            <div className="mt-2 flex gap-2">
              <Badge>{isCurrent ? "Current setup" : "Previous setup"}</Badge>
              <Badge variant="secondary">
                {categoryLabel[athlete.category]}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            className={buttonVariants({ variant: "outline" })}
            href={equipmentHref(athlete.id)}
          >
            <ArrowLeftIcon /> Back to equipment
          </Link>
          <Link
            className={buttonVariants()}
            href={equipmentSetupEditHref(athlete.id, setup.id)}
          >
            <PencilSimpleIcon /> Edit
          </Link>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Equipment comparison</CardTitle>
          <CardDescription>
            {previous
              ? `Compared with setup recorded ${formatDate(previous.recordedAt)}.`
              : "No earlier setup is available for comparison."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <EquipmentTable
            caption={`Equipment values for ${athlete.fullName}.`}
            previous={previous}
            setup={setup}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Coach notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">
            {setup.coachNotes || "No coach notes recorded."}
          </p>
        </CardContent>
      </Card>
    </article>
  );
};
