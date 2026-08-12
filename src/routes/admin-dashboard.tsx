import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  FileText,
  Loader2,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import {
  formatRWF,
  getAdminDashboard,
  getAdminInvoices,
  settleAdvance,
  type AdminInvoiceRow,
  type InvoiceStatus,
} from "@/lib/zamuka-data";

export const Route = createFileRoute("/admin-dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — ZamukaPay" },
      {
        name: "description",
        content: "Platform-wide view of invoices, advances, fees and risk score distribution.",
      },
      { property: "og:title", content: "Admin Dashboard — ZamukaPay" },
      { property: "og:description", content: "Monitor invoices, advances and settlements." },
    ],
  }),
  component: AdminDashboard,
});

const STATUS_BADGE: Record<InvoiceStatus, { label: string; className: string }> = {
  pending_confirmation: { label: "Pending confirmation", className: "bg-highlight/15 text-highlight" },
  confirmed: { label: "Confirmed", className: "bg-primary/15 text-primary" },
  disputed: { label: "Disputed", className: "bg-destructive/15 text-destructive" },
  approved: { label: "Approved", className: "bg-primary/15 text-primary" },
  advance_paid: { label: "Advance paid", className: "bg-success/15 text-success" },
  settled: { label: "Settled", className: "bg-secondary text-muted-foreground" },
};

const STATUS_FILTERS: { value: InvoiceStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending_confirmation", label: "Pending confirmation" },
  { value: "confirmed", label: "Confirmed" },
  { value: "disputed", label: "Disputed" },
  { value: "approved", label: "Approved" },
  { value: "advance_paid", label: "Advance paid" },
  { value: "settled", label: "Settled" },
];

function riskScoreClassName(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 70) return "text-success";
  if (score >= 50) return "text-highlight";
  return "text-destructive";
}

function RiskScoreValue({ score }: { score: number | null }) {
  return (
    <span className={`text-sm font-bold tabular-nums ${riskScoreClassName(score)}`}>
      {score === null ? "—" : score}
    </span>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const queryClient = useQueryClient();

  const meQuery = useQuery({ queryKey: ["auth-me"], queryFn: getCurrentUser, retry: false });

  useEffect(() => {
    if (meQuery.isError || (meQuery.data && meQuery.data.role !== "ADMIN")) {
      navigate({ to: "/login" });
    }
  }, [meQuery.isError, meQuery.data, navigate]);

  const isAdmin = meQuery.data?.role === "ADMIN";

  const dashboardQuery = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: getAdminDashboard,
    enabled: isAdmin,
  });
  const invoicesQuery = useQuery({
    queryKey: ["admin-invoices", statusFilter],
    queryFn: () => getAdminInvoices(statusFilter === "all" ? undefined : statusFilter),
    enabled: isAdmin,
  });

  const settleMutation = useMutation({
    mutationFn: settleAdvance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Advance settled.");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = dashboardQuery.data;
  const statCards = stats
    ? [
        {
          label: "Total invoices",
          value: String(stats.total_invoices),
          icon: FileText,
          tone: "primary" as const,
        },
        {
          label: "Total advanced",
          value: formatRWF(stats.total_advanced_rwf),
          icon: Wallet,
          tone: "success" as const,
        },
        {
          label: "Fees collected",
          value: formatRWF(stats.total_fees_collected_rwf),
          icon: Banknote,
          tone: "highlight" as const,
        },
        {
          label: "Active advances",
          value: String(stats.active_advances),
          icon: BadgeCheck,
          tone: "primary" as const,
        },
      ]
    : [];

  const distributionCards = stats
    ? [
        { key: "APPROVE" as const, label: "Approve", className: "text-success" },
        { key: "REVIEW" as const, label: "Review", className: "text-highlight" },
        { key: "DECLINE" as const, label: "Decline", className: "text-destructive" },
      ]
    : [];

  return (
    <ProtectedRoute>
      <AppShell role="Admin" who="ZamukaPay Admin">
        <div className="rise-in">
          <h1 className="text-3xl font-extrabold tracking-tight">Platform overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invoices, advances and risk decisions across every supplier and buyer.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboardQuery.isLoading &&
            [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}

          {!dashboardQuery.isLoading && !stats && (
            <div className="panel col-span-full flex items-center gap-3 p-5 text-sm text-destructive">
              <AlertTriangle className="size-5 shrink-0" /> Couldn't load platform stats.
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
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {dashboardQuery.isLoading &&
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}

          {stats &&
            distributionCards.map((row) => (
              <div key={row.key} className="panel p-5 rise-in">
                <p className="text-sm text-muted-foreground">{row.label}</p>
                <p className={`mt-3 text-2xl font-extrabold tracking-tight ${row.className}`}>
                  {stats.risk_distribution[row.key]}
                </p>
              </div>
            ))}
        </div>

        <section className="panel mt-6 p-5">
          <h2 className="text-lg font-bold">Recent invoices</h2>
          {dashboardQuery.isLoading && (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          )}
          {stats && (
            <ul className="mt-4 space-y-3">
              {stats.recent_invoices.map((invoice) => (
                <li
                  key={invoice.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/40 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{invoice.number}</p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.supplier_name} → {invoice.buyer_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Risk score</p>
                      <RiskScoreValue score={invoice.risk_score} />
                    </div>
                    <p className="font-semibold">{formatRWF(invoice.amount)}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[invoice.status].className}`}
                    >
                      {STATUS_BADGE[invoice.status].label}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel mt-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">All invoices</h2>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as InvoiceStatus | "all")}
            >
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {invoicesQuery.isLoading && (
            <div className="mt-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          )}

          {invoicesQuery.isError && (
            <p className="mt-4 flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" /> Couldn't load invoices.
            </p>
          )}

          {!invoicesQuery.isLoading && !invoicesQuery.isError && (
            <ul className="mt-4 space-y-3">
              {(invoicesQuery.data ?? []).map((invoice) => (
                <AdminInvoiceRowItem
                  key={invoice.id}
                  invoice={invoice}
                  onSettle={(advanceId) => settleMutation.mutate(advanceId)}
                  settling={settleMutation.isPending}
                />
              ))}
              {invoicesQuery.data?.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No invoices match this filter.
                </p>
              )}
            </ul>
          )}
        </section>
      </AppShell>
    </ProtectedRoute>
  );
}

function AdminInvoiceRowItem({
  invoice,
  onSettle,
  settling,
}: {
  invoice: AdminInvoiceRow;
  onSettle: (advanceId: number) => void;
  settling: boolean;
}) {
  const badge = STATUS_BADGE[invoice.status];

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/40 p-4">
      <div className="min-w-0">
        <p className="truncate font-semibold">{invoice.number}</p>
        <p className="text-xs text-muted-foreground">
          {invoice.supplier_name} → {invoice.buyer_name}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Risk score</p>
          <RiskScoreValue score={invoice.risk_score} />
        </div>
        <div className="text-right">
          <p className="font-semibold">{formatRWF(invoice.amount)}</p>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        {invoice.status === "advance_paid" && invoice.advance_id !== null && (
          <Button
            size="sm"
            className="h-9 font-semibold"
            disabled={settling}
            onClick={() => onSettle(invoice.advance_id!)}
          >
            {settling && <Loader2 className="size-3.5 animate-spin" />}
            Settle
          </Button>
        )}
      </div>
    </li>
  );
}
