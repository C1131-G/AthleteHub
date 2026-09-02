"use client";

import { PencilSimpleIcon, UserFocusIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

import type { Athlete, AthleteStatus, BowCategory } from "../athlete-types";
import { useAthletes } from "./athlete-provider";

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
const statusLabel = {
  active: "Active",
  inactive: "Inactive",
  "medical-leave": "Medical leave",
} satisfies Record<AthleteStatus, string>;
const categoryLabel = {
  barebow: "Barebow",
  compound: "Compound",
  recurve: "Recurve",
} satisfies Record<BowCategory, string>;

export const AthleteProfile = ({ athleteId }: { athleteId: string }) => {
  const { athletes, ready } = useAthletes();
  if (!ready) {
    return <AthleteProfileSkeleton />;
  }
  const athlete = athletes.find((item) => item.id === athleteId);
  if (!athlete) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UserFocusIcon />
          </EmptyMedia>
          <EmptyTitle>Athlete not found</EmptyTitle>
          <EmptyDescription>
            The profile may have been removed or the link is incorrect.
          </EmptyDescription>
          <Link className={buttonVariants()} href="/athletes">
            Back to athletes
          </Link>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <article className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage src={athlete.photoUrl} alt="" />
            <AvatarFallback className="text-lg">
              {initials(athlete.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-balance">
              {athlete.fullName}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {athlete.athleteId}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>{categoryLabel[athlete.category]}</Badge>
              <Badge variant="secondary">{statusLabel[athlete.status]}</Badge>
            </div>
          </div>
        </div>
        <Link
          className={buttonVariants()}
          href={`/athletes/${athlete.id}/edit`}
        >
          <PencilSimpleIcon /> Edit profile
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileCard title="Identity">
          <DefinitionList
            items={[
              ["Athlete ID", athlete.athleteId],
              ["Date of birth", athlete.dateOfBirth],
              ["Category", categoryLabel[athlete.category]],
              ["Status", statusLabel[athlete.status]],
            ]}
          />
        </ProfileCard>
        <ProfileCard title="Measurements">
          <DefinitionList
            items={[
              ["Height", formatNumber(athlete.heightCm, "cm")],
              ["Weight", formatNumber(athlete.weightKg, "kg")],
              ["Arm span", formatNumber(athlete.armSpanCm, "cm")],
              ["BMI", bmi(athlete)],
            ]}
          />
        </ProfileCard>
        <ProfileCard title="Target">
          <DefinitionList
            items={[
              ["Distance", formatNumber(athlete.targetDistanceM, "m")],
              [
                "Target score",
                athlete.targetScore ? String(athlete.targetScore) : "Not set",
              ],
            ]}
          />
        </ProfileCard>
        <ProfileCard title="Equipment and technical focus">
          <div className="space-y-4">
            <div>
              <h3 className="text-muted-foreground text-sm">Equipment notes</h3>
              <p className="mt-1 whitespace-pre-wrap">
                {athlete.equipmentNotes || "No equipment notes."}
              </p>
            </div>
            <div>
              <h3 className="text-muted-foreground text-sm">Technical focus</h3>
              <p className="mt-1 whitespace-pre-wrap">
                {athlete.technicalFocus || "No technical focus recorded."}
              </p>
            </div>
          </div>
        </ProfileCard>
      </div>
    </article>
  );
};

const ProfileCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};
const DefinitionList = ({ items }: { items: [string, string][] }) => {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-muted-foreground text-sm">{label}</dt>
          <dd className="mt-1 font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
};
const formatNumber = (value: number | undefined, suffix: string) => {
  return value ? `${value} ${suffix}` : "Not set";
};
const bmi = (athlete: Athlete) => {
  if (!athlete.heightCm || !athlete.weightKg) {
    return "Not available";
  }
  return (athlete.weightKg / (athlete.heightCm / 100) ** 2).toFixed(1);
};
export const AthleteProfileSkeleton = () => {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-64" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
};
