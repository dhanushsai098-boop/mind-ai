"use client";

import { Topbar } from "@/components/topbar";
import { ComingSoon } from "@/components/coming-soon";

export default function AgentsPage() {
  return (
    <>
      <Topbar />
      <ComingSoon
        title="AI Agents"
        phase="Phase 6"
        description="Create Research, Data Analyst, Document, and Report Generator agents — or build your own with custom instructions and a selected set of files."
      />
    </>
  );
}
