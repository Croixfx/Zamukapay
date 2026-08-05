import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, FileText } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getBuyerPendingInvoices, formatRWF } from "@/lib/zamuka-data";

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

function BuyerDashboard() {
  const invoicesQuery = useQuery({
    queryKey: ["buyer-invoices"],
    queryFn: getBuyerPendingInvoices,
  });
  const invoices = invoicesQuery.data ?? [];
  const total = invoices.reduce((sum, i) => sum + i.amount, 0);

  return (
    <ProtectedRoute>
      <AppShell
        role="Buyer"
        who="Simba Supermarket Ltd"
        nav={[{ to: "/buyer-dashboard", label: "Confirmations" }]}
      >
        <div className="rise-in">
          <h1 className="text-3xl font-extrabold tracking-tight">Pending invoice confirmations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {invoicesQuery.isLoading
              ? "Loading your pending invoices…"
              : `${invoices.length} invoices · ${formatRWF(total)} awaiting your confirmation.`}
          </p>
        </div>

        {invoicesQuery.isLoading && (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        )}

        {invoicesQuery.isError && (
          <p className="mt-6 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="size-4 shrink-0" /> Couldn't load your invoices. Try
            refreshing the page.
          </p>
        )}

        {!invoicesQuery.isLoading && !invoicesQuery.isError && (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {invoices.map((invoice) => (
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
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
