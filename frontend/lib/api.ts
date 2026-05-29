/**
 * LabhPay frontend API client.
 * All calls go through `api()` which:
 *   - prefixes the base URL,
 *   - sends cookies (`credentials: 'include'`) so JWT sessions work,
 *   - throws a typed ApiError on 4xx/5xx.
 *
 * BASE is "/api" — a same-origin Next.js rewrite (see next.config.mjs) proxies
 * to the real backend. Same-origin keeps the FastAPI session cookies first-
 * party on labhpay.com, sidestepping Chrome/Safari third-party-cookie blocks.
 */

const BASE = "/api";

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  // Stage 10: echo the CSRF cookie on cookie-auth mutations.
  const method = (init.method || "GET").toUpperCase();
  if (MUTATING.has(method)) {
    const csrf = readCookie("lp_csrf");
    if (csrf && !headers.has("X-CSRF-Token")) {
      headers.set("X-CSRF-Token", csrf);
    }
  }

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
  phone_e164: string | null;
  email: string | null;
  display_name: string | null;
  language: string;
  private_mode_default: boolean;
  is_admin?: boolean;
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

export function signInWithGoogle(credential: string) {
  return api<{ ok: true; user: ApiUser }>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
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

export function uploadStatement(
  file: File,
  opts?: { private?: boolean; onProgress?: (pct: number) => void },
): Promise<UploadResponse> {
  // Uses XHR (not fetch) specifically so we can report real upload progress
  // via xhr.upload.onprogress — fetch() can't surface bytes-sent. Same-origin
  // (/api proxy), so cookies + CSRF work exactly like the other calls.
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    if (opts?.private != null) fd.append("private", String(opts.private));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/statements/upload`, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");
    const csrf = readCookie("lp_csrf");
    if (csrf) xhr.setRequestHeader("X-CSRF-Token", csrf);
    // NOTE: do not set Content-Type — the browser adds the multipart boundary.

    if (opts?.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          opts.onProgress!(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      let payload: { detail?: string } | null = null;
      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        payload = { detail: xhr.responseText };
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload as unknown as UploadResponse);
      } else {
        reject(
          new ApiError(xhr.status, payload?.detail || `Upload failed (${xhr.status})`)
        );
      }
    };
    xhr.onerror = () => reject(new ApiError(0, "Network error during upload."));
    xhr.ontimeout = () => reject(new ApiError(0, "Upload timed out. Try again."));
    xhr.send(fd);
  });
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
    overlimit: number;
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

// ---- Intelligence (Stage 7) ----

export type InsightCard = {
  id: string;
  title: string;
  body: string;
  next_step: string;
  severity: 1 | 2 | 3;
  confidence: number;
  category:
    | "charges"
    | "recurring"
    | "utilization"
    | "anomaly"
    | "duplicate"
    | "forex"
    | "profile_hint";
  impact_inr: number;
  beginner_body: string;
  refs: Record<string, unknown>;
  is_suspicious: boolean;
  txn_ids: string[];
};

export type ProfileTag = {
  id: string;
  title: string;
  body: string;
  score: number;
  icon: string;
};

export type IntelligenceSummary = {
  insights: InsightCard[];
  suspicious: InsightCard[];
  profile_tags: ProfileTag[];
  generated_at: string;
  llm_used: boolean;
};

export function getIntelligenceSummary(opts?: { ids?: string[]; phrase?: boolean }) {
  const params = new URLSearchParams();
  if (opts?.ids && opts.ids.length) params.set("ids", opts.ids.join(","));
  if (opts?.phrase === false) params.set("phrase", "false");
  const q = params.toString() ? `?${params.toString()}` : "";
  return api<IntelligenceSummary>(`/intelligence/summary${q}`);
}

// ---- Assistant (Stage 8) ----

export type AssistantReply = {
  answer: string;
  txn_ids_cited: string[];
  retrieval_count: number;
  fallback_used: boolean;
  tier_used: "fast" | "deep" | "none";
  prompt_version: string;
  generated_at: string;
};

export function askAssistant(
  question: string,
  opts?: { regenerate?: boolean; ids?: string[] }
) {
  return api<AssistantReply>("/assistant/chat", {
    method: "POST",
    body: JSON.stringify({
      question,
      regenerate: !!opts?.regenerate,
      ids: opts?.ids && opts.ids.length ? opts.ids.join(",") : null,
    }),
  });
}

export function getAssistantSuggestions(ids?: string[]) {
  const q = ids && ids.length ? `?ids=${encodeURIComponent(ids.join(","))}` : "";
  return api<{ suggestions: string[] }>(`/assistant/suggestions${q}`);
}

// ---- Resolution (Stage 9) ----

export type ResolutionAction = {
  id: string;
  label_en: string;
  label_hi: string;
  blurb_en: string;
  blurb_hi: string;
  recipient: "bank" | "merchant" | "either";
};

export type ResolutionRecipient = {
  action_id: string;
  name: string;
  kind: "bank" | "merchant" | "unknown";
  email: string | null;
  secondary_email: string | null;
  expected_sla: string | null;
};

export type ResolutionActionsResp = {
  txn: {
    id: string;
    merchant: string;
    amount: number;
    date: string;
    is_debit: boolean;
    is_emi: boolean;
    category: string;
    has_duplicate: boolean;
  };
  actions: ResolutionAction[];
  recipients: ResolutionRecipient[];
};

export type ResolutionEmail = {
  subject: string;
  body: string;
  recipient_name: string;
  recipient_kind: "bank" | "merchant" | "unknown";
  recipient_email: string | null;
  secondary_email: string | null;
  expected_sla: string | null;
  action_id: string;
  language: "en" | "hi";
  notes: string[];
};

export function getResolutionActions(jobId: string, txnId: string) {
  return api<ResolutionActionsResp>(`/resolution/actions/${jobId}/${txnId}`);
}

export function draftResolutionEmail(args: {
  job_id: string;
  txn_id: string;
  action_id: string;
  language: "en" | "hi";
}) {
  return api<ResolutionEmail>("/resolution/email", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

// ---- Exports (Stage 9) ----

export type ExportKind = "summary" | "yearly" | "categories" | "subscriptions" | "tax-summary";

export type ExportListItem = {
  kind: ExportKind;
  title: string;
  blurb: string;
};

export function listExports() {
  return api<{ exports: ExportListItem[] }>("/exports/");
}

export function exportUrl(kind: ExportKind, ids?: string[]): string {
  const base =
    BASE;
  const q = ids && ids.length ? `?ids=${encodeURIComponent(ids.join(","))}` : "";
  return `${base}/exports/${kind}.pdf${q}`;
}

export async function downloadExport(kind: ExportKind, ids?: string[]): Promise<void> {
  const res = await fetch(exportUrl(kind, ids), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = `Download failed (${res.status})`;
    try {
      const t = await res.text();
      const j = JSON.parse(t);
      if (j?.detail) detail = j.detail;
    } catch {
      /* keep default */
    }
    throw new ApiError(res.status, detail);
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const m = /filename="([^"]+)"/i.exec(cd);
  const filename = m?.[1] || `labhpay-${kind}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---- Admin ----

export type AdminUser = {
  id: string;
  email: string | null;
  phone_e164: string | null;
  display_name: string | null;
  auth_method: "google" | "phone" | "both" | "unknown";
  created_at: string | null;
  last_login_at: string | null;
  login_count: number;
  disabled: boolean;
  is_admin: boolean;
};

export type AdminUsersResp = {
  totals: {
    users: number;
    new_7d: number;
    active_7d: number;
    active_30d: number;
    disabled: number;
  };
  users: AdminUser[];
};

export function adminListUsers() {
  return api<AdminUsersResp>("/admin/users");
}

export type AdminAnalytics = {
  available: boolean;
  reason?: string;
  days: number;
  totals?: {
    events: number;
    logins: number;
    uploads: number;
    assistant_turns: number;
    exports: number;
    resolution_emails: number;
  };
  events: Record<string, number>;
  daily_active: { day: string; users: number }[];
  uploads_by_day: { day: string; count: number }[];
};

export function adminAnalytics(days = 30) {
  return api<AdminAnalytics>(`/admin/analytics?days=${days}`);
}

export type AdminHealth = {
  redis: { ok?: boolean; dbsize?: number; error?: string };
  ai: {
    providers?: Record<string, unknown>;
    fast_priority?: string;
    deep_priority?: string;
    error?: string;
  };
  users: { store?: string; count?: number; error?: string };
  generated_at?: string;
};

export function adminHealth() {
  return api<AdminHealth>("/admin/health");
}

export function adminUserAction(
  userId: string,
  action: "disable" | "enable" | "logout" | "reset-limits"
) {
  return api<{ ok: boolean; user_id: string; action: string }>(
    `/admin/users/${userId}/${action}`,
    { method: "POST" }
  );
}
