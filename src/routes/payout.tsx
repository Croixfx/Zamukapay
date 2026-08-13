import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { confirmMomoPayout, formatRWF } from "@/lib/zamuka-data";

export const Route = createFileRoute("/payout")({
  validateSearch: (search: Record<string, unknown>) => ({ id: Number(search["id"]) }),
  head: () => ({
    meta: [
      { title: "MoMo Payout Confirmed — ZamukaPay" },
      {
        name: "description",
        content:
          "Your invoice advance has been sent to your MTN Mobile Money wallet. View the transaction receipt.",
      },
      { property: "og:title", content: "MoMo Payout Confirmed — ZamukaPay" },
      { property: "og:description", content: "Advance disbursed instantly to Mobile Money." },
    ],
  }),
  component: Payout,
});

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Payout() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const meQuery = useQuery({ queryKey: ["auth-me"], queryFn: getCurrentUser });

  const payoutMutation = useMutation({
    mutationFn: () => confirmMomoPayout(id),
  });

  // Guards against firing the mutation twice for one mount (e.g. React dev
  // double-invoke) — two concurrent payout requests for the same invoice
  // can otherwise race on the backend.
  const hasStarted = useRef(false);

  // Reached via a full page reload, which restores the session from the
  // browser-wide httpOnly refresh cookie — if a different account signed in
  // more recently in another tab, that reload silently picks up THAT
  // session. Wait for the real current user and don't fire as the wrong role.
  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      navigate({ to: "/invoice-new" });
      return;
    }
    if (meQuery.isLoading || hasStarted.current) return;
    if (meQuery.data && meQuery.data.role !== "SUPPLIER") return;
    hasStarted.current = true;
    payoutMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meQuery.isLoading, meQuery.data]);

  const wrongRole = !meQuery.isLoading && !!meQuery.data && meQuery.data.role !== "SUPPLIER";

  return (
    <ProtectedRoute>
      <AppShell role="Supplier" who={meQuery.data?.company_name ?? "…"}>
        <div className="mx-auto max-w-lg text-center rise-in">
          {wrongRole && (
            <div className="panel flex flex-col items-center gap-3 p-8">
              <AlertTriangle className="size-10 text-destructive" />
              <p className="text-sm text-destructive">
                You're currently signed in as {meQuery.data?.company_name} (
                {meQuery.data?.role.toLowerCase()}). Sign in as the supplier who owns this invoice
                to receive the payout.
              </p>
              <Button variant="outline" onClick={() => navigate({ to: "/login" })}>
                Go to sign in
              </Button>
            </div>
          )}

          {!wrongRole && (payoutMutation.isPending || payoutMutation.isIdle) && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Sending your advance via MoMo…</p>
            </div>
          )}

          {payoutMutation.isError && (
            <div className="panel flex flex-col items-center gap-3 p-8">
              <AlertTriangle className="size-10 text-destructive" />
              <p className="text-sm text-destructive">{getApiErrorMessage(payoutMutation.error)}</p>
              <Button variant="outline" onClick={() => payoutMutation.mutate()}>
                Try again
              </Button>
            </div>
          )}

          {payoutMutation.isSuccess && (
            <>
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-success/15">
                <CheckCircle2 className="size-11 text-success" />
              </div>
              <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Money sent 🎉</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatRWF(payoutMutation.data.amount_sent)} is on its way to your Mobile Money
                wallet. It usually lands in under 60 seconds.
              </p>

              <dl className="panel mt-6 divide-y divide-border/70 p-2 text-left">
                {[
                  {
                    label: "Phone number",
                    value: `${payoutMutation.data.phone_number} (MTN MoMo)`,
                  },
                  { label: "Amount sent", value: formatRWF(payoutMutation.data.amount_sent) },
                  { label: "Transaction ID", value: payoutMutation.data.transaction_id },
                  { label: "Timestamp", value: formatTimestamp(payoutMutation.data.timestamp) },
                  {
                    label: "Invoice",
                    value: `${payoutMutation.data.invoice_number} · ${payoutMutation.data.buyer}`,
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 px-4 py-3.5"
                  >
                    <dt className="text-sm text-muted-foreground">{row.label}</dt>
                    <dd className="text-right text-sm font-semibold">{row.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-11 flex-1 font-semibold">
                  <Link to="/supplier-dashboard">Back to dashboard</Link>
                </Button>
                <Button asChild variant="outline" className="h-11 flex-1 font-semibold">
                  <Link to="/invoice-new">Submit another invoice</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
