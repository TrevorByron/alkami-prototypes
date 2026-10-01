import { displayName, initials } from "@/lib/names";
import { cn } from "@/lib/utils";

// Console's Avatar `user` theme pairs a .0 fill with .8 initials (tiaga.0 /
// tiaga.8). Each person gets one family, picked from a hash of their id so it
// stays the same on every screen and every visit. Classes are written out in
// full so Tailwind can see them.
const avatarColors = [
  "bg-marine-0 text-marine-8",
  "bg-tiaga-0 text-tiaga-8",
  "bg-alpine-0 text-alpine-8",
  "bg-desert-0 text-desert-8",
  "bg-chaparral-0 text-chaparral-8",
];

function avatarColor(key: string) {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return avatarColors[hash % avatarColors.length];
}

// default = 32px with bodyMedium text, large = 40px with section text.
const avatarSizes = {
  default: "h-8 w-8 text-sm",
  large: "h-10 w-10 text-base",
};

export function UserAvatar({ id, name, src, size = "default", className }: { id?: string | null; name: string; src?: string | null; size?: keyof typeof avatarSizes; className?: string }) {
  return (
    <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium", avatarColor(id || name), avatarSizes[size], className)} title={displayName(name)}>
      {src ? <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" /> : initials(name)}
    </span>
  );
}

export function UserIdentity({ id, name, email, src, meta, size = "default", className }: { id?: string | null; name: string; email?: string | null; src?: string | null; meta?: React.ReactNode; size?: keyof typeof avatarSizes; className?: string }) {
  const secondary = [email, meta].filter(Boolean);
  return (
    <div className={cn("flex min-w-0 items-center gap-2", size === "large" && "gap-4", className)}>
      <UserAvatar id={id} name={name} src={src} size={size} />
      <div className="min-w-0">
        <p className={cn("truncate font-medium text-abyss-9", size === "large" ? "text-base" : "text-sm")}>{displayName(name)}</p>
        {secondary.length ? <p className="flex min-w-0 items-center gap-1 truncate text-xs text-abyss-5">{secondary.map((item, index) => <span key={index} className="flex items-center gap-1">{index ? <span aria-hidden>·</span> : null}{item}</span>)}</p> : null}
      </div>
    </div>
  );
}
