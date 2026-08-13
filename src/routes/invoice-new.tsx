import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, UploadCloud, FileCheck2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { draft, formatRWF, getBuyers, submitInvoice } from "@/lib/zamuka-data";

export const Route = createFileRoute("/invoice-new")({
  head: () => ({
    meta: [
      { title: "Request an Advance — ZamukaPay" },
      {
        name: "description",
        content:
          "Submit an invoice with buyer, amount in RWF, due date and PDF upload to request a cash advance.",
      },
      { property: "og:title", content: "Request an Advance — ZamukaPay" },
      {
        property: "og:description",
        content: "Submit an invoice and get an advance decision in seconds.",
      },
    ],
  }),
  component: InvoiceNew,
});

function InvoiceNew() {
  const navigate = useNavigate();
  const [buyerId, setBuyerId] = useState<number | null>(null);
  const [amount, setAmount] = useState(String(draft.amount));
  const [dueDate, setDueDate] = useState(draft.dueDate);
  const [number, setNumber] = useState(draft.number);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState(draft.fileName);

  const meQuery = useQuery({ queryKey: ["auth-me"], queryFn: getCurrentUser });
  const buyersQuery = useQuery({ queryKey: ["buyers"], queryFn: getBuyers });

  const numericAmount = Number(amount) || 0;

  const submitMutation = useMutation({
    mutationFn: submitInvoice,
    onSuccess: () => {
      navigate({ to: "/supplier-dashboard" });
    },
  });

  const fieldErrors = getApiFieldErrors(submitMutation.error);
  const nonFieldError = submitMutation.isError && Object.keys(fieldErrors).length === 0;

  return (
    <ProtectedRoute>
      <AppShell
        role="Supplier"
        who={meQuery.data?.company_name ?? "…"}
        nav={[
          { to: "/supplier-dashboard", label: "Dashboard" },
          { to: "/invoice-new", label: "New invoice" },
        ]}
      >
        <div className="mx-auto max-w-2xl rise-in">
          <h1 className="text-3xl font-extrabold tracking-tight">Submit a new invoice</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Once your buyer confirms it, you can request an AI-scored advance of up to 80% of the
            invoice value to your MoMo wallet.
          </p>

          <form
            className="panel mt-6 space-y-5 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (!buyerId || !file) return;
              submitMutation.mutate({ buyerId, number, amount: numericAmount, dueDate, file });
            }}
          >
            <div className="space-y-2">
              <Label>Buyer name</Label>
              <Select
                value={buyerId ? String(buyerId) : ""}
                onValueChange={(value) => setBuyerId(Number(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={buyersQuery.isLoading ? "Loading buyers…" : "Select a buyer"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(buyersQuery.data ?? []).map((buyer) => (
                    <SelectItem key={buyer.id} value={String(buyer.id)}>
                      {buyer.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors["buyer"] && (
                <p className="text-xs text-destructive">{fieldErrors["buyer"]}</p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Invoice amount (RWF)</Label>
                <Input
                  id="amount"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                  required
                />
                <p className="text-xs text-muted-foreground">{formatRWF(numericAmount)}</p>
                {fieldErrors["amount"] && (
                  <p className="text-xs text-destructive">{fieldErrors["amount"]}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="due">Due date</Label>
                <Input
                  id="due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
                {fieldErrors["due_date"] && (
                  <p className="text-xs text-destructive">{fieldErrors["due_date"]}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="number">Invoice number</Label>
              <Input
                id="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
              />
              {fieldErrors["number"] && (
                <p className="text-xs text-destructive">{fieldErrors["number"]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Upload invoice (PDF)</Label>
              <label
                htmlFor="file"
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-secondary/40 p-4 transition-colors hover:bg-secondary/70"
              >
                {fileName ? (
                  <FileCheck2 className="size-6 text-success" />
                ) : (
                  <UploadCloud className="size-6 text-muted-foreground" />
                )}
                <span className="text-sm">
                  {fileName ? (
                    <>
                      <span className="font-medium">{fileName}</span>
                      <span className="block text-xs text-muted-foreground">Tap to replace</span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">Choose a PDF</span>
                      <span className="block text-xs text-muted-foreground">Max 10 MB</span>
                    </>
                  )}
                </span>
              </label>
              <input
                id="file"
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(e) => {
                  const selected = e.target.files?.[0] ?? null;
                  setFile(selected);
                  setFileName(selected?.name ?? "");
                }}
              />
              {fieldErrors["pdf_file"] && (
                <p className="text-xs text-destructive">{fieldErrors["pdf_file"]}</p>
              )}
            </div>

            {nonFieldError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {getApiErrorMessage(submitMutation.error)}
              </p>
            )}

            <Button
              type="submit"
              className="h-12 w-full text-base font-semibold shadow-[var(--shadow-glow)]"
              disabled={submitMutation.isPending || !file || !buyerId}
            >
              {submitMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Submit Invoice
            </Button>
          </form>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
