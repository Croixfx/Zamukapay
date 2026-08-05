import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { checkAuth, ensureSession } from "@/lib/auth";

/** Gate for routes that require a signed-in user.
 *
 * The access token only ever lives in memory (never localStorage), so a hard
 * page reload loses it — this tries to silently recover it from the
 * httpOnly refresh cookie before giving up and sending the user to /login.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ok">(checkAuth() ? "ok" : "checking");

  useEffect(() => {
    if (checkAuth()) {
      setStatus("ok");
      return;
    }
    ensureSession()
      .then(() => setStatus("ok"))
      .catch(() => navigate({ to: "/login" }));
  }, [navigate]);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
