import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { PrivacyBanner } from "@/components/landing/PrivacyBanner";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LabhPay — Understand your credit card bills",
    template: "%s · LabhPay",
  },
  description:
    "A smart financial intelligence platform for Indian credit card users. Privacy-first. Auto-deleted after your session.",
  metadataBase: new URL("https://labhpay.com"),
  applicationName: "LabhPay",
  authors: [{ name: "LabhPay" }],
  keywords: [
    "credit card statement analysis",
    "Indian credit cards",
    "spending insights",
    "privacy-first finance",
  ],
  openGraph: {
    title: "LabhPay — Understand your credit card bills",
    description:
      "Intelligent insights for Indian credit card statements. Your data is processed securely and deleted after your session.",
    type: "website",
    url: "https://labhpay.com",
    siteName: "LabhPay",
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
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>
        <AuthProvider>
          {children}
          <PrivacyBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
