/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Console's UI/button recipe: radius 8, 2px border (transparent unless the
// appearance draws one), captionMedium text, 4px gap, 20px icons, disabled at
// 50% opacity, and a marine.2 border + 4px marine.2 ring for focus. Pixel
// treatment: filled and bordered buttons sit on a hard 2px shadow and press
// down into it when clicked, like an arcade key.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-lg border-2 border-transparent font-medium transition-colors focus-visible:border-marine-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marine-2 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-marine-5 text-abyss-0 shadow-[2px_2px_0_0_hsl(var(--color-marine-8))] hover:bg-marine-6 active:bg-marine-7",
        outline: "border-carbon-3 bg-abyss-0 text-abyss-9 shadow-[2px_2px_0_0_hsl(var(--color-carbon-3))] hover:bg-carbon-0 active:bg-carbon-1",
        secondary: "border-carbon-3 bg-abyss-0 text-abyss-9 shadow-[2px_2px_0_0_hsl(var(--color-carbon-3))] hover:bg-carbon-0 active:bg-carbon-1",
        ghost: "bg-transparent text-abyss-9 hover:bg-carbon-2 active:translate-x-0 active:translate-y-0 active:bg-carbon-3",
        danger: "bg-chaparral-5 text-abyss-0 shadow-[2px_2px_0_0_hsl(var(--color-chaparral-8))] hover:bg-chaparral-6 active:bg-chaparral-7",
        dangerGhost: "border-chaparral-5 bg-abyss-0 text-chaparral-5 hover:bg-chaparral-0 active:bg-chaparral-1",
        success: "border-tiaga-6 bg-tiaga-0 text-tiaga-6 hover:bg-tiaga-1 active:bg-tiaga-2",
      },
      size: {
        default: "min-h-8 px-4 text-xs",
        sm: "min-h-8 px-4 text-xs",
        lg: "h-11 px-4 text-sm",
        icon: "h-8 w-8 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
