import { Sparkle } from "lucide-react";

// Identifies a Claude artifact without using Anthropic's logo: a warm desert
// tile with a spark, matching the Claude preview on library cards.
export function ClaudeMark({ className = "h-10 w-10" }: { className?: string }) {
  return <span className={`${className} flex shrink-0 items-center justify-center rounded-lg border border-desert-2 bg-desert-0 text-desert-8`} aria-hidden><Sparkle className="h-5 w-5 fill-current" /></span>;
}
