import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Loader2, Smartphone } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { formatRWF, getInvoice, scoreInvoice, type RiskCheck } from "@/lib/zamuka-data";

export const Route = createFileRoute("/risk-score")({
  validateSearch: (search: Record<string, unknown>) => ({ id: Number(search["id"]) }),
  head: () => ({
    meta: [
      { title: "AI Risk Score — ZamukaPay" },
      {
        name: "description",
        content:
          "Live AI risk scoring of your invoice: buyer payment history, relationship age and verification.",
      },
      { property: "og:title", content: "AI Risk Score — ZamukaPay" },
      {
        property: "og:description",
        content: "See your advance offer, fee and MoMo payout in seconds.",
      },
    ],
  }),
  component: RiskScore,
});

// Shown while the real checks are still in flight — same 4 labels the API returns, no results yet.
const PENDING_CHECKS: RiskCheck[] = [
  { label: "Buyer payment history", result: "" },
  { label: "Relationship age", result: "" },
  { label: "Invoice vs average", result: "" },
  { label: "Buyer verification", result: "" },
];

const RECOMMENDATION_BADGE = {
  APPROVE: { label: "LOW RISK", className: "bg-success/15 text-success" },
  REVIEW: { label: "MEDIUM RISK", className: "bg-highlight/15 text-highlight" },
  DECLINE: { label: "HIGH RISK", className: "bg-destructive/15 text-destructive" },
} as const;

