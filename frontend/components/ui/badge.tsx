import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "ai" | "muted" }) {
  const variants = {
    default: "bg-accent/10 text-accent",
    ai: "bg-ai/15 text-ai",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", variants[variant], className)}
      {...props}
    />
  );
}
