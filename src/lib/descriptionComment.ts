import type { CommentRecord, PrototypeSummary } from "@/lib/types";

// A prototype's description is posted as the builder's first comment, and the
// viewer pins it to the top of the thread. There is no flag for it in the
// database: it is the earliest comment by the builder whose text is the
// description.
export function findDescriptionComment(comments: CommentRecord[], prototype: Pick<PrototypeSummary, "description" | "owner_id" | "created_by">) {
  const description = prototype.description?.trim();
  if (!description) return null;
  const builders = [prototype.owner_id, prototype.created_by].filter(Boolean);
  return [...comments]
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .find((comment) => builders.includes(comment.author_id) && comment.body.trim() === description) ?? null;
}
