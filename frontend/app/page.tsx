import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Brain, Search, Workflow, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-accent text-accent-foreground">
            <Brain className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">Mind AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Log in
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-20 pt-16 text-center">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Your files, understood — not just stored.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
          Mind AI is a cloud workspace that reads, summarizes, and answers questions about
          everything you upload — so finding and understanding a document takes seconds, not searches.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/signup">
            <Button size="lg">Create your workspace</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              I already have an account
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pb-24 sm:grid-cols-3">
        {[
          { icon: Sparkles, title: "Understands your files", body: "Every upload gets summarized, tagged, and indexed automatically." },
          { icon: Search, title: "Search by meaning", body: "\u201cReports about declining sales\u201d finds the right file, not just the right filename." },
          { icon: Workflow, title: "Automates the busywork", body: "Chain upload \u2192 analyze \u2192 report \u2192 save into a workflow that runs itself." },
        ].map((f) => (
          <div key={f.title} className="rounded-lg border border-border bg-surface p-5">
            <f.icon className="h-5 w-5 text-accent" />
            <h3 className="mt-3 text-sm font-medium">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
