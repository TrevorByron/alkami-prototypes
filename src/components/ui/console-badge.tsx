import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

// Mirrors x-darwin's UI/badge: radius 4, no border, body text (caption when
// small), and the five Console colour modes.
const consoleBadgeVariants = cva("inline-flex items-center whitespace-nowrap rounded", {
  variants: {
    colorMode: {
      info: "bg-carbon-1 text-abyss-7",
      emphasis: "bg-marine-0 text-marine-5",
      success: "bg-tiaga-0 text-tiaga-9",
      warning: "bg-desert-0 text-desert-9",
      danger: "bg-chaparral-0 text-chaparral-8",
    },
    size: {
      default: "min-h-6 px-3 text-sm leading-5",
      small: "min-h-5 px-2 text-xs leading-4",
    },
  },
  defaultVariants: { colorMode: "info", size: "default" },
});

export type ConsoleBadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof consoleBadgeVariants>;

export function ConsoleBadge({ className, colorMode, size, ...props }: ConsoleBadgeProps) {
  return <span className={cn(consoleBadgeVariants({ colorMode, size }), className)} {...props} />;
}
