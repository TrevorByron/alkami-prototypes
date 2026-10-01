// The Alkami mark, used wherever the app shows its own logo.
export function AppMark({ className = "h-8 w-8" }: { className?: string }) {
  return <img src="/favicon.png" alt="" className={`${className} shrink-0 rounded-lg border border-carbon-3`} />;
}
