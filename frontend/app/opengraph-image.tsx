import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "LabhPay — Your private financial co-pilot for India";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FAF8F4",
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#0B5E4F",
            }}
          />
          <div style={{ fontSize: 34, fontWeight: 700, color: "#1A1A1A" }}>
            LabhPay
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#1A1A1A",
              lineHeight: 1.1,
              maxWidth: 900,
            }}
          >
            Your money, finally clear.
          </div>
          <div style={{ fontSize: 30, color: "#5C5C57", maxWidth: 880 }}>
            Analyze statements, decode your Form 16 &amp; taxes, and use free
            financial calculators. Privacy-first. Auto-deleted after your session.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 26, color: "#0B5E4F", fontWeight: 600 }}>
            labhpay.com
          </div>
          <div style={{ fontSize: 24, color: "#9A9A93" }}>
            · statements · tax · calculators
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
