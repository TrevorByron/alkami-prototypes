import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => <textarea className={cn("flex min-h-20 w-full resize-y rounded-lg border border-carbon-3 bg-abyss-0 px-3 py-3 text-sm text-abyss-9 outline-none transition-shadow placeholder:text-abyss-5 focus-visible:border-marine-2 focus-visible:ring-4 focus-visible:ring-marine-2 disabled:cursor-not-allowed disabled:opacity-50", className)} ref={ref} {...props} />);
Textarea.displayName = "Textarea";

export { Textarea };
