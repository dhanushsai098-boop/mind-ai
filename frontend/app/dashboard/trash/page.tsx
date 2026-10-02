"use client";

import { Topbar } from "@/components/topbar";
import { FileBrowser } from "@/components/file-browser";

export default function TrashPage() {
  return (
    <>
      <Topbar />
      <FileBrowser view="trash" />
    </>
  );
}
