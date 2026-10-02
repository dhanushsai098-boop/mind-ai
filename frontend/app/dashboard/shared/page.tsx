"use client";

import { Topbar } from "@/components/topbar";
import { FileBrowser } from "@/components/file-browser";

export default function SharedPage() {
  return (
    <>
      <Topbar />
      <FileBrowser view="shared" />
    </>
  );
}
