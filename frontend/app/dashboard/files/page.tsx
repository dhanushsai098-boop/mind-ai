"use client";

import { Suspense } from "react";
import { Topbar } from "@/components/topbar";
import { FileBrowser } from "@/components/file-browser";

export default function FilesPage() {
  return (
    <>
      <Topbar />
      <Suspense fallback={null}>
        <FileBrowser view="files" />
      </Suspense>
    </>
  );
}
