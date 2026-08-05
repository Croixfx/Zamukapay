import { api } from "./api";

export type Invoice = {
  id: string;
  number: string;
  buyer: string;
  supplier: string;
  amount: number;
  dueDate: string;
  status: "pending" | "advanced" | "confirmed" | "disputed";
};

export const BUYERS = [
  "Simba Supermarket Ltd",
  "Kigali Heights Retail",
  "Inyange Industries",
  "SP Petroleum Rwanda",
  "Nakumatt Union Trade",
];

export const supplierInvoices: Invoice[] = [
  {
    id: "inv-1",
    number: "INV-2041",
    buyer: "Simba Supermarket Ltd",
    supplier: "Umucyo Fresh Produce Ltd",
    amount: 2000000,
    dueDate: "2026-09-12",
    status: "pending",
  },
  {
    id: "inv-2",
    number: "INV-2038",
    buyer: "Inyange Industries",
    supplier: "Umucyo Fresh Produce Ltd",
    amount: 1250000,
    dueDate: "2026-08-28",
    status: "advanced",
  },
  {
    id: "inv-3",
    number: "INV-2033",
    buyer: "Kigali Heights Retail",
    supplier: "Umucyo Fresh Produce Ltd",
    amount: 860000,
    dueDate: "2026-08-19",
    status: "advanced",
  },
];

export const transactions = [
  {
    id: "t1",
    label: "Advance received — INV-2038",
    date: "12 Jul 2026",
    amount: 1187500,
    kind: "in" as const,
  },
  {
    id: "t2",
    label: "Platform fee — INV-2038",
    date: "12 Jul 2026",
    amount: -50000,
    kind: "out" as const,
  },
  {
    id: "t3",
    label: "Advance received — INV-2033",
    date: "28 Jun 2026",
    amount: 816000,
    kind: "in" as const,
  },
  {
    id: "t4",
    label: "Repayment settled — INV-2019",
    date: "14 Jun 2026",
    amount: -742000,
    kind: "out" as const,
  },
  {
    id: "t5",
    label: "Advance received — INV-2019",
    date: "02 Jun 2026",
    amount: 712320,
    kind: "in" as const,
  },
];

export const buyerPendingInvoices: Invoice[] = [
  {
    id: "b-1",
    number: "INV-2041",
    buyer: "Simba Supermarket Ltd",
    supplier: "Umucyo Fresh Produce Ltd",
    amount: 2000000,
    dueDate: "2026-09-12",
    status: "pending",
  },
  {
    id: "b-2",
    number: "INV-1174",
    buyer: "Simba Supermarket Ltd",
    supplier: "Rwanda Packaging Co.",
    amount: 640000,
    dueDate: "2026-08-30",
    status: "pending",
  },
  {
    id: "b-3",
    number: "INV-0912",
    buyer: "Simba Supermarket Ltd",
    supplier: "Gasabo Logistics Ltd",
    amount: 1180000,
    dueDate: "2026-09-05",
    status: "pending",
  },
];

/** Draft invoice held in memory between the submission form and the scoring/payout screens. */
export const draft: {
  buyer: string;
  amount: number;
  dueDate: string;
  number: string;
  fileName: string;
  invoiceId: number | null;
} = {
  buyer: "Simba Supermarket Ltd",
  amount: 2000000,
  dueDate: "2026-09-12",
  number: "INV-2041",
  fileName: "invoice-2041.pdf",
  invoiceId: null,
};

export function formatRWF(value: number) {
  return `${Math.round(Math.abs(value)).toLocaleString("en-US")} RWF`;
}

// ---------------------------------------------------------------------------
// Backend-integrated data layer. Each function calls the real ZamukaPay API
// (see ../../backend) and falls back to the mock data above if the request
// fails — e.g. the backend isn't running, or the endpoint doesn't exist yet.
// The static exports above are left untouched so existing screens keep
// working unmodified; callers that want live data use these functions.
// ---------------------------------------------------------------------------

export type BuyerOption = { id: number; company_name: string; is_verified: boolean };

