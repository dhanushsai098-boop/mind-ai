"use client";

import { Topbar } from "@/components/topbar";
import { ComingSoon } from "@/components/coming-soon";

export default function AssistantPage() {
  return (
    <>
      <Topbar />
      <ComingSoon
        title="AI Assistant + RAG"
        phase="Phase 3"
        description="Chat with your uploaded files, ask questions, compare documents, and get answers with cited sources. Built once file intelligence (extraction + embeddings) is wired up."
      />
    </>
  );
}
