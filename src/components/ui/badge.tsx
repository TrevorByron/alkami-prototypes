/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Same look as ConsoleBadge (x-darwin UI/badge, small size); these variant
// names are kept so existing call sites map onto Console colour modes.
const badgeVariants = cva("inline-flex min-h-5 items-center gap-1 whitespace-nowrap rounded px-2 text-xs leading-4 [&_svg]:h-3.5 [&_svg]:w-3.5", {
  variants: {
    variant: {
      default: "bg-marine-0 text-marine-5",
      secondary: "bg-carbon-1 text-abyss-7",
      outline: "bg-carbon-1 text-abyss-7",
      muted: "bg-carbon-1 text-abyss-7",
      success: "bg-tiaga-0 text-tiaga-9",
      warning: "bg-desert-0 text-desert-9",
      danger: "bg-chaparral-0 text-chaparral-8",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
