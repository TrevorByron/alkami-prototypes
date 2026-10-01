export function initials(name: string) {
  return displayName(name).split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

// Email sign-ins get "trevor.borden" (or the full address) as their name;
// show it the way a person would write it: "Trevor Borden".
export function displayName(name: string) {
  const local = name.split("@")[0];
  if (/\s/.test(local)) return local;
  return local.split(/[._-]+/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ") || name;
}
