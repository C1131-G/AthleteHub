"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

import {
  equipmentSetupEditHref,
  equipmentSetupHref,
} from "../equipment-routes";
import type { EquipmentSetup } from "../equipment-types";
import { EquipmentTable } from "./equipment-table";

export const EquipmentComparison = ({
  athleteId,
  current,
  previous,
}: {
  athleteId: string;
  current: EquipmentSetup;
  previous: EquipmentSetup | undefined;
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">Current equipment</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Recorded {formatDate(current.recordedAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            className={buttonVariants({ size: "sm", variant: "outline" })}
            href={equipmentSetupHref(athleteId, current.id)}
          >
            Preview
          </Link>
          <Link
            className={buttonVariants({ size: "sm" })}
            href={equipmentSetupEditHref(athleteId, current.id)}
          >
            Edit
          </Link>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <EquipmentTable
            caption="Current equipment compared with the previous setup and coach requirements."
            previous={previous}
            setup={current}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Coach notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">
            {current.coachNotes || "No coach notes recorded."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
