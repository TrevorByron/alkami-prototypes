// Claude's mark, used to label links that open a Claude artifact on claude.ai.
export function ClaudeMark({ className = "h-10 w-10" }: { className?: string }) {
  return <img src="/claude-mark.png" alt="" className={`${className} shrink-0 rounded-lg`} />;
}
