// Prototype categories. Ids are stored in prototypes.tags and must match the
// check constraint in supabase/migrations/20261002120000_prototype_tags.sql.
export const prototypeTags = [
  { id: "fun", emoji: "🎉", label: "Just for fun", hint: "Side projects, experiments, play" },
  { id: "exploratory", emoji: "🧭", label: "Exploratory", hint: "An early idea or a direction being tried" },
  { id: "concept", emoji: "💡", label: "Concept", hint: "A vision, pitch or big-picture what-if" },
  { id: "working", emoji: "🛠️", label: "Working", hint: "Actively being built with a team" },
  { id: "review", emoji: "👀", label: "Ready for review", hint: "Looking for feedback before it goes further" },
  { id: "committed", emoji: "✅", label: "Committed", hint: "Agreed with development, or a handoff" },
  { id: "tool", emoji: "🧰", label: "Tool", hint: "An internal tool or utility" },
] as const;

export type PrototypeTagId = (typeof prototypeTags)[number]["id"];

const byId = new Map<string, (typeof prototypeTags)[number]>(prototypeTags.map((tag) => [tag.id, tag]));

export function tagInfo(id: string) {
  return byId.get(id) ?? null;
}
