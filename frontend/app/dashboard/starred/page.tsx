"use client";

import { Topbar } from "@/components/topbar";
import { FileBrowser } from "@/components/file-browser";

export default function StarredPage() {
  return (
    <>
      <Topbar />
      <FileBrowser view="starred" />
    </>
  );
}
