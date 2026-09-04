"use client";

import { ArrowRightIcon, PlusIcon, WrenchIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { ArchivedToggle } from "@/components/archived-toggle";
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
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { categoryLabel, statusLabel } from "@/features/athlete/athlete-labels";
import { useAthletes } from "@/features/athlete/use-athletes";
import { initials } from "@/lib/format";

import {
  athleteHref,
  equipmentHref,
  equipmentNewHref,
} from "../equipment-routes";
import type { EquipmentSetup } from "../equipment-types";
import { findAthlete } from "../equipment-utils";
import { useEquipment } from "../use-equipment";
import { EquipmentComparison } from "./equipment-comparison";
import { EquipmentHistory } from "./equipment-history";
import { EquipmentSkeleton } from "./equipment-skeleton";

export const EquipmentWorkspace = () => {
  const [showArchived, setShowArchived] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { athletes, ready: athletesReady } = useAthletes();
  const { listByAthlete, ready: equipmentReady } = useEquipment(
    showArchived ? { archivedOnly: true } : undefined
  );
  const selectedAthleteId = searchParams.get("athleteId") ?? "";
  const athlete = findAthlete(athletes, selectedAthleteId);
  const setups = useMemo(
    () => (athlete ? listByAthlete(athlete.id) : []),
    [athlete, listByAthlete]
  );
  const current: EquipmentSetup | undefined = setups[0];
  const previous: EquipmentSetup | undefined = setups[1];

  const selectAthlete = (athleteId: string | null) => {
    router.replace(equipmentHref(athleteId ?? undefined));
  };

  if (!athletesReady || !equipmentReady) {
    return <EquipmentSkeleton />;
  }

  return (
    <section className="space-y-6" aria-labelledby="equipment-title">
      <Card>
        <CardHeader>
          <CardTitle>Select athlete</CardTitle>
          <CardDescription>
            Search by athlete name or athlete ID.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Combobox
            items={athletes}
            value={athlete ?? null}
            onValueChange={(value) => selectAthlete(value?.id ?? null)}
            itemToStringLabel={(item) => item?.fullName ?? ""}
            itemToStringValue={(item) =>
              item ? `${item.fullName} ${item.athleteId}` : ""
            }
          >
            <ComboboxInput
              aria-label="Select athlete"
              placeholder="Search athletes…"
              showClear
            />
            <ComboboxContent>
              <ComboboxEmpty>No athletes found.</ComboboxEmpty>
              <ComboboxList>
                {(item) => (
                  <ComboboxItem key={item.id} value={item}>
                    <span className="flex flex-col text-left">
                      <span className="font-medium">{item.fullName}</span>
                      <span className="text-muted-foreground text-xs">
                        {item.athleteId}
                      </span>
                    </span>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </CardContent>
      </Card>

      {athlete ? (
        <>
          <Card>
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="size-14">
                  <AvatarImage src={athlete.photoUrl} alt="" />
                  <AvatarFallback>{initials(athlete.fullName)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold">{athlete.fullName}</h2>
                  <p className="text-muted-foreground text-sm">
                    {athlete.athleteId}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge>{categoryLabel[athlete.category]}</Badge>
                    <Badge variant="secondary">
                      {statusLabel[athlete.status]}
                    </Badge>
                  </div>
                </div>
              </div>
              <Link
                className={buttonVariants({ variant: "outline" })}
                href={athleteHref(athlete.id)}
              >
                View profile <ArrowRightIcon />
              </Link>
            </CardContent>
          </Card>

          <Tabs defaultValue="overview" className="gap-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TabsList aria-label="Equipment sections">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="history">
                  History ({setups.length})
                </TabsTrigger>
              </TabsList>
              <ArchivedToggle
                onChange={setShowArchived}
                showArchived={showArchived}
              />
            </div>
            <TabsContent value="overview">
              {current ? (
                <EquipmentComparison
                  athleteId={athlete.id}
                  current={current}
                  previous={previous}
                />
              ) : (
                <Empty className="min-h-72 border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <WrenchIcon />
                    </EmptyMedia>
                    <EmptyTitle>No equipment recorded</EmptyTitle>
                    <EmptyDescription>
                      Add the athlete’s first equipment setup to begin tracking
                      changes.
                    </EmptyDescription>
                    <Link
                      className={buttonVariants()}
                      href={equipmentNewHref(athlete.id)}
                    >
                      <PlusIcon /> Add setup
                    </Link>
                  </EmptyHeader>
                </Empty>
              )}
            </TabsContent>
            <TabsContent value="history">
              <EquipmentHistory
                archived={showArchived}
                athleteId={athlete.id}
                setups={setups}
              />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Empty className="min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WrenchIcon />
            </EmptyMedia>
            <EmptyTitle>Choose an athlete</EmptyTitle>
            <EmptyDescription>
              Select an athlete above to view equipment details and history.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
};
