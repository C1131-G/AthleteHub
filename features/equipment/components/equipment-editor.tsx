"use client";

import { WrenchIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import { equipmentHref } from "../equipment-routes";
import { useEquipment } from "../use-equipment";
import { EquipmentForm } from "./equipment-form";
import { EquipmentSkeleton } from "./equipment-skeleton";

export const EquipmentEditor = ({
  athleteId,
  setupId,
}: {
  athleteId: string;
  setupId: string;
}) => {
  const { getSetup, ready } = useEquipment();
  const setup = getSetup(setupId);

  if (!ready) {
    return <EquipmentSkeleton />;
  }

  if (!setup || setup.athleteId !== athleteId) {
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
          <Link className={buttonVariants()} href={equipmentHref(athleteId)}>
            Back to equipment
          </Link>
        </EmptyHeader>
      </Empty>
    );
  }
  return <EquipmentForm athleteId={athleteId} setup={setup} />;
};
