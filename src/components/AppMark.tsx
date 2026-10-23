import { ALKAMI_A_COLORS, ALKAMI_A_PIXELS } from "@/lib/alkamiMark";
import { cn } from "@/lib/utils";

const rects = ALKAMI_A_PIXELS.flatMap((row, y) => [...row].flatMap((cell, x) => (ALKAMI_A_COLORS[cell] ? [{ x, y, fill: ALKAMI_A_COLORS[cell] }] : [])));

export function AppMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span className={cn("pixel-notch flex shrink-0 items-center justify-center bg-carbon-2 p-0.5", className)}>
      <svg viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden className="pixel-notch h-full w-full bg-abyss-0">
        {rects.map(({ x, y, fill }) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill} />)}
      </svg>
    </span>
  );
}
