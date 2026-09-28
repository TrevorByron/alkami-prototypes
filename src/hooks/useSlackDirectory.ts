import { useCallback, useState } from "react";

import { supabase } from "@/lib/supabase";
import { isDemoMode } from "@/lib/demoMode";
import { demoDirectory } from "@/lib/demoStore";
import type { SlackDirectory } from "@/lib/types";

export function useSlackDirectory() {
  const [directory, setDirectory] = useState<SlackDirectory>({ users: [], channels: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isDemoMode) {
      setDirectory(demoDirectory);
      setError(null);
      setLoading(false);
      return;
    }
    if (!supabase) return;
    setLoading(true);
    const { data, error: functionError } = await supabase.functions.invoke<SlackDirectory>("slack-directory");
    if (functionError || !data) {
      setError(functionError?.message ?? "Slack directory is unavailable.");
      setLoading(false);
      return;
    }
    setDirectory(data);
    setError(null);
    setLoading(false);
  }, []);

  return { ...directory, loading, error, load };
}
