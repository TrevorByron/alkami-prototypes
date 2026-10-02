import type * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ExternalLink, X } from "lucide-react";

import { UserAvatar } from "@/components/UserIdentity";
import { displayName } from "@/lib/names";

// Full-screen image viewer: a dark scrim, a toolbar pinned to the top of the
// viewport (who posted it on the left, actions and close on the right), and
// the image centred below. Esc, the close button, or a click anywhere off the
// image dismisses it.
export function ImageLightbox({ src, alt, authorId, authorName, meta, children }: { src: string; alt: string; authorId?: string | null; authorName: string; meta?: React.ReactNode; children: React.ReactNode }) {
  const toolbarButton = "flex h-10 w-10 items-center justify-center rounded-lg text-abyss-0 transition-colors hover:bg-abyss-0/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marine-2";

  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{children}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-abyss-9/90 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col outline-none" aria-describedby={undefined}>
          <div className="flex h-16 shrink-0 items-center justify-between gap-4 px-6">
            <div className="flex min-w-0 items-center gap-2">
              <UserAvatar id={authorId} name={authorName} />
              <div className="min-w-0">
                <DialogPrimitive.Title className="truncate text-sm font-medium text-abyss-0">{displayName(authorName)}</DialogPrimitive.Title>
                {meta ? <p className="truncate text-xs text-carbon-4">{meta}</p> : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {/* Browsers refuse to open data: URLs (demo-mode attachments) in a new tab. */}
              {src.startsWith("data:") ? null : <a href={src} target="_blank" rel="noopener noreferrer" className={toolbarButton} aria-label="Open original in a new tab" title="Open original"><ExternalLink className="h-5 w-5" /></a>}
              <DialogPrimitive.Close className={toolbarButton} aria-label="Close" title="Close (Esc)"><X className="h-5 w-5" /></DialogPrimitive.Close>
            </div>
          </div>
          <DialogPrimitive.Close asChild>
            <div className="flex min-h-0 flex-1 cursor-zoom-out items-center justify-center px-6 pb-10" aria-hidden>
              <img src={src} alt={alt} className="max-h-full max-w-full cursor-default rounded-lg object-contain shadow-thermo" onClick={(event) => event.stopPropagation()} />
            </div>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
