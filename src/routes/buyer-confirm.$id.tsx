import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { confirmInvoice, disputeInvoice, getInvoice, formatRWF } from "@/lib/zamuka-data";

export const Route = createFileRoute("/buyer-confirm/$id")({
  head: () => ({
    meta: [
      { title: "Confirm Invoice — ZamukaPay" },
      {
        name: "description",
        content:
          "Review supplier, amount and due date, then confirm or dispute the invoice you were issued.",
      },
      { property: "og:title", content: "Confirm Invoice — ZamukaPay" },
      { property: "og:description", content: "Confirm or dispute a supplier invoice in one tap." },
    ],
  }),
  component: BuyerConfirm,
});

function BuyerConfirm() {
  const { id } = useParams({ from: "/buyer-confirm/$id" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const meQuery = useQuery({ queryKey: ["auth-me"], queryFn: getCurrentUser });
  const invoiceQuery = useQuery({ queryKey: ["invoice", id], queryFn: () => getInvoice(id) });

  const confirmMutation = useMutation({
    mutationFn: () => confirmInvoice(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyer-invoices"] });
      navigate({ to: "/buyer-dashboard" });
    },
  });

  const disputeMutation = useMutation({
    mutationFn: () => disputeInvoice(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyer-invoices"] });
      navigate({ to: "/buyer-dashboard" });
    },
  });

  const busy = confirmMutation.isPending || disputeMutation.isPending;
  const actionError = confirmMutation.error ?? disputeMutation.error;

  return (
    <ProtectedRoute>
      <AppShell
        role="Buyer"
        who={meQuery.data?.company_name ?? "…"}
        nav={[{ to: "/buyer-dashboard", label: "Confirmations" }]}
      >
        <div className="mx-auto max-w-lg rise-in">
          {invoiceQuery.isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-4 h-64 rounded-2xl" />
            </div>
          )}

          {invoiceQuery.isError && (
            <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" /> Couldn't load this invoice.
            </p>
          )}

          {invoiceQuery.data && (
            <>
              <h1 className="text-3xl font-extrabold tracking-tight">Do you owe this invoice?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Confirming lets {invoiceQuery.data.supplier} receive an advance today. You still pay
                on the due date.
              </p>

              <dl className="panel mt-6 divide-y divide-border/70 p-2">
                {[
                  { label: "Supplier", value: invoiceQuery.data.supplier },
                  { label: "Invoice number", value: invoiceQuery.data.number },
                  { label: "Amount", value: formatRWF(invoiceQuery.data.amount) },
                  { label: "Due date", value: invoiceQuery.data.dueDate },
                  { label: "Goods / services", value: "Fresh produce delivery — July batch" },
                  { label: "Purchase order", value: "PO-77213" },
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

              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-success" /> Your confirmation is legally
                recorded and timestamped.
              </p>

              {actionError && (
                <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {getApiErrorMessage(actionError)}
                </p>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  className="h-12 flex-1 text-base font-semibold shadow-[var(--shadow-glow)]"
                  disabled={busy}
                  onClick={() => confirmMutation.mutate()}
                >
                  {confirmMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                  Confirm — I owe this
                </Button>
                <Button
                  variant="outline"
                  className="h-12 flex-1 text-base font-semibold text-destructive hover:bg-destructive/10"
                  disabled={busy}
                  onClick={() => disputeMutation.mutate()}
                >
                  {disputeMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                  Dispute
                </Button>
              </div>
            </>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