function RiskScore() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);

  const meQuery = useQuery({ queryKey: ["auth-me"], queryFn: getCurrentUser });
  const invoiceQuery = useQuery({ queryKey: ["invoice", id], queryFn: () => getInvoice(id) });

  const scoreMutation = useMutation({
    mutationFn: () => scoreInvoice(id),
  });

  // Guards against firing the mutation twice for one mount (e.g. React dev
  // double-invoke) — two concurrent scoring requests for the same invoice
  // can otherwise race on the backend.
  const hasStarted = useRef(false);

  // This page is reached via a full page reload (see the InvoiceRow comment
  // in supplier-dashboard.tsx), which restores the session from the
  // browser-wide httpOnly refresh cookie. If a different account was signed
  // into another tab more recently, that reload silently restores THAT
  // session instead — so wait for the real current user and only auto-fire
  // the scoring mutation once we know it's actually a supplier.
  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      navigate({ to: "/invoice-new" });
      return;
    }
    if (meQuery.isLoading || hasStarted.current) return;
    if (meQuery.data && meQuery.data.role !== "SUPPLIER") return;
    hasStarted.current = true;
    scoreMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meQuery.isLoading, meQuery.data]);

  const result = scoreMutation.data;
  const checks = result?.checks ?? PENDING_CHECKS;

  // Stagger the reveal of each check row — but only once we actually have a result to show.
  useEffect(() => {
    if (!result) return;
    const timers = checks.map((_, i) => setTimeout(() => setStep(i + 1), 700 * (i + 1)));
    const done = setTimeout(() => setStep(checks.length + 1), 700 * (checks.length + 1));
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  useEffect(() => {
    if (!result || step <= checks.length) return;
    let current = 0;
    const target = result.overall_score;
    const interval = setInterval(() => {
      current += 2;
      setDisplayScore(Math.min(current, target));
      if (current >= target) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, result]);

  const scored = !!result && step > checks.length;
  const circumference = 2 * Math.PI * 52;
  const badge = result ? RECOMMENDATION_BADGE[result.recommendation] : null;

  const wrongRole = !meQuery.isLoading && !!meQuery.data && meQuery.data.role !== "SUPPLIER";

  return (
    <ProtectedRoute>
      <AppShell role="Supplier" who={meQuery.data?.company_name ?? "…"}>
        <div className="mx-auto max-w-2xl">
          {wrongRole && (
            <section className="panel mb-6 flex flex-col items-center gap-3 p-6 text-center">
              <AlertTriangle className="size-8 text-destructive" />
              <p className="text-sm text-destructive">
                You're currently signed in as {meQuery.data?.company_name} (
                {meQuery.data?.role.toLowerCase()}). Sign in as the supplier who owns this invoice
                to request an advance.
              </p>
              <Button variant="outline" onClick={() => navigate({ to: "/login" })}>
                Go to sign in
              </Button>
            </section>
          )}

          {invoiceQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-extrabold tracking-tight">
                Scoring invoice {invoiceQuery.data?.number}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {invoiceQuery.data?.buyer} · {formatRWF(invoiceQuery.data?.amount ?? 0)} · due{" "}
                {invoiceQuery.data?.dueDate}
              </p>
            </>
          )}

          {scoreMutation.isError && (
            <section className="panel mt-6 flex flex-col items-center gap-3 p-6 text-center">
              <AlertTriangle className="size-8 text-destructive" />
              <p className="text-sm text-destructive">{getApiErrorMessage(scoreMutation.error)}</p>
              <Button variant="outline" onClick={() => scoreMutation.mutate()}>
                Try again
              </Button>
            </section>
          )}

          {!wrongRole && !scoreMutation.isError && (
            <section className="panel mt-6 divide-y divide-border/70 p-2">
              {checks.map((check, i) => {
                const complete = !!result && step > i;
                return (
                  <div key={check.label} className="flex items-center gap-3 px-4 py-4">
                    <span
                      className={`flex size-8 items-center justify-center rounded-full transition-colors ${
                        complete
                          ? "bg-success/15 text-success"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {complete ? (
                        <Check className="size-4" />
                      ) : (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                    </span>
                    <p className="flex-1 text-sm font-medium">{check.label}</p>
                    <p
                      className={`text-sm font-semibold transition-opacity ${
                        complete ? "text-success opacity-100" : "opacity-0"
                      }`}
                    >
                      ✓ {check.result}
                    </p>
                  </div>
                );
              })}
            </section>
          )}

          {scored && result && badge && result.recommendation !== "DECLINE" && (
            <section className="panel mt-6 flex flex-col items-center gap-4 p-6 text-center rise-in">
              <div className="relative size-32">
                <svg viewBox="0 0 120 120" className="size-32 -rotate-90">
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="var(--secondary)"
                    strokeWidth="12"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="var(--success)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - displayScore / 100)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold">{displayScore}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              <span
                className={`rounded-full px-4 py-1.5 text-sm font-bold tracking-wide ${badge.className}`}
              >
                {badge.label}
              </span>

              <dl className="mt-2 w-full space-y-3 text-left">
                <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
                  <dt className="text-sm text-muted-foreground">Advance approved</dt>
                  <dd className="font-semibold">{formatRWF(result.advance_amount)}</dd>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
                  <dt className="text-sm text-muted-foreground">Fee ({result.fee_percentage}%)</dt>
                  <dd className="font-semibold text-highlight">− {formatRWF(result.fee_amount)}</dd>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-success/40 bg-success/10 px-4 py-3">
                  <dt className="text-sm font-medium">You receive via MoMo</dt>
                  <dd className="text-lg font-extrabold text-success">
                    {formatRWF(result.net_amount)}
                  </dd>
                </div>
              </dl>

              {/* Full navigation, not router.navigate() — see supplier-dashboard.tsx
                  InvoiceRow for why: the destination page auto-fires a mutation on
                  mount that gets stuck rendering "pending" forever after a client-side
                  route transition, even though the request completes successfully. */}
              <Button
                asChild
                className="h-12 w-full text-base font-semibold shadow-[var(--shadow-glow)]"
              >
                <a href={`/payout?id=${id}`}>
                  <Smartphone className="size-5" /> Confirm &amp; Receive via MoMo
                </a>
              </Button>
            </section>
          )}

          {scored && result && result.recommendation === "DECLINE" && (
            <section className="panel mt-6 flex flex-col items-center gap-3 p-6 text-center rise-in">
              <span className="rounded-full bg-destructive/15 px-4 py-1.5 text-sm font-bold tracking-wide text-destructive">
                HIGH RISK
              </span>
              <p className="text-sm text-muted-foreground">
                This invoice doesn't qualify for an advance right now. Our team may follow up for
                more information.
              </p>
            </section>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
