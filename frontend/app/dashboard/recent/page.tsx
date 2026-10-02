"use client";

import { Topbar } from "@/components/topbar";
import { FileBrowser } from "@/components/file-browser";

export default function RecentPage() {
  return (
    <>
      <Topbar />
      <FileBrowser view="recent" />
    </>
  );
}
