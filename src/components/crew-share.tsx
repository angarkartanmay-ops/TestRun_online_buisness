"use client";

import { Check, Copy, ShareNetwork } from "@phosphor-icons/react";
import { useState } from "react";

/** The distribution loop: your link, a pre-written message, the native share sheet. */
export function CrewShare({ url, message }: { url: string; message: string }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${message} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked; the link stays selectable below */
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 bg-paper-2 border border-line px-3 py-2.5 min-w-0">
        <span className="label text-ink-3 shrink-0">Your link</span>
        <code className="font-mono text-sm truncate select-all">{url.replace(/^https?:\/\//, "")}</code>
      </div>
      <div className="flex flex-wrap gap-2">
        {canShare ? (
          <button
            type="button"
            className="btn btn-stamp btn-sm"
            onClick={() => navigator.share({ text: message, url }).catch(() => undefined)}
          >
            <ShareNetwork weight="bold" size={16} /> Send to the chat
          </button>
        ) : null}
        <button type="button" className={`btn btn-sm ${canShare ? "btn-ghost" : "btn-stamp"}`} onClick={copy} aria-live="polite">
          {copied ? <Check weight="bold" size={16} /> : <Copy weight="bold" size={16} />}
          {copied ? "Copied" : "Copy message + link"}
        </button>
      </div>
    </div>
  );
}
