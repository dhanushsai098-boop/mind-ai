import { Sparkles } from "lucide-react";

export function ComingSoon({ title, phase, description }: { title: string; phase: string; description: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ai/10">
        <Sparkles className="h-5 w-5 text-ai" />
      </div>
      <h1 className="mt-4 text-lg font-semibold">{title}</h1>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      <span className="mt-4 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{phase}</span>
    </div>
  );
}
