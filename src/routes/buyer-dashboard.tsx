import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, FileText } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import {
  getBuyerInvoices,
  getBuyerPendingInvoices,
  formatRWF,
  type InvoiceStatus,
} from "@/lib/zamuka-data";

export const Route = createFileRoute("/buyer-dashboard")({
  head: () => ({
    meta: [
      { title: "Buyer Dashboard — ZamukaPay" },
      {
        name: "description",
        content: "Review and confirm supplier invoices awaiting your approval on ZamukaPay.",
      },
      { property: "og:title", content: "Buyer Dashboard — ZamukaPay" },
      { property: "og:description", content: "Pending invoice confirmations from your suppliers." },
    ],
  }),
  component: BuyerDashboard,
});

const STATUS_BADGE: Record<InvoiceStatus, { label: string; className: string }> = {
  pending_confirmation: { label: "Pending confirmation", className: "bg-highlight/15 text-highlight" },
  confirmed: { label: "Confirmed", className: "bg-primary/15 text-primary" },
  disputed: { label: "Disputed", className: "bg-destructive/15 text-destructive" },
  approved: { label: "Approved", className: "bg-primary/15 text-primary" },
  advance_paid: { label: "Advance paid", className: "bg-success/15 text-success" },
  settled: { label: "Settled", className: "bg-secondary text-muted-foreground" },
};

function BuyerDashboard() {
  const meQuery = useQuery({ queryKey: ["auth-me"], queryFn: getCurrentUser });

  const pendingQuery = useQuery({
    queryKey: ["buyer-invoices"],
    queryFn: getBuyerPendingInvoices,
  });
  const pending = pendingQuery.data ?? [];
  const total = pending.reduce((sum, i) => sum + i.amount, 0);

  const historyQuery = useQuery({
    queryKey: ["buyer-invoice-history"],
    queryFn: getBuyerInvoices,
  });
  const history = (historyQuery.data ?? []).filter((i) => i.status !== "pending_confirmation");

  return (
    <ProtectedRoute>
      <AppShell
        role="Buyer"
        who={meQuery.data?.company_name ?? "…"}
        nav={[{ to: "/buyer-dashboard", label: "Confirmations" }]}
      >
        <div className="rise-in">
          <h1 className="text-3xl font-extrabold tracking-tight">Pending invoice confirmations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pendingQuery.isLoading
              ? "Loading your pending invoices…"
              : `${pending.length} invoices · ${formatRWF(total)} awaiting your confirmation.`}
          </p>
        </div>

        {pendingQuery.isLoading && (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        )}

        {pendingQuery.isError && (
          <p className="mt-6 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="size-4 shrink-0" /> Couldn't load your invoices. Try
            refreshing the page.
          </p>
        )}

        {!pendingQuery.isLoading && !pendingQuery.isError && (
          <>
            {pending.length > 0 ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pending.map((invoice) => (
                  <article key={invoice.id} className="panel flex flex-col p-5 rise-in">
                    <div className="flex items-center justify-between">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                        <FileText className="size-5" />
                      </span>
                      <span className="rounded-full bg-highlight/15 px-3 py-1 text-xs font-semibold text-highlight">
                        Awaiting you
                      </span>
                    </div>
                    <h2 className="mt-4 text-lg font-bold">{invoice.supplier}</h2>
                    <p className="text-xs text-muted-foreground">Invoice {invoice.number}</p>
                    <p className="mt-4 text-2xl font-extrabold tracking-tight">
                      {formatRWF(invoice.amount)}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="size-3.5" /> Due {invoice.dueDate}
                    </p>
                    <Button asChild className="mt-5 h-11 w-full font-semibold">
                      <Link to="/buyer-confirm/$id" params={{ id: invoice.id }}>
                        Confirm Invoice
                      </Link>
                    </Button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="panel mt-6 p-5 text-sm text-muted-foreground">
                Nothing waiting on you right now.
              </p>
            )}
          </>
        )}

        <section className="panel mt-8 p-5">
          <h2 className="text-lg font-bold">Invoice history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every invoice you've confirmed or disputed, and where it stands now.
          </p>

          {historyQuery.isLoading && (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          )}

          {historyQuery.isError && (
            <p className="mt-4 flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" /> Couldn't load your invoice history.
            </p>
          )}

          {!historyQuery.isLoading && !historyQuery.isError && (
            <ul className="mt-4 space-y-3">
              {history.map((invoice) => {
                const badge = STATUS_BADGE[invoice.status];
                return (
                  <li
                    key={invoice.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/40 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{invoice.number}</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.supplier} · due {invoice.dueDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold">{formatRWF(invoice.amount)}</p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </li>
                );
              })}
              {history.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No confirmed or disputed invoices yet.
                </p>
              )}
            </ul>
          )}
        </section>
      </AppShell>
    </ProtectedRoute>
  );
}
