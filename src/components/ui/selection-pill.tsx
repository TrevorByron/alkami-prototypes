import * as React from "react";

import { cn } from "@/lib/utils";

// x-darwin UI/selection-pill: 32px, caption text, white with a carbon.5
// border; selected turns marine.0 / marine.5. Pixel treatment: square corners
// instead of fully rounded, and the selected pill sits on a hard shadow.
export const SelectionPill = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }>(
  ({ className, selected = false, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-8 items-center gap-1 whitespace-nowrap rounded border px-3 text-xs outline-none transition-colors duration-200 ease-out focus-visible:border-marine-2 focus-visible:ring-4 focus-visible:ring-marine-2 disabled:cursor-not-allowed disabled:opacity-40",
        selected ? "border-marine-5 bg-marine-0 text-marine-5 shadow-[2px_2px_0_0_hsl(var(--color-marine-2))] hover:bg-marine-1" : "border-carbon-5 bg-abyss-0 text-abyss-9 hover:bg-carbon-1",
        className,
      )}
      {...props}
    />
  ),
);
SelectionPill.displayName = "SelectionPill";
