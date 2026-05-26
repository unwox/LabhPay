"use client";

import * as React from "react";
import { Upload, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPT = "application/pdf";

export function Dropzone({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);

  function handle(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).filter((f) => f.type === ACCEPT || f.name.toLowerCase().endsWith(".pdf"));
    if (arr.length) onFiles(arr);
  }

  return (
    <div
      className={cn(
        "relative rounded-3xl border border-dashed bg-paper-card transition-all",
        drag
          ? "border-accent bg-accent-mist"
          : "border-ink/15 hover:border-ink/25",
        disabled && "opacity-50 pointer-events-none"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handle(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        onChange={(e) => handle(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full px-8 py-16 md:py-20 text-center flex flex-col items-center gap-4"
      >
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-mist text-accent-ink">
          <Upload size={22} strokeWidth={1.75} />
        </span>
        <div className="space-y-2">
          <p className="font-display text-2xl md:text-3xl text-ink">
            Drop your statement here
          </p>
          <p className="text-ink-soft">
            PDF only. Up to 15 MB. Password-protected files are supported.
          </p>
        </div>
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-ink-muted">
          <FileText size={14} /> or click to browse
        </p>
      </button>
    </div>
  );
}
