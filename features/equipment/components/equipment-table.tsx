"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { EquipmentSetup } from "../equipment-types";
import { previousItem, standardRows } from "../equipment-utils";

/** The current-vs-previous-vs-requirement grid, shared by workspace and preview. */
export const EquipmentTable = ({
  caption,
  previous,
  setup,
}: {
  caption: string;
  previous: EquipmentSetup | undefined;
  setup: EquipmentSetup;
}) => (
  <ScrollArea className="w-full whitespace-nowrap">
    <Table>
      <TableCaption className="caption-bottom px-6 py-4 text-left">
        {caption}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Equipment</TableHead>
          <TableHead scope="col">Current</TableHead>
          <TableHead scope="col">Previous</TableHead>
          <TableHead scope="col">Requirement</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {standardRows(setup.items).map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.label}</TableCell>
            <TableCell>{item.value || "Not recorded"}</TableCell>
            <TableCell>
              {previousItem(previous, item)?.value || "Not recorded"}
            </TableCell>
            <TableCell>{item.requirement || "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </ScrollArea>
);
