"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatDate } from "@/lib/format";

import { scheduledEvents, undatedEvents } from "../training-plan-calculations";
import { priorityLabel } from "../training-plan-types";
import type {
  SeasonTrainingPlan,
  TrainingPlanEvent,
} from "../training-plan-types";

const eventDates = (event: TrainingPlanEvent) => {
  if (event.dateStatus === "tbd" || !event.startsOn) {
    return "Dates to be decided";
  }
  return event.endsOn && event.endsOn !== event.startsOn
    ? `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`
    : formatDate(event.startsOn);
};

const EventList = ({
  events,
  idPrefix,
}: {
  events: TrainingPlanEvent[];
  idPrefix: string;
}) => (
  <Accordion>
    {events.map((event) => (
      <AccordionItem key={event.id} value={`${idPrefix}-${event.id}`}>
        <AccordionTrigger>
          <span className="flex flex-col gap-1 text-left">
            <span className="font-medium">{event.name}</span>
            <span className="text-muted-foreground text-xs font-normal">
              {eventDates(event)}
              {event.location ? ` · ${event.location}` : ""}
            </span>
          </span>
          <Badge
            variant={event.priority === "primary" ? "default" : "secondary"}
          >
            {priorityLabel[event.priority]}
          </Badge>
        </AccordionTrigger>
        <AccordionContent>
          <p className="whitespace-pre-wrap">
            {event.notes || "No notes recorded for this event."}
          </p>
        </AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

export const TrainingPlanEvents = ({ plan }: { plan: SeasonTrainingPlan }) => {
  const scheduled = scheduledEvents(plan);
  const undated = undatedEvents(plan);

  if (plan.events.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>No events recorded</EmptyTitle>
          <EmptyDescription>
            Add competitions to this plan to track the season calendar.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Scheduled ({scheduled.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {scheduled.length ? (
            <EventList events={scheduled} idPrefix="scheduled" />
          ) : (
            <p className="text-muted-foreground text-sm">
              No events have confirmed dates yet.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>To be decided ({undated.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {undated.length ? (
            <EventList events={undated} idPrefix="tbd" />
          ) : (
            <p className="text-muted-foreground text-sm">
              Every event on this plan has confirmed dates.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
