/**
 * LabhPay frontend API client.
 * All calls go through `api()` which:
 *   - prefixes the base URL,
 *   - sends cookies (`credentials: 'include'`) so JWT sessions work,
 *   - throws a typed ApiError on 4xx/5xx.
 */

const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { detail: text };
    }
  }

  if (!res.ok) {
    const detail =
      (payload as { detail?: string })?.detail ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, detail);
  }
  return payload as T;
}

// ---- Typed helpers for Stage 3 ----

export type ApiUser = {
  id: string;
  phone_e164: string;
  display_name: string | null;
  language: string;
  private_mode_default: boolean;
};

export function requestOtp(phone: string, first_name?: string) {
  return api<{ ok: true; phone: string; expires_in_minutes: number }>(
    "/auth/request-otp",
    { method: "POST", body: JSON.stringify({ phone, first_name }) }
  );
}

export function verifyOtp(phone: string, otp: string) {
  return api<{ ok: true; user: ApiUser }>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, otp }),
  });
}

export function getMe() {
  return api<{ user: ApiUser }>("/auth/me");
}

export function logout() {
  return api<{ ok: true }>("/auth/logout", { method: "POST" });
}

export function refresh() {
  return api<{ ok: true }>("/auth/refresh", { method: "POST" });
}

// ---- Statements (Stage 4) ----

export type ApiTxn = {
  id: string;
  txn_date: string;
  posting_date: string | null;
  merchant_raw: string;
  merchant_norm: string | null;
  amount: string;
  is_debit: boolean;
  currency: string;
  reward_points: number | null;
  is_emi: boolean;
  category: string;
  category_confidence: number;
  extraction_confidence: number;
  note: string | null;
};

export type ApiStatementMeta = {
  bank_id: string;
  bank_display: string;
  card_last4: string | null;
  due_date: string | null;
  total_outstanding: string | null;
  minimum_due: string | null;
  available_limit: string | null;
  finance_charges: string | null;
  gst_on_charges: string | null;
  detection_confidence: number;
  ocr_used: boolean;
  pages: number;
};

export type JobStage =
  | "queued"
  | "decrypting"
  | "extracting"
  | "ocr"
  | "parsing"
  | "categorizing"
  | "done"
  | "needs_password"
  | "failed";

export type JobStatus = {
  job_id: string;
  stage: JobStage;
  progress: number;
  message: string | null;
  bank_id: string | null;
  bank_display: string | null;
  error: string | null;
  updated_at: string;
};

export type UploadResponse = {
  job_id: string;
  filename: string;
  needs_password: boolean;
};

export async function uploadStatement(file: File): Promise<UploadResponse> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(
    `${(process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000").replace(/\/$/, "")}/statements/upload`,
    { method: "POST", body: fd, credentials: "include" }
  );
  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, payload?.detail || `Upload failed (${res.status})`);
  }
  return payload as UploadResponse;
}

export function getStatementStatus(jobId: string) {
  return api<JobStatus>(`/statements/${jobId}/status`);
}

export function getStatementResult(jobId: string) {
  return api<{ job_id: string; statement: { meta: ApiStatementMeta; transactions: ApiTxn[] } }>(
    `/statements/${jobId}/result`
  );
}

export function submitStatementPassword(jobId: string, password: string) {
  return api<{ ok: true }>(`/statements/${jobId}/password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function deleteStatementJob(jobId: string) {
  return api<{ ok: true }>(`/statements/${jobId}`, { method: "DELETE" });
}

// ---- Dashboard (Stage 5) ----

export type DashSummary = {
  total_spending: number;
  total_credits: number;
  txn_count: number;
  by_category: { category: string; amount: number; count: number; pct: number }[];
  top_merchants: { merchant: string; amount: number; count: number; category: string }[];
  recurring: {
    merchant: string;
    monthly_amount: number;
    category: string;
    occurrences: number;
    months_seen: number;
    reason: string;
  }[];
  hidden_charges: {
    finance: number;
    gst: number;
    late_fees: number;
    total: number;
    has_any: boolean;
  };
  emi: { total: number; count: number };
  utilization:
    | { used: number; limit: number; pct: number; tone: "low" | "medium" | "high" }
    | null;
  monthly_trend: { month: string; total: number }[];
  statements: {
    bank_id: string;
    bank_display: string;
    card_last4: string | null;
    period_start: string | null;
    period_end: string | null;
    due_date: string | null;
    total_outstanding: number;
    minimum_due: number;
    detection_confidence: number;
    pages: number;
    txn_count: number;
  }[];
  confidence: {
    extraction: "high" | "medium" | "low" | "none";
    categorization: "high" | "medium" | "low" | "none";
    extraction_score?: number;
    categorization_score?: number;
  };
};

export function getDashboardSummary(ids?: string[]) {
  const q = ids && ids.length ? `?ids=${encodeURIComponent(ids.join(","))}` : "";
  return api<DashSummary>(`/dashboard/summary${q}`);
}
