import * as React from "react";

import { cn } from "@/lib/utils";

// Console inputs are 44px tall with a carbon.3 border and the marine.2 focus ring.
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input type={type} className={cn("flex h-11 w-full rounded-lg border border-carbon-3 bg-abyss-0 px-3 text-sm text-abyss-9 transition-shadow file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-abyss-5 focus-visible:border-marine-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marine-2 disabled:cursor-not-allowed disabled:opacity-50", className)} ref={ref} {...props} />
  ),
);
Input.displayName = "Input";

export { Input };
