import { cn } from "@/lib/utils";

// The Alkami "A", redrawn as pixel art on a 16-pixel grid: the gold left
// stroke catches the light (h), the right leg sits a shade back (d), and the
// crossbar crosses in front of it and sweeps up and out past it, the way the
// real mark's blade does.
// public/favicon.svg is drawn from the same grid.
const PIXELS = [
  "................",
  ".......hh.......",
  "......hhod......",
  "......ho.dd.....",
  ".....hho.dd.....",
  ".....ho...dd....",
  "....hho...dd....",
  "....ho.....dd...",
  "...hho.....dd...",
  "...ho......dd.hh",
  "..hho....hhhooo.",
  "..hoohhhhoook...",
  "..hooook...dd...",
  ".hook.......dd..",
  ".hk.........dd..",
  "................",
];

// Not Console: the Alkami brand gold, in four steps.
const COLORS: Record<string, string> = { h: "#f8cc60", o: "#f2b948", d: "#d6942c", k: "#b0701c" };

const rects = PIXELS.flatMap((row, y) => [...row].flatMap((cell, x) => (COLORS[cell] ? [{ x, y, fill: COLORS[cell] }] : [])));

export function AppMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span className={cn("pixel-notch flex shrink-0 items-center justify-center bg-carbon-2 p-0.5", className)}>
      <svg viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden className="pixel-notch h-full w-full bg-abyss-0">
        {rects.map(({ x, y, fill }) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill} />)}
      </svg>
    </span>
  );
}
