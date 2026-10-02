"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Topbar } from "@/components/topbar";
import { ComingSoon } from "@/components/coming-soon";

function SearchInner() {
  const params = useSearchParams();
  const q = params.get("q");
  return (
    <ComingSoon
      title={q ? `Searching for “${q}”` : "AI Semantic Search"}
      phase="Phase 4"
      description="Search by meaning across file content, metadata, and embeddings — not just filenames. Arrives once embeddings + pgvector indexing are wired up in Phase 3."
    />
  );
}

export default function SearchPage() {
  return (
    <>
      <Topbar />
      <Suspense fallback={null}>
        <SearchInner />
      </Suspense>
    </>
  );
}
