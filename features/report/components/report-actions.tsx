"use client";

import {
  CheckIcon,
  DownloadSimpleIcon,
  PrinterIcon,
  ShareNetworkIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

interface ReportActionsProps {
  title: string;
  summary: string;
}

const encoded = (value: string) => encodeURIComponent(value);

export const ReportActions = ({ title, summary }: ReportActionsProps) => {
  const [message, setMessage] = useState<string>();
  const reportHtml = () =>
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>body{font:16px system-ui;max-width:900px;margin:40px auto;line-height:1.5}h1{font-size:28px} @media print{body{margin:0}}</style></head><body><h1>${title}</h1><p>${summary}</p></body></html>`;

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([reportHtml()], { type: "text/html" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}.html`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Report downloaded.");
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: summary, title });
        setMessage("Share dialog opened.");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setMessage("Sharing is unavailable. Use Download or Print instead.");
      }
      return;
    }
    setMessage("Device sharing is unavailable. Use Download or Print instead.");
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="Report actions"
    >
      <ButtonGroup>
        <Button onClick={() => window.print()} type="button" variant="outline">
          <PrinterIcon aria-hidden="true" /> Print
        </Button>
        <Button onClick={download} type="button" variant="outline">
          <DownloadSimpleIcon aria-hidden="true" /> Download report
        </Button>
        <Button onClick={share} type="button" variant="outline">
          <ShareNetworkIcon aria-hidden="true" /> Share
        </Button>
      </ButtonGroup>
      <a
        className="text-muted-foreground text-sm underline"
        href={`mailto:?subject=${encoded(title)}&body=${encoded(summary)}`}
      >
        Gmail / Outlook
      </a>
      <a
        className="text-muted-foreground text-sm underline"
        href={`https://wa.me/?text=${encoded(`${title}\n${summary}`)}`}
      >
        WhatsApp
      </a>
      <a
        className="text-muted-foreground text-sm underline"
        href={`https://t.me/share/url?url=&text=${encoded(`${title}\n${summary}`)}`}
      >
        Telegram
      </a>
      {message ? (
        <p
          aria-live="polite"
          className="text-muted-foreground flex items-center gap-1 text-sm"
        >
          <CheckIcon aria-hidden="true" />
          {message}
        </p>
      ) : null}
    </div>
  );
};
