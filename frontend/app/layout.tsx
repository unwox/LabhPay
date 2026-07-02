import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "@/lib/auth-context";
import { PrivacyBanner } from "@/components/landing/PrivacyBanner";
import { ConsentGate } from "@/components/consent/ConsentGate";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LabhPay — Your Private Financial Co-pilot for India",
    template: "%s · LabhPay",
  },
  description:
    "LabhPay is a privacy-first financial assistant for India: analyze credit card & bank statements for hidden charges and EMIs, and use free income tax, EMI, SIP and HRA calculators. Auto-deleted.",
  metadataBase: new URL("https://labhpay.com"),
  applicationName: "LabhPay",
  authors: [{ name: "LabhPay" }],
  creator: "LabhPay",
  publisher: "LabhPay",
  category: "finance",
  keywords: [
    "credit card statement analyzer",
    "credit card statement analysis",
    "analyze credit card statement online",
    "understand credit card bill",
    "hidden charges on credit card",
    "credit card finance charges",
    "credit card spending tracker",
    "recurring subscriptions tracker",
    "credit card EMI tracker",
    "credit utilization checker",
    "how to read SBI credit card statement",
    "how to read HDFC credit card statement",
    "how to read ICICI credit card statement",
    "minimum amount due meaning",
    "Indian credit cards",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Credit Card Statement Analyzer for India | LabhPay",
    description:
      "Upload your Indian credit card statement and instantly see hidden charges, recurring subscriptions, EMIs and where your money goes. Private & auto-deleted.",
    type: "website",
    url: "https://labhpay.com",
    siteName: "LabhPay",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Credit Card Statement Analyzer for India | LabhPay",
    description:
      "Spot hidden charges, recurring subscriptions and EMIs in your credit card statement. Free, private, auto-deleted.",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF8F4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "LabhPay",
    url: "https://labhpay.com",
    logo: "https://labhpay.com/opengraph-image",
    description:
      "LabhPay is a privacy-first credit card statement analyzer for India that surfaces hidden charges, recurring subscriptions, EMIs and spending insights.",
    areaServed: "IN",
  };
  const siteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "LabhPay",
    url: "https://labhpay.com",
    inLanguage: "en-IN",
  };

  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }}
        />
        <AuthProvider>
          {children}
          <PrivacyBanner />
          <ConsentGate />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
