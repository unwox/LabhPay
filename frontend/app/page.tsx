import type { Metadata } from "next";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { BanksStrip } from "@/components/landing/BanksStrip";
import { PrivacyCallout } from "@/components/landing/PrivacyCallout";
import { FAQ, FAQ_ITEMS } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Credit Card Statement Analyzer & Financial Tools for India",
  description:
    "LabhPay is your private financial co-pilot for India. Analyze credit card & bank statements for hidden charges and EMIs, plus free income tax, EMI, SIP and HRA calculators. Auto-deleted.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const softwareLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "LabhPay",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: "https://labhpay.com",
    description:
      "Free credit card statement analyzer for India. Spot hidden charges, recurring subscriptions, EMIs and spending insights. Privacy-first and auto-deleted.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    featureList: [
      "Hidden charges detection (finance, GST, late fees)",
      "Recurring subscription finder",
      "EMI tracker",
      "Credit utilization estimate",
      "Category-wise spending breakdown",
      "Form 16 tax toolkit (old vs new regime)",
      "Income tax, EMI, SIP and HRA calculators",
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <Nav />
      <Hero />
      <TrustStrip />
      <Features />
      <HowItWorks />
      <BanksStrip />
      <PrivacyCallout />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