export async function getBuyers(): Promise<BuyerOption[]> {
  try {
    const { data } = await api.get<{ data: BuyerOption[] }>("/users/buyers/");
    return data.data;
  } catch {
    return BUYERS.map((company_name, index) => ({
      id: index + 1,
      company_name,
      is_verified: true,
    }));
  }
}

export async function getSupplierInvoices(): Promise<Invoice[]> {
  try {
    const { data } = await api.get<{ data: { results: Invoice[] } }>("/invoices/");
    return data.data.results;
  } catch {
    return supplierInvoices;
  }
}

export type Transaction = {
  id: string;
  label: string;
  date: string;
  amount: number;
  kind: "in" | "out";
};

export async function getTransactions(): Promise<Transaction[]> {
  try {
    const { data } = await api.get<{ data: { results: Transaction[] } }>("/transactions/");
    return data.data.results;
  } catch {
    return transactions;
  }
}

export type SupplierStats = {
  total_advances_received: number;
  total_advances_count: number;
  pending_invoices_count: number;
  pending_invoices_amount: number;
  active_advances_count: number;
  active_advances_amount: number;
};

/** No mock fallback shape matches this 1:1 — callers fall back to the hardcoded stat cards on null. */
export async function getSupplierStats(): Promise<SupplierStats | null> {
  try {
    const { data } = await api.get<{ data: SupplierStats }>("/invoices/stats/");
    return data.data;
  } catch {
    return null;
  }
}

export async function getBuyerPendingInvoices(): Promise<Invoice[]> {
  try {
    const { data } = await api.get<{ data: Invoice[] }>("/invoices/pending/");
    return data.data;
  } catch {
    return buyerPendingInvoices;
  }
}

export async function getInvoice(id: string | number): Promise<Invoice> {
  try {
    const { data } = await api.get<{ data: Invoice }>(`/invoices/${id}/`);
    return data.data;
  } catch {
    return (
      buyerPendingInvoices.find((invoice) => invoice.id === String(id)) ?? buyerPendingInvoices[0]!
    );
  }
}

export async function submitInvoice(payload: {
  buyerId: number;
  number: string;
  amount: number;
  dueDate: string;
  file: File;
  goodsDescription?: string;
  purchaseOrderNumber?: string;
}): Promise<Invoice> {
  const form = new FormData();
  form.append("number", payload.number);
  form.append("buyer", String(payload.buyerId));
  form.append("amount", String(payload.amount));
  form.append("due_date", payload.dueDate);
  form.append("pdf_file", payload.file);
  if (payload.goodsDescription) form.append("goods_description", payload.goodsDescription);
  if (payload.purchaseOrderNumber)
    form.append("purchase_order_number", payload.purchaseOrderNumber);

  const { data } = await api.post<{ data: Invoice }>("/invoices/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export type RiskCheck = { label: string; result: string };
export type RiskScoreResult = {
  overall_score: number;
  recommendation: "APPROVE" | "REVIEW" | "DECLINE";
  advance_amount: number;
  fee_percentage: number;
  fee_amount: number;
  net_amount: number;
  checks: RiskCheck[];
};

export async function scoreInvoice(invoiceId: number): Promise<RiskScoreResult> {
  const { data } = await api.post<{ data: RiskScoreResult }>(
    `/scoring/invoices/${invoiceId}/score/`,
  );
  return data.data;
}

export type PayoutReceipt = {
  phone_number: string;
  amount_sent: number;
  transaction_id: string;
  timestamp: string;
  invoice_number: string;
  buyer: string;
};

export async function confirmMomoPayout(invoiceId: number): Promise<PayoutReceipt> {
  const { data } = await api.post<{ data: PayoutReceipt }>(`/notifications/payout/${invoiceId}/`);
  return data.data;
}

export async function confirmInvoice(invoiceId: number): Promise<Invoice> {
  const { data } = await api.post<{ data: Invoice }>(`/invoices/${invoiceId}/confirm/`);
  return data.data;
}

export async function disputeInvoice(invoiceId: number, reason?: string): Promise<Invoice> {
  const { data } = await api.post<{ data: Invoice }>(`/invoices/${invoiceId}/dispute/`, { reason });
  return data.data;
}
