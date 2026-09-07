import { ImageResponse } from "next/og";

export const alt = "ResolvDesk - Autonomous Multi-Tenant AI Support Platform";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#09090b",
          backgroundImage:
            "radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.15), transparent 40%), radial-gradient(circle at 90% 80%, rgba(168, 85, 247, 0.15), transparent 40%)",
          padding: "60px 80px",
          color: "#fafafa",
          fontFamily: "system-ui, -apple-system, sans-serif",
          border: "8px solid #18181b",
          boxSizing: "border-box",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: "#4f46e5",
                color: "#ffffff",
                fontSize: "24px",
                fontWeight: 700,
                boxShadow: "0 0 24px rgba(79, 70, 229, 0.5)",
              }}
            >
              R
            </div>
            <span
              style={{
                fontSize: "28px",
                fontWeight: 700,
                letterSpacing: "-0.5px",
                color: "#ffffff",
              }}
            >
              ResolvDesk
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 18px",
              borderRadius: "9999px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              fontSize: "14px",
              fontWeight: 600,
              color: "#a1a1aa",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            Autonomous AI Support
          </div>
        </div>

        {/* Main Content Area */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            maxWidth: "980px",
          }}
        >
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-1.5px",
              color: "#ffffff",
              margin: 0,
            }}
          >
            Ground your storefront support in real knowledge.
          </h1>
          <p
            style={{
              fontSize: "24px",
              lineHeight: 1.4,
              color: "#a1a1aa",
              margin: 0,
            }}
          >
            Multi-tenant AI support agent platform featuring grounded RAG,
            instant embeddable widget, and real-time ticket escalation.
          </p>
        </div>

        {/* Badges / Tech Highlights */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            paddingTop: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "12px",
            }}
          >
            {["Grounded RAG", "1-Line Storefront Widget", "Human Escalation", "Multi-Tenant"].map(
              (pill) => (
                <div
                  key={pill}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(79, 70, 229, 0.15)",
                    border: "1px solid rgba(99, 102, 241, 0.3)",
                    color: "#c7d2fe",
                    fontSize: "15px",
                    fontWeight: 500,
                  }}
                >
                  {pill}
                </div>
              )
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "16px",
              color: "#71717a",
            }}
          >
            resolvdesk.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
