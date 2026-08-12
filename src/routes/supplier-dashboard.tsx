import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Plus,
  TrendingUp,
  Clock,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatRWF,
  getSupplierInvoices,
  getSupplierStats,
  getTransactions,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/zamuka-data";

const STATUS_BADGE: Record<InvoiceStatus, { label: string; className: string }> = {
  pending_confirmation: { label: "Awaiting buyer confirmation", className: "text-highlight" },
  confirmed: { label: "Confirmed — ready to score", className: "text-primary" },
  disputed: { label: "Disputed", className: "text-destructive" },
  approved: { label: "Approved — ready for payout", className: "text-primary" },
  advance_paid: { label: "Advance active", className: "text-success" },
  settled: { label: "Settled", className: "text-muted-foreground" },
};

export const Route = createFileRoute("/supplier-dashboard")({
  head: () => ({
    meta: [
      { title: "Supplier Dashboard — ZamukaPay" },
      {
        name: "description",
        content:
          "Track advances received, pending invoices and MoMo payouts on your ZamukaPay supplier dashboard.",
      },
      { property: "og:title", content: "Supplier Dashboard — ZamukaPay" },
      {
        property: "og:description",
        content: "Advances, pending invoices and recent MoMo transactions.",
      },
    ],
  }),
  component: SupplierDashboard,
});

function SupplierDashboard() {
  const statsQuery = useQuery({ queryKey: ["supplier-stats"], queryFn: getSupplierStats });
  const invoicesQuery = useQuery({ queryKey: ["supplier-invoices"], queryFn: getSupplierInvoices });
  const transactionsQuery = useQuery({ queryKey: ["transactions"], queryFn: getTransactions });

  const stats = statsQuery.data;
  const statCards = stats
    ? [
        {
          label: "Total advances received",
          value: formatRWF(stats.total_advances_received),
          note: `Across ${stats.total_advances_count} invoices`,
          icon: TrendingUp,
          tone: "success" as const,
        },
        {
          label: "Pending invoices",
          value: String(stats.pending_invoices_count),
          note: `${formatRWF(stats.pending_invoices_amount)} awaiting buyer confirmation`,
          icon: Clock,
          tone: "highlight" as const,
        },
        {
          label: "Active advances",
          value: String(stats.active_advances_count),
          note: `${formatRWF(stats.active_advances_amount)} to be repaid`,
          icon: FileText,
          tone: "primary" as const,
        },
      ]
    : [];

  return (
    <ProtectedRoute>
      <AppShell
        role="Supplier"
        who="Umucyo Fresh Produce Ltd"
        nav={[
          { to: "/supplier-dashboard", label: "Dashboard" },
          { to: "/invoice-new", label: "New invoice" },
        ]}
      >
        <div className="flex flex-wrap items-end justify-between gap-4 rise-in">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Muraho, Aline 👋</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Here is how your working capital is looking this month.
            </p>
          </div>
          <Button asChild className="h-12 px-6 text-base font-semibold shadow-[var(--shadow-glow)]">
            <Link to="/invoice-new">
              <Plus className="size-5" /> Submit New Invoice
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {statsQuery.isLoading &&
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}

          {!statsQuery.isLoading && !stats && (
            <div className="panel col-span-full flex items-center gap-3 p-5 text-sm text-destructive">
              <AlertTriangle className="size-5 shrink-0" /> Couldn't load your account stats. Try
              refreshing the page.
            </div>
          )}

          {statCards.map((stat) => (
            <div key={stat.label} className="panel p-5 rise-in">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <stat.icon
                  className={`size-5 ${
                    stat.tone === "success"
                      ? "text-success"
                      : stat.tone === "highlight"
                        ? "text-highlight"
                        : "text-primary"
                  }`}
                />
              </div>
              <p className="mt-3 text-2xl font-extrabold tracking-tight">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <section className="panel p-5">
            <h2 className="text-lg font-bold">Your invoices</h2>

            {invoicesQuery.isLoading && (
              <div className="mt-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            )}

            {invoicesQuery.isError && (
              <p className="mt-4 flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="size-4 shrink-0" /> Couldn't load your invoices.
              </p>
            )}

            {!invoicesQuery.isLoading && !invoicesQuery.isError && (
              <ul className="mt-4 space-y-3">
                {(invoicesQuery.data ?? []).map((invoice) => (
                  <InvoiceRow key={invoice.id} invoice={invoice} />
                ))}
              </ul>
            )}
          </section>

          <section className="panel p-5">
            <h2 className="text-lg font-bold">Recent transactions</h2>

            {transactionsQuery.isLoading && (
              <div className="mt-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            )}

            {transactionsQuery.isError && (
              <p className="mt-4 flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="size-4 shrink-0" /> Couldn't load your transactions.
              </p>
            )}

            {!transactionsQuery.isLoading && !transactionsQuery.isError && (
              <ul className="mt-4 divide-y divide-border/70">
                {(transactionsQuery.data ?? []).map((tx) => (
                  <li key={tx.id} className="flex items-center gap-3 py-3">
                    <span
                      className={`flex size-9 items-center justify-center rounded-full ${
                        tx.kind === "in"
                          ? "bg-success/15 text-success"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {tx.kind === "in" ? (
                        <ArrowDownLeft className="size-4" />
                      ) : (
                        <ArrowUpRight className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{tx.label}</p>
                      <p className="text-xs text-muted-foreground">{tx.date}</p>
                    </div>
                    <p
                      className={`text-sm font-semibold ${tx.kind === "in" ? "text-success" : ""}`}
                    >
                      {tx.kind === "in" ? "+" : "−"}
                      {formatRWF(tx.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const badge = STATUS_BADGE[invoice.status];
  const invoiceId = Number(invoice.id);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/40 p-4">
      <div>
        <p className="font-semibold">{invoice.number}</p>
        <p className="text-xs text-muted-foreground">
          {invoice.buyer} · due {invoice.dueDate}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="font-semibold">{formatRWF(invoice.amount)}</p>
          <span className={`text-xs font-medium ${badge.className}`}>{badge.label}</span>
        </div>
        {invoice.status === "confirmed" && (
          // Plain <a> (full navigation) rather than <Link> (client-side transition) —
          // the risk-score page auto-fires a scoring mutation on mount, and a client-side
          // router transition into it leaves that mutation's result stuck rendering the
          // loading state forever even though the request completes successfully server-side.
          <Button asChild size="sm" className="h-9 font-semibold">
            <a href={`/risk-score?id=${invoiceId}`}>Request Advance</a>
          </Button>
        )}
        {invoice.status === "approved" && (
          <Button asChild size="sm" className="h-9 font-semibold">
            <a href={`/payout?id=${invoiceId}`}>Receive via MoMo</a>
          </Button>
        )}
      </div>
    </li>
  );
}
