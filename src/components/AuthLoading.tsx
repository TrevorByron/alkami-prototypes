import { AppMark } from "@/components/AppMark";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-carbon-0 p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <AppMark className="mx-auto h-12 w-12" />
        <Skeleton className="mx-auto h-7 w-48" />
        <Skeleton className="mx-auto h-4 w-64" />
      </div>
    </main>
  );
}
