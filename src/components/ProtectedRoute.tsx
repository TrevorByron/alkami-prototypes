import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { AuthLoading } from "@/components/AuthLoading";
import { useAuth } from "@/auth/AuthProvider";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") return <AuthLoading />;
  if (status !== "signed_in") return <Navigate to="/signin" replace />;
  return children;
}
