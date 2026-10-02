import { supabase } from "@/lib/supabase";

export const snapshotBucket = "comment-snapshots";

export async function uploadCommentSnapshot(blob: Blob, userId: string, prototypeId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const contentType = blob.type || "image/jpeg";
  const extension = contentType.split("/")[1]?.replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${prototypeId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(snapshotBucket).upload(path, blob, { contentType, upsert: false });
  if (error) {
    if (error.message.toLowerCase().includes("bucket not found")) {
      throw new Error("Image attachments are not configured yet. Apply the comment-snapshots Supabase migration, then try again.");
    }
    throw new Error(error.message);
  }
  return path;
}

export async function resolveCommentSnapshotUrl(value: string) {
  if (value.startsWith("data:") || /^https?:\/\//i.test(value)) return value;
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(snapshotBucket).createSignedUrl(value, 60 * 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
