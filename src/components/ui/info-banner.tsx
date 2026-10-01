import type * as React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

// Console's UI/info-banner `type` variants, on the same .0 fill / dark text
// pairs as its Badge colour modes.
const types = {
  default: { className: "border-marine-1 bg-marine-0 text-marine-8", icon: Info, iconClass: "text-marine-5" },
  success: { className: "border-tiaga-2 bg-tiaga-0 text-tiaga-9", icon: CheckCircle2, iconClass: "text-tiaga-6" },
  warning: { className: "border-desert-3 bg-desert-0 text-desert-9", icon: AlertTriangle, iconClass: "text-desert-5" },
  danger: { className: "border-chaparral-2 bg-chaparral-0 text-chaparral-8", icon: XCircle, iconClass: "text-chaparral-5" },
  grayscale: { className: "border-carbon-3 bg-carbon-0 text-abyss-7", icon: Info, iconClass: "text-abyss-5" },
};

export function InfoBanner({ type = "default", title, children, className, action }: { type?: keyof typeof types; title?: React.ReactNode; children?: React.ReactNode; className?: string; action?: React.ReactNode }) {
  const { className: tone, icon: Icon, iconClass } = types[type];
  return (
    <div role={type === "danger" ? "alert" : "status"} className={cn("flex items-start gap-2 rounded-lg border px-4 py-3 text-sm", tone, className)}>
      <Icon className={cn("mt-px h-5 w-5 shrink-0", iconClass)} />
      <div className="min-w-0 flex-1">{title ? <p className="font-medium">{title}</p> : null}{children ? <div className={title ? "mt-0.5 text-xs" : undefined}>{children}</div> : null}</div>
      {action}
    </div>
  );
}
