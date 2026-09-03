"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { resolveAthleteBackTarget } from "../athlete-navigation";

export const AthleteBackLink = () => {
  const backTarget = resolveAthleteBackTarget(usePathname());

  if (!backTarget) {
    return null;
  }

  return (
    <>
      <Separator
        orientation="vertical"
        className="h-4 data-vertical:self-center"
      />
      <Link
        className={buttonVariants({ size: "sm", variant: "ghost" })}
        // SAFETY: resolveAthleteBackTarget only returns validated internal route shapes.
        href={backTarget.href}
        transitionTypes={["nav-back"]}
      >
        <ArrowLeftIcon />
        {backTarget.label}
      </Link>
    </>
  );
};
