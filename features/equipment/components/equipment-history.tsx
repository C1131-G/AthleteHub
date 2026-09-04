"use client";

import { CalendarDotsIcon, CheckCircleIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { ArchiveAction } from "@/components/archive-action";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate } from "@/lib/format";

import {
  equipmentSetupEditHref,
  equipmentSetupHref,
} from "../equipment-routes";
import type { EquipmentSetup } from "../equipment-types";
import { setupLabel } from "../equipment-utils";
import { useEquipment } from "../use-equipment";

export const EquipmentHistory = ({
  archived,
  athleteId,
  setups,
}: {
  archived?: boolean;
  athleteId: string;
  setups: EquipmentSetup[];
}) => {
  const { archiveSetup, restoreSetup } = useEquipment();
  if (setups.length === 0) {
    return (
      <Empty className="min-h-72 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarDotsIcon />
          </EmptyMedia>
          <EmptyTitle>
            {archived ? "Nothing archived" : "No setup history"}
          </EmptyTitle>
          <EmptyDescription>
            {archived
              ? "Archived setups are kept here and can be restored."
              : "Equipment snapshots will appear here after the first setup is saved."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <ScrollArea className="h-[min(34rem,calc(100dvh-20rem))] pr-3">
      <div className="space-y-3">
        {setups.map((setup, index) => (
          <Item key={setup.id} variant="outline">
            <ItemMedia variant="icon">
              <CheckCircleIcon className="text-primary" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{setupLabel(setup, index)}</ItemTitle>
              <ItemDescription>
                {formatDate(setup.recordedAt)} ·{" "}
                {setup.items.filter((item) => item.value).length} recorded items
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Link
                className={buttonVariants({ size: "sm", variant: "ghost" })}
                href={equipmentSetupHref(athleteId, setup.id)}
              >
                Preview
              </Link>
              <Link
                className={buttonVariants({ size: "sm", variant: "outline" })}
                href={equipmentSetupEditHref(athleteId, setup.id)}
              >
                Edit
              </Link>
              {archived ? (
                <Button
                  onClick={() => restoreSetup(setup.id)}
                  size="sm"
                  variant="outline"
                >
                  Restore
                </Button>
              ) : (
                <ArchiveAction
                  label={setupLabel(setup, index)}
                  onArchive={() => archiveSetup(setup.id)}
                />
              )}
            </ItemActions>
          </Item>
        ))}
      </div>
    </ScrollArea>
  );
};
