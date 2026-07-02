import type { Post } from "@/lib/blog/types";

/**
 * SEO bank guides. Each post targets a cluster of high-intent navigational
 * keywords (login / apply / status / customer care) for one issuer, serves the
 * searcher's actual need, and funnels to LabhPay's statement analyzer.
 *
 * IMPORTANT (site owner): customer-care numbers and portal URLs occasionally
 * change. They are presented here with a "verify on the official site" notice,
 * but please re-confirm each against the bank's official website before relying
 * on them, and update the dateModified when you do.
 */

const FRAUD_NOTE =
  "No bank will ever ask for your full card number, CVV, PIN, OTP, or expiry date over a phone call, SMS, email, or WhatsApp. If anyone does, it is a scam — hang up and report it.";

export const POSTS: Post[] = [
  // ----------------------------------------------------------------
  // BANK OF BARODA (BOB)
  // ----------------------------------------------------------------
  {
    slug: "bob-credit-card-login-apply-status-customer-care",
    bank: "Bank of Baroda",
    title:
      "BOB Credit Card: Login, Apply, Check Status & Customer Care (2026 Guide)",
    metaTitle: "BOB Credit Card — Login, Apply, Status & Customer Care",
    description:
      "Everything about your Bank of Baroda (BOB) credit card: how to log in, apply online, check application status, BOB Eterna card details and customer care numbers.",
    focusKeyword: "bob credit card",
    keywords: [
      "bob credit card",
      "bob credit card login",
      "bob card",
      "bob card login",
      "bob credit card apply",
      "bob credit card status",
      "bob eterna credit card",
      "bob credit card customer care",
    ],
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    readingMinutes: 6,
    blocks: [
      {
        type: "p",
        text: "Bank of Baroda (BOB) credit cards are issued and serviced by BOBCARD Ltd (formerly BOB Financial). Whether you want to log in to your BOB card account, apply for a new card, check your application status, or reach customer care, this guide walks you through each step — and shows you how to instantly make sense of your BOB credit card statement once it arrives.",
      },
      { type: "h2", text: "How to log in to your BOB credit card account" },
      {
        type: "p",
        text: "You can manage your Bank of Baroda credit card online or through the mobile app. To log in:",
      },
      {
        type: "ol",
        items: [
          "Go to the official BOBCARD portal at bobcard.co.in (or open the BOBCARD mobile app).",
          "Click ‘Login’ and choose ‘Cardholder Login’.",
          "Enter your registered mobile number or card number and your password / OTP.",
          "First-time users can click ‘Register’ to set up online access using their card number and registered mobile.",
        ],
      },
      {
        type: "callout",
        tone: "info",
        title: "Two different logins",
        text: "Your BOB credit card login (bobcard.co.in) is separate from Bank of Baroda net banking (bankofbaroda.in). Use the BOBCARD portal for anything related to your credit card.",
      },
      { type: "h2", text: "How to apply for a BOB credit card" },
      {
        type: "ol",
        items: [
          "Visit bobcard.co.in and open the ‘Cards’ section to compare cards.",
          "Pick a card that fits your spending (lifestyle, fuel, travel, or premium).",
          "Click ‘Apply Now’ and fill in your PAN, Aadhaar/KYC, income and contact details.",
          "Complete KYC (often via Aadhaar OTP) and submit. Existing Bank of Baroda customers may get a pre-approved offer with faster approval.",
        ],
      },
      { type: "h2", text: "How to check your BOB credit card application status" },
      {
        type: "p",
        text: "After you apply, you can track your BOB credit card status online:",
      },
      {
        type: "ul",
        items: [
          "Go to bobcard.co.in and look for ‘Track Application’.",
          "Enter your application reference number and registered mobile number.",
          "You can also call BOBCARD customer care (below) to ask for a status update.",
        ],
      },
      { type: "h2", text: "BOB Eterna credit card" },
      {
        type: "p",
        text: "The BOB Eterna is one of Bank of Baroda’s most popular premium cards. It’s positioned as a rewards-and-lifestyle card with accelerated reward points on online spends, travel and dining, plus complimentary lounge access on eligible spends. Always check the current fees, reward rates and welcome benefits on the official BOBCARD page before applying, as terms change.",
      },
      { type: "h2", text: "BOB credit card customer care" },
      {
        type: "p",
        text: "The most reliable number is the one printed on the back of your card and on your statement. For reference, BOBCARD’s commonly published 24x7 credit card helpline is:",
      },
      {
        type: "table",
        headers: ["Purpose", "Number (verify on bobcard.co.in)"],
        rows: [
          ["BOBCARD credit card customer care", "1800 103 1006"],
          ["Bank of Baroda general helpline", "1800 5700 / 1800 102 4455"],
        ],
      },
      {
        type: "callout",
        tone: "warn",
        title: "Avoid fake customer-care numbers",
        text: FRAUD_NOTE + " Always confirm the number on bobcard.co.in or the reverse of your card — never trust numbers from random search ads or social media.",
      },
      {
        type: "cta",
        text: "Got your Bank of Baroda statement? Upload it to LabhPay and instantly see your finance charges, GST, EMIs, recurring subscriptions and total due — no manual reading needed. It’s free, and your statement is auto-deleted after your session.",
      },
      { type: "h2", text: "How to read your BOB credit card statement" },
      {
        type: "p",
        text: "Your BOB statement shows your total amount due, minimum amount due, payment due date, finance/interest charges, GST, and a list of transactions. The two numbers that matter most are the total amount due (pay this in full to stay interest-free) and the due date. Paying only the minimum keeps your card active but charges interest on the rest. LabhPay reads all of this automatically and tells you exactly what each charge is costing you.",
      },
    ],
    faqs: [
      {
        q: "What is the BOB credit card customer care number?",
        a: "BOBCARD’s commonly published 24x7 credit card helpline is 1800 103 1006. Always confirm the current number on the official site bobcard.co.in or on the back of your card, and never share your OTP, CVV or PIN with a caller.",
      },
      {
        q: "How do I log in to my BOB credit card?",
        a: "Go to bobcard.co.in (or the BOBCARD app), click Login → Cardholder Login, and sign in with your registered mobile number or card number. First-time users can register using their card number and registered mobile.",
      },
      {
        q: "How can I check my BOB credit card application status?",
        a: "Use the ‘Track Application’ option on bobcard.co.in with your application reference number and registered mobile number, or call BOBCARD customer care for an update.",
      },
    ],
  },

  // ----------------------------------------------------------------
  // HDFC
  // ----------------------------------------------------------------
  {
    slug: "hdfc-credit-card-mycards-login-apply-customer-care",
    bank: "HDFC Bank",
    title:
      "HDFC Credit Card: MyCards Login, Apply Online & Customer Care Number",
    metaTitle: "HDFC Credit Card — MyCards Login, Apply & Customer Care",
    description:
      "How to use HDFC MyCards to log in, apply for an HDFC Bank credit card online, check status and reach HDFC credit card customer care. Plus how to read your statement.",
    focusKeyword: "hdfc credit card login",
    keywords: [
      "hdfc my card",
      "hdfc credit card login",
      "my card hdfc",
      "my cards hdfc",
      "hdfc credit card customer care",
      "hdfc credit card customer care number",
      "hdfc card",
      "my hdfc card",
      "hdfc bank credit card apply",
    ],
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    readingMinutes: 6,
    blocks: [
      {
        type: "p",
        text: "If you have an HDFC Bank credit card, ‘HDFC MyCards’ is the quickest way to manage it — view your statement, check your available limit, pay your bill, and convert spends to EMI. This guide covers HDFC MyCards login, how to apply for an HDFC credit card, customer care numbers, and how to actually understand your statement.",
      },
      { type: "h2", text: "HDFC MyCards login (my card / my cards HDFC)" },
      {
        type: "p",
        text: "HDFC MyCards is HDFC Bank’s dedicated credit card portal. To log in:",
      },
      {
        type: "ol",
        items: [
          "Visit the HDFC MyCards portal at mycards.hdfcbank.com.",
          "Enter your credit card number and the OTP sent to your registered mobile number.",
          "You’ll see your current balance, available limit, statement, reward points and EMI options.",
        ],
      },
      {
        type: "callout",
        tone: "info",
        title: "MyCards vs NetBanking",
        text: "You can also manage your card inside HDFC NetBanking and the HDFC Bank mobile app. MyCards (mycards.hdfcbank.com) is the fastest if you only want to check or pay your credit card without full net banking access.",
      },
      { type: "h2", text: "How to apply for an HDFC Bank credit card" },
      {
        type: "ol",
        items: [
          "Go to hdfcbank.com and open Cards → Credit Cards.",
          "Compare cards (lifestyle, travel, fuel, shopping, premium) and check eligibility.",
          "Click ‘Apply Now’, enter your PAN, income, employment and contact details, and complete KYC.",
          "Existing HDFC Bank customers often see pre-approved offers in NetBanking or the app for instant approval.",
        ],
      },
      { type: "h2", text: "How to check your HDFC credit card application status" },
      {
        type: "ul",
        items: [
          "Use the ‘Track Application / Know Your Application Status’ tool on hdfcbank.com.",
          "Enter your application reference number or registered mobile/PAN as prompted.",
          "Or call HDFC credit card customer care for an update.",
        ],
      },
      { type: "h2", text: "HDFC credit card customer care number" },
      {
        type: "p",
        text: "The authoritative number is on the reverse of your card and on your statement. HDFC Bank also publishes phone-banking numbers for credit cards:",
      },
      {
        type: "table",
        headers: ["Purpose", "Number (verify on hdfcbank.com)"],
        rows: [
          ["HDFC credit card customer care", "1800 202 6161 / 1860 267 6161"],
          ["HDFC Bank PhoneBanking", "Number on the back of your card / hdfcbank.com"],
        ],
      },
      {
        type: "callout",
        tone: "warn",
        title: "Beware of fake ‘HDFC customer care’ numbers",
        text: FRAUD_NOTE + " Search results and social media often list fake numbers — only trust the number on hdfcbank.com or the back of your card.",
      },
      {
        type: "cta",
        text: "Logged into MyCards and downloaded your statement? Upload the PDF to LabhPay to instantly see your HDFC finance charges, GST, EMIs and recurring subscriptions — and exactly how much paying only the minimum due would cost you.",
      },
      { type: "h2", text: "How to read your HDFC credit card statement" },
      {
        type: "p",
        text: "An HDFC statement lists your total amount due, minimum amount due, payment due date, finance charges, and your transactions. Pay the total amount due by the due date to avoid interest; the minimum due only keeps the card current while interest accrues on the balance. LabhPay decodes every line — including hidden finance and GST charges — in a few seconds.",
      },
    ],
    faqs: [
      {
        q: "What is HDFC MyCards?",
        a: "HDFC MyCards (mycards.hdfcbank.com) is HDFC Bank’s dedicated credit card portal where you can view your statement and available limit, pay your bill, redeem reward points and convert spends to EMI, by logging in with your card number and an OTP.",
      },
      {
        q: "What is the HDFC credit card customer care number?",
        a: "HDFC Bank’s commonly published credit card helpline numbers are 1800 202 6161 and 1860 267 6161. The most reliable number is always the one printed on the back of your card and on your statement — confirm on hdfcbank.com.",
      },
      {
        q: "How do I apply for an HDFC Bank credit card?",
        a: "Visit hdfcbank.com → Cards → Credit Cards, compare cards, click Apply Now, and complete the form and KYC. Existing customers may have pre-approved offers in NetBanking or the mobile app.",
      },
    ],
  },

  // ----------------------------------------------------------------
  // SBI
  // ----------------------------------------------------------------
  {
    slug: "sbi-credit-card-customer-care-24x7-login-apply",
    bank: "SBI Card",
    title:
      "SBI Credit Card: 24x7 Customer Care Toll-Free, Login & How to Apply",
    metaTitle: "SBI Credit Card — 24x7 Customer Care, Login & Apply",
    description:
      "SBI credit card 24x7 toll-free customer care numbers, how to log in to your SBI Card account, apply online, check status, and read your SBI Card statement.",
    focusKeyword: "sbi credit card",
    keywords: [
      "sbi credit card",
      "sbi credit card toll free number 24x7",
      "sbi card login",
      "sbi credit card apply",
      "sbi credit card customer care",
    ],
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    readingMinutes: 6,
    blocks: [
      {
        type: "p",
        text: "SBI Card is one of India’s largest credit card issuers. This guide covers the SBI credit card 24x7 toll-free customer care numbers, how to log in to your SBI Card account, how to apply, and how to quickly understand your SBI Card statement.",
      },
      { type: "h2", text: "SBI credit card toll-free number (24x7)" },
      {
        type: "p",
        text: "SBI Card runs a 24x7 helpline. The number on the back of your card and on your statement is always the authoritative one. Commonly published SBI Card customer care numbers are:",
      },
      {
        type: "table",
        headers: ["Purpose", "Number (verify on sbicard.com)"],
        rows: [
          ["SBI Card 24x7 helpline", "1860 180 1290 / 1860 500 1290"],
          ["From a non-registered phone", "Prefix your city STD code + 39 02 02 02"],
        ],
      },
      {
        type: "callout",
        tone: "warn",
        title: "Stay safe from fraud",
        text: FRAUD_NOTE + " SBI Card never asks for your OTP, CVV or PIN. Confirm helpline numbers only on sbicard.com.",
      },
      { type: "h2", text: "How to log in to your SBI Card account" },
      {
        type: "ol",
        items: [
          "Go to sbicard.com or open the SBI Card / SBI Card SPRINT app.",
          "Click ‘Login’ and enter your username/email and password.",
          "First-time users click ‘Register Now’ and verify using their card number and registered mobile.",
          "You can also manage your card on WhatsApp by sending ‘Hi’ to SBI Card’s official WhatsApp number listed on your statement.",
        ],
      },
      { type: "h2", text: "How to apply for an SBI credit card" },
      {
        type: "ol",
        items: [
          "Visit sbicard.com and browse cards by category (shopping, travel, fuel, lifestyle, premium).",
          "Check eligibility and click ‘Apply Now’.",
          "Enter your PAN, income and KYC details and submit; complete video/Aadhaar KYC if prompted.",
          "Track your application on sbicard.com under ‘Track Application’.",
        ],
      },
      {
        type: "cta",
        text: "Have your SBI Card statement PDF? Upload it to LabhPay to instantly see your total due, minimum due, finance charges, GST, EMIs (like Flexipay) and where your money went — free, private, and auto-deleted after your session.",
      },
      { type: "h2", text: "How to read your SBI Card statement" },
      {
        type: "p",
        text: "Your SBI Card statement shows the Total Amount Due, Minimum Amount Due, Payment Due Date, and a transactions table where each amount is marked C (credit), D (debit) or M (monthly EMI instalment). Watch the ‘Fee, Taxes & Interest Charges’ line — that’s the cost of carrying a balance. Pay the full Total Amount Due by the due date to avoid it. LabhPay highlights all of this automatically.",
      },
    ],
    faqs: [
      {
        q: "What is the SBI credit card 24x7 toll-free number?",
        a: "SBI Card’s commonly published 24x7 helpline is 1860 180 1290 / 1860 500 1290. From a non-registered phone you can prefix your city STD code to 39 02 02 02. Always confirm on sbicard.com or the back of your card, and never share your OTP or CVV.",
      },
      {
        q: "How do I log in to my SBI Card account?",
        a: "Go to sbicard.com or the SBI Card app, click Login and enter your username and password. New users can register using their card number and registered mobile number.",
      },
      {
        q: "How do I read the C, D and M marks on my SBI statement?",
        a: "On an SBI Card statement, C means a credit (payment/refund), D means a debit (a normal spend), and M means a monthly EMI instalment. LabhPay reads these automatically so you don’t have to.",
      },
    ],
  },

  // ----------------------------------------------------------------
  // ICICI
  // ----------------------------------------------------------------
  {
    slug: "icici-credit-card-customer-care-number-login-sapphiro",
    bank: "ICICI Bank",
    title:
      "ICICI Credit Card: Customer Care Number, Login & Sapphiro Card Guide",
    metaTitle: "ICICI Credit Card — Customer Care Number, Login & Sapphiro",
    description:
      "ICICI Bank credit card customer care numbers, how to log in via iMobile / internet banking, the ICICI Sapphiro card, and how to read your ICICI statement.",
    focusKeyword: "icici credit card customer care number",
    keywords: [
      "icici credit card customer care number",
      "icici credit card customer care",
      "icici bank credit card",
      "icici credit card",
      "icici sapphiro credit card",
    ],
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    readingMinutes: 6,
    blocks: [
      {
        type: "p",
        text: "Looking for the ICICI credit card customer care number, or help logging in and managing your ICICI Bank credit card? This guide has the official-style helpline details, login steps, an overview of the popular ICICI Sapphiro card, and how to read your statement in seconds.",
      },
      { type: "h2", text: "ICICI credit card customer care number" },
      {
        type: "p",
        text: "The number on the back of your card and on your statement is always the authoritative one. ICICI Bank’s widely published 24x7 customer care numbers are:",
      },
      {
        type: "table",
        headers: ["Purpose", "Number (verify on icicibank.com)"],
        rows: [
          ["ICICI Bank 24x7 customer care", "1800 1080"],
          ["ICICI credit cards helpline", "1860 120 7777"],
        ],
      },
      {
        type: "callout",
        tone: "warn",
        title: "Don’t fall for fake customer care",
        text: FRAUD_NOTE + " ICICI Bank never asks for your OTP, CVV, PIN or card number over a call. Verify any number on icicibank.com.",
      },
      { type: "h2", text: "How to log in and manage your ICICI credit card" },
      {
        type: "ol",
        items: [
          "Use the iMobile Pay app or ICICI Internet Banking at icicibank.com.",
          "Log in with your User ID and password (or app login / biometrics).",
          "Open the ‘Cards’ section to view your statement, available limit, reward points and to pay your bill.",
          "First-time users can register for internet banking using their card/account number and registered mobile.",
        ],
      },
      { type: "h2", text: "ICICI Sapphiro credit card" },
      {
        type: "p",
        text: "The ICICI Bank Sapphiro is a popular premium card offering reward points on spends, airport lounge access (domestic and limited international), dining discounts and travel benefits. It typically comes as a dual Visa + Mastercard set. Reward rates, fees and lounge benefits change, so confirm the latest details on icicibank.com before applying.",
      },
      { type: "h2", text: "How to apply for an ICICI Bank credit card" },
      {
        type: "ol",
        items: [
          "Visit icicibank.com → Cards → Credit Cards.",
          "Compare cards, check eligibility, and click ‘Apply Now’.",
          "Complete the application with PAN, income and KYC; existing customers may get instant pre-approved cards in iMobile.",
        ],
      },
      {
        type: "cta",
        text: "Downloaded your ICICI statement? Upload it to LabhPay to instantly see your finance charges, GST, EMIs, recurring subscriptions and total due — free and auto-deleted after your session.",
      },
      { type: "h2", text: "How to read your ICICI credit card statement" },
      {
        type: "p",
        text: "Your ICICI statement shows the total amount due, minimum amount due, due date, finance charges and your transactions. Pay the total amount due by the due date to stay interest-free. LabhPay reads the whole statement automatically and flags hidden charges, duplicate transactions and recurring subscriptions.",
      },
    ],
    faqs: [
      {
        q: "What is the ICICI credit card customer care number?",
        a: "ICICI Bank’s widely published 24x7 customer care number is 1800 1080, with a credit-cards helpline at 1860 120 7777. The most reliable number is on the back of your card and your statement — confirm on icicibank.com and never share your OTP or CVV.",
      },
      {
        q: "What is the ICICI Sapphiro credit card?",
        a: "The ICICI Sapphiro is a premium ICICI Bank credit card offering reward points, airport lounge access, and dining and travel benefits, usually as a dual Visa + Mastercard set. Check current fees and benefits on icicibank.com.",
      },
      {
        q: "How do I log in to my ICICI credit card?",
        a: "Use the iMobile Pay app or ICICI Internet Banking at icicibank.com, log in with your User ID and password, and open the Cards section to view your statement and pay your bill.",
      },
    ],
  },

  // ----------------------------------------------------------------
  // AXIS
  // ----------------------------------------------------------------
  {
    slug: "axis-bank-credit-card-status-customer-care-flipkart",
    bank: "Axis Bank",
    title:
      "Axis Bank Credit Card: Application Status, Customer Care & Flipkart Axis Card",
    metaTitle: "Axis Bank Credit Card — Status, Customer Care & Flipkart Axis",
    description:
      "Check your Axis Bank credit card application status, find the Axis credit card customer care number, learn about the Flipkart Axis Bank card, and read your statement.",
    focusKeyword: "axis bank credit card status",
    keywords: [
      "axis credit card customer care number",
      "flipkart axis bank credit card",
      "axis bank credit card status",
      "axis credit card status",
      "axis bank credit card application status",
    ],
    datePublished: "2026-06-01",
    dateModified: "2026-06-01",
    readingMinutes: 6,
    blocks: [
      {
        type: "p",
        text: "Whether you just applied and want to check your Axis Bank credit card application status, need the customer care number, or are considering the Flipkart Axis Bank card, this guide covers it all — plus how to understand your Axis statement once it arrives.",
      },
      { type: "h2", text: "How to check your Axis Bank credit card application status" },
      {
        type: "ol",
        items: [
          "Go to axisbank.com and find ‘Track Application Status’ (under Credit Cards / Help).",
          "Enter your application reference number, or your registered mobile number / PAN and date of birth as prompted.",
          "Your status will show as in-process, approved, dispatched or declined.",
          "You can also call Axis credit card customer care for an update.",
        ],
      },
      {
        type: "callout",
        tone: "info",
        title: "Applied via Flipkart?",
        text: "If you applied for the Flipkart Axis Bank credit card through Flipkart, you can also track the status inside your Flipkart account under the credit-card section, in addition to axisbank.com.",
      },
      { type: "h2", text: "Axis Bank credit card customer care number" },
      {
        type: "p",
        text: "The authoritative number is on the back of your card and your statement. Axis Bank’s widely published 24x7 credit card helplines are:",
      },
      {
        type: "table",
        headers: ["Purpose", "Number (verify on axisbank.com)"],
        rows: [
          ["Axis Bank credit card customer care", "1860 419 5555 / 1860 500 5555"],
        ],
      },
      {
        type: "callout",
        tone: "warn",
        title: "Watch out for fraud",
        text: FRAUD_NOTE + " Axis Bank never asks for your OTP, CVV or PIN. Confirm any helpline number on axisbank.com.",
      },
      { type: "h2", text: "Flipkart Axis Bank credit card" },
      {
        type: "p",
        text: "The Flipkart Axis Bank credit card is a popular cashback card co-created with Flipkart. It’s known for unlimited cashback on Flipkart, Myntra and Cleartrip, additional cashback on preferred partners, and a smaller flat cashback on most other spends, along with milestone and welcome benefits. Cashback rates and fees can change, so check the latest terms on axisbank.com or Flipkart before applying.",
      },
      { type: "h2", text: "How to log in and manage your Axis credit card" },
      {
        type: "ul",
        items: [
          "Use the Axis Mobile app or the dedicated Axis credit card app.",
          "Log in / register with your card number and registered mobile, then view your statement, limit and reward points, and pay your bill.",
          "Internet banking at axisbank.com also lets you manage your card.",
        ],
      },
      {
        type: "cta",
        text: "Got your Axis Bank statement? Upload it to LabhPay to instantly see your cashback, finance charges, GST, EMIs and total due — and how much paying only the minimum would cost you. Free and auto-deleted.",
      },
      { type: "h2", text: "How to read your Axis Bank credit card statement" },
      {
        type: "p",
        text: "Your Axis statement shows the total amount due, minimum amount due, due date, finance charges and transactions. Pay the total amount due by the due date to avoid interest. LabhPay reads it all automatically and highlights hidden charges and recurring subscriptions, so you always know what you’re paying for.",
      },
    ],
    faqs: [
      {
        q: "How do I check my Axis Bank credit card application status?",
        a: "Go to axisbank.com → Track Application Status, then enter your application reference number (or registered mobile/PAN and date of birth). If you applied via Flipkart, you can also track it in your Flipkart account.",
      },
      {
        q: "What is the Axis Bank credit card customer care number?",
        a: "Axis Bank’s widely published 24x7 credit card customer care numbers are 1860 419 5555 and 1860 500 5555. The most reliable number is on the back of your card and your statement — confirm on axisbank.com and never share your OTP or CVV.",
      },
      {
        q: "What are the benefits of the Flipkart Axis Bank credit card?",
        a: "It offers unlimited cashback on Flipkart, Myntra and Cleartrip, extra cashback on preferred partners, and a flat cashback on most other spends, plus welcome and milestone benefits. Check current rates on axisbank.com.",
      },
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function allSlugs(): string[] {
  return POSTS.map((p) => p.slug);
}
