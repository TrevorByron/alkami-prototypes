import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";

import { cn } from "@/lib/utils";

// A flex track so items sit centred with even padding on every side; without
// it the inline items sit on the text baseline and leave a gap underneath.
const ToggleGroup = React.forwardRef<React.ElementRef<typeof ToggleGroupPrimitive.Root>, React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>>(({ className, ...props }, ref) => <ToggleGroupPrimitive.Root ref={ref} className={cn("inline-flex items-center gap-0.5", className)} {...props} />);
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;
const ToggleGroupItem = React.forwardRef<React.ElementRef<typeof ToggleGroupPrimitive.Item>, React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>>(({ className, ...props }, ref) => <ToggleGroupPrimitive.Item ref={ref} className={cn("inline-flex h-6 items-center justify-center gap-1 rounded px-2 text-xs font-medium text-abyss-7 transition-colors hover:text-abyss-9 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marine-2 data-[state=on]:bg-abyss-0 data-[state=on]:text-abyss-9 data-[state=on]:shadow-tropo [&_svg]:h-4 [&_svg]:w-4", className)} {...props} />);
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
