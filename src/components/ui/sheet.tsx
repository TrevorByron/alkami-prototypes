import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(({ className, ...props }, ref) => <DialogPrimitive.Overlay className={cn("fixed inset-0 z-50 bg-abyss-9/40 data-[state=open]:animate-in data-[state=closed]:animate-out", className)} {...props} ref={ref} />);
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const SheetContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: "left" | "right"; overlay?: boolean }>(({ side = "right", overlay = true, className, children, ...props }, ref) => <SheetPortal>{overlay ? <SheetOverlay /> : null}<DialogPrimitive.Content ref={ref} className={cn("fixed inset-y-0 z-50 flex w-[min(100%,27rem)] flex-col border-carbon-3 bg-abyss-0 shadow-thermo outline-none", side === "right" ? "right-0 border-l" : "left-0 border-r", className)} {...props}>{children}<SheetClose className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-abyss-7 transition-colors hover:bg-carbon-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marine-2"><X className="h-5 w-5" /><span className="sr-only">Close</span></SheetClose></DialogPrimitive.Content></SheetPortal>);
SheetContent.displayName = DialogPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("flex flex-col space-y-1.5 text-left", className)} {...props} />;
const SheetTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={cn("text-xl font-medium leading-6 text-abyss-9", className)} {...props} />);
SheetTitle.displayName = DialogPrimitive.Title.displayName;
const SheetDescription = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Description>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(({ className, ...props }, ref) => <DialogPrimitive.Description ref={ref} className={cn("text-sm text-abyss-5", className)} {...props} />);
SheetDescription.displayName = DialogPrimitive.Description.displayName;

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription };
