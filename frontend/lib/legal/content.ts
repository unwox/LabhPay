import type { Block } from "@/lib/blog/types";

/**
 * Legal copy for the Privacy Policy and Terms of Service.
 *
 * IMPORTANT (site owner): this is a solid, DPDP/IT-Act-aligned starting
 * template — NOT a substitute for legal review. Before relying on it:
 *   - Replace "LabhPay" with your registered legal entity name once incorporated.
 *   - Confirm the grievance-officer name + email and add a registered address.
 *   - Have an Indian lawyer (data-protection / fintech) review both documents.
 * Update LEGAL_UPDATED when you change them.
 */

export const LEGAL_UPDATED = "29 June 2026";
export const GRIEVANCE_EMAIL = "labhpay@gmail.com";

export const PRIVACY_POLICY: Block[] = [
  {
    type: "callout",
    tone: "info",
    title: "In short",
    text: "We help you understand your own financial documents. Your statements and Form 16 are processed in memory, encrypted in transit, and auto-deleted after your session — never sold, never used to train models. We keep only the minimum account details needed to run your account.",
  },
  { type: "h2", text: "1. Who this applies to" },
  {
    type: "p",
    text: "This Privacy Policy explains how LabhPay (“we”, “us”) collects, uses, and protects your personal data when you use labhpay.com and our services. It is aligned with India’s Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000 and its rules. By using LabhPay you agree to this policy.",
  },
  { type: "h2", text: "2. What we collect" },
  {
    type: "ul",
    items: [
      "Account data: your email and/or mobile number, Google account ID (if you sign in with Google), and display name.",
      "Financial documents you upload (e.g. credit card / bank statements, Form 16): processed transiently to generate insights. We mask your full card number and do not store the documents.",
      "Derived results (transactions, insights) held only for your active session in encrypted, short-lived storage.",
      "Consent records: the version you accepted, date/time, IP address, and browser user-agent — kept for compliance.",
      "Usage analytics: privacy-friendly, aggregate page/visit data. We do not build advertising profiles.",
    ],
  },
  { type: "h2", text: "3. How we use your data" },
  {
    type: "ul",
    items: [
      "To provide the service: read your documents and show you insights, tax estimates and calculations.",
      "To authenticate you and keep your account secure.",
      "To comply with legal obligations and maintain consent/audit records.",
      "To understand product usage in aggregate and improve LabhPay.",
    ],
  },
  {
    type: "p",
    text: "Our legal basis is your consent, which you may withdraw at any time (see Your rights).",
  },
  { type: "h2", text: "4. How long we keep it" },
  {
    type: "ul",
    items: [
      "Uploaded documents and derived results: processed in memory and auto-deleted shortly after your session (typically within 30 minutes), and on logout.",
      "Account data: kept until you ask us to delete your account.",
      "Consent and anonymised audit records: retained as required for compliance.",
    ],
  },
  { type: "h2", text: "5. Service providers and international transfers" },
  {
    type: "p",
    text: "We use trusted processors to run LabhPay, and some may store or process data outside India:",
  },
  {
    type: "ul",
    items: [
      "Hosting & infrastructure: Vercel and Hugging Face (application hosting), Supabase (account database), Upstash (temporary encrypted session store).",
      "AI providers (e.g. Google Gemini): we send only the figures/text needed to generate insights or read a document — never your full card number, and we do not request your name/PAN back.",
      "WhatsApp OTP delivery (NotifyNow) for login codes.",
    ],
  },
  {
    type: "p",
    text: "Where data is transferred outside India, we rely on your consent and take reasonable steps to protect it. This is permitted under the DPDP Act except to countries the Government of India may restrict.",
  },
  { type: "h2", text: "6. How we protect your data" },
  {
    type: "ul",
    items: [
      "Encryption in transit (HTTPS) and encryption of temporary document storage.",
      "Your full card number (PAN) is masked during processing and never stored.",
      "Short-lived, session-scoped storage with automatic deletion.",
      "Access controls and anonymised audit logging.",
    ],
  },
  { type: "h2", text: "7. Your rights" },
  {
    type: "p",
    text: "Under the DPDP Act you may: access the personal data we hold about you; correct or update it; request deletion of your account and data; withdraw consent; and nominate a representative. To exercise any of these, email our Grievance Officer (below). We will respond within the timelines required by law.",
  },
  { type: "h2", text: "8. Cookies" },
  {
    type: "p",
    text: "We use essential cookies to keep you signed in and protect against cross-site request forgery, and privacy-friendly analytics cookies to measure usage. We do not use advertising or cross-site tracking cookies.",
  },
  { type: "h2", text: "9. Children" },
  {
    type: "p",
    text: "LabhPay is intended for adults aged 18 and over. We do not knowingly collect data from children. If you believe a minor has used the service, contact us and we will delete the data.",
  },
  { type: "h2", text: "10. Grievance Officer" },
  {
    type: "p",
    text: `For any privacy questions, requests, or complaints, contact our Grievance Officer at ${GRIEVANCE_EMAIL}. We aim to acknowledge within 48 hours and resolve within the timelines prescribed under Indian law.`,
  },
  { type: "h2", text: "11. Changes" },
  {
    type: "p",
    text: `We may update this policy. Material changes will be reflected by an updated date and, where appropriate, a fresh consent request. Last updated: ${LEGAL_UPDATED}.`,
  },
  {
    type: "callout",
    tone: "warn",
    title: "Not financial or tax advice",
    text: "LabhPay provides informational insights and estimates only. It is not financial, investment, tax, or legal advice. Always verify important figures and consult a qualified professional before acting.",
  },
];

export const TERMS: Block[] = [
  {
    type: "p",
    text: `These Terms of Service govern your use of LabhPay (labhpay.com). By using the service you agree to these terms. Last updated: ${LEGAL_UPDATED}.`,
  },
  { type: "h2", text: "1. Eligibility" },
  {
    type: "p",
    text: "You must be at least 18 years old and capable of entering a binding agreement under Indian law to use LabhPay.",
  },
  { type: "h2", text: "2. What LabhPay does" },
  {
    type: "p",
    text: "LabhPay helps you understand your own financial documents — credit card and bank statements, and Form 16 — and provides financial calculators and tax estimates. It analyses documents you choose to upload; it does not connect to your bank or file returns on your behalf.",
  },
  {
    type: "callout",
    tone: "warn",
    title: "Informational only — not professional advice",
    text: "All insights, tax estimates, regime comparisons and calculator results are for general information and are estimates only. LabhPay is not a financial adviser, tax adviser, or chartered accountant, and nothing here is financial, investment, tax, or legal advice. Decisions you make are your own. For filing and important decisions, consult a qualified professional and verify figures on official sources such as incometax.gov.in.",
  },
  { type: "h2", text: "3. Your responsibilities" },
  {
    type: "ul",
    items: [
      "Upload only documents that belong to you and that you are authorised to use.",
      "Provide accurate information; results depend on the inputs you give.",
      "Keep your login secure and don’t share OTPs or passwords with anyone.",
      "Use the service lawfully and not attempt to disrupt or misuse it.",
    ],
  },
  { type: "h2", text: "4. Accuracy and estimates" },
  {
    type: "p",
    text: "Tax slabs, rules and calculations change and may contain errors or simplifications. We make reasonable efforts to keep them current but do not warrant that any figure is accurate, complete, or suitable for your situation. Always confirm before relying on a number.",
  },
  { type: "h2", text: "5. Privacy" },
  {
    type: "p",
    text: "Your use of LabhPay is also governed by our Privacy Policy, which explains how we handle your data.",
  },
  { type: "h2", text: "6. Intellectual property" },
  {
    type: "p",
    text: "The LabhPay name, design, content and software are owned by us. You may use the service for your personal, non-commercial purposes only.",
  },
  { type: "h2", text: "7. Limitation of liability" },
  {
    type: "p",
    text: "To the maximum extent permitted by law, LabhPay is provided “as is” without warranties of any kind, and we are not liable for any indirect, incidental, or consequential loss, or for decisions made based on the information provided. Your use of the service is at your own discretion and risk.",
  },
  { type: "h2", text: "8. Termination" },
  {
    type: "p",
    text: "You may stop using LabhPay at any time and request account deletion. We may suspend or terminate access if these terms are breached.",
  },
  { type: "h2", text: "9. Governing law" },
  {
    type: "p",
    text: "These terms are governed by the laws of India, and the courts of India shall have jurisdiction over any disputes.",
  },
  { type: "h2", text: "10. Contact" },
  {
    type: "p",
    text: `Questions about these terms? Email us at ${GRIEVANCE_EMAIL}.`,
  },
];
