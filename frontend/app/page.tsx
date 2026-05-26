import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { InsightsPreview } from "@/components/landing/InsightsPreview";
import { BanksStrip } from "@/components/landing/BanksStrip";
import { PrivacyCallout } from "@/components/landing/PrivacyCallout";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <main className="relative">
      <Nav />
      <Hero />
      <TrustStrip />
      <DashboardPreview />
      <HowItWorks />
      <InsightsPreview />
      <BanksStrip />
      <PrivacyCallout />
      <Footer />
    </main>
  );
}
