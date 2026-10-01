import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";

import { AuthProvider } from "./auth/AuthProvider";
import App from "./App";
import { isFramed } from "./lib/selfEmbed";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  isFramed ? (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-sm text-muted-foreground">
      Alkami Prototypes can't be previewed inside itself.
    </main>
  ) : (
  <StrictMode>
    <AuthProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </AuthProvider>
  </StrictMode>
  ),
);
