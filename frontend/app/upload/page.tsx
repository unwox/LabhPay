"use client";

/**
 * The old standalone upload page is now redundant — uploading happens in an
 * in-place modal on the dashboard. Any hit to /upload (old links, bookmarks)
 * funnels into the dashboard with the upload modal already open.
 */

import * as React from "react";
import { useRouter } from "next/navigation";

export default function UploadRedirect() {
  const router = useRouter();
  React.useEffect(() => {
    router.replace("/dashboard?upload=1");
  }, [router]);

  return (
    <main className="min-h-screen grid place-items-center bg-ivory-fade">
      <p className="text-ink-muted text-sm">Opening upload…</p>
    </main>
  );
}
