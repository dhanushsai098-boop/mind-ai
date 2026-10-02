"use client";

import { Topbar } from "@/components/topbar";
import { ComingSoon } from "@/components/coming-soon";

export default function AutomationPage() {
  return (
    <>
      <Topbar />
      <ComingSoon
        title="AI Automation"
        phase="Phase 6"
        description="Chain steps like Upload → AI Analysis → Generate Report → Save to Cloud into a visual workflow that runs on its own."
      />
    </>
  );
}
