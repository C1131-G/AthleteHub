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
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ReportActionsProps {
  content?: string;
  title: string;
  summary: string;
}

const encoded = (value: string) => encodeURIComponent(value);
const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

export const ReportActions = ({
  content = "",
  title,
  summary,
}: ReportActionsProps) => {
  const [message, setMessage] = useState<string>();
  const reportHtml = () =>
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font:16px system-ui;max-width:900px;margin:40px auto;line-height:1.5;white-space:pre-wrap}h1{font-size:28px}@media print{body{margin:0}}</style></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(summary)}</p><pre>${escapeHtml(content)}</pre></body></html>`;

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

  const downloadCsv = () => {
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("CSV downloaded.");
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

  const shareText = `${title}\n${summary}`;
  const gmailHref = `https://mail.google.com/mail/?view=cm&fs=1&su=${encoded(title)}&body=${encoded(summary)}`;
  const outlookHref = `https://outlook.office.com/mail/deeplink/compose?subject=${encoded(title)}&body=${encoded(summary)}`;
  const copySummary = async () => {
    await navigator.clipboard.writeText(shareText);
    setMessage("Summary copied.");
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
        <Button
          disabled={!content}
          onClick={downloadCsv}
          type="button"
          variant="outline"
        >
          Download CSV
        </Button>
        <Popover>
          <PopoverTrigger
            render={
              <Button type="button" variant="outline">
                <ShareNetworkIcon aria-hidden="true" /> Share
              </Button>
            }
          />
          <PopoverContent align="end">
            <PopoverHeader>
              <PopoverTitle>Share report</PopoverTitle>
              <PopoverDescription>
                Choose where to send or open this report.
              </PopoverDescription>
            </PopoverHeader>
            <div className="grid gap-2">
              <Button onClick={share} type="button" variant="outline">
                Device share
              </Button>
              <a
                className="border-input rounded-md border px-3 py-2 text-center text-sm"
                href={gmailHref}
                rel="noopener noreferrer"
                target="_blank"
              >
                Gmail
              </a>
              <a
                className="border-input rounded-md border px-3 py-2 text-center text-sm"
                href={outlookHref}
                rel="noopener noreferrer"
                target="_blank"
              >
                Outlook
              </a>
              <a
                className="border-input rounded-md border px-3 py-2 text-center text-sm"
                href={`https://wa.me/?text=${encoded(shareText)}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                WhatsApp
              </a>
              <a
                className="border-input rounded-md border px-3 py-2 text-center text-sm"
                href={`https://t.me/share/url?url=&text=${encoded(shareText)}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                Telegram
              </a>
              <Button onClick={copySummary} type="button" variant="ghost">
                Copy summary
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </ButtonGroup>
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
