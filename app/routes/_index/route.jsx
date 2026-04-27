import { redirect } from "react-router";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return null;
};

export default function Index() {
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#1a1a2e", minHeight: "100vh", backgroundColor: "#f8f9fc" }}>

      {/* Nav */}
      <nav style={{ backgroundColor: "#fff", borderBottom: "1px solid #e8eaed", padding: "0 24px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", backgroundColor: "#1a56db", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
          </div>
          <span style={{ fontWeight: "700", fontSize: "17px", letterSpacing: "-0.3px" }}>RestockGuard</span>
        </div>
        <a href="/privacy" style={{ fontSize: "14px", color: "#6b7280", textDecoration: "none" }}>Privacy Policy</a>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "80px 24px 64px", textAlign: "center" }}>
        <div style={{ display: "inline-block", backgroundColor: "#eff6ff", color: "#1d4ed8", fontSize: "13px", fontWeight: "600", padding: "5px 14px", borderRadius: "20px", marginBottom: "24px", letterSpacing: "0.02em" }}>
          Shopify App
        </div>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: "800", lineHeight: "1.15", margin: "0 0 20px", letterSpacing: "-1px", color: "#111827" }}>
          Never lose a sale to<br />out-of-stock products
        </h1>
        <p style={{ fontSize: "18px", color: "#4b5563", lineHeight: "1.65", margin: "0 0 40px", maxWidth: "540px", marginLeft: "auto", marginRight: "auto" }}>
          RestockGuard lets customers sign up for restock alerts on sold-out products.
          When inventory returns, they're notified automatically — bringing them straight back to buy.
        </p>
        <a
          href="#"
          style={{
            display: "inline-block",
            backgroundColor: "#1a56db",
            color: "#fff",
            fontWeight: "700",
            fontSize: "16px",
            padding: "14px 32px",
            borderRadius: "8px",
            textDecoration: "none",
            boxShadow: "0 4px 14px rgba(26,86,219,0.35)",
            letterSpacing: "-0.1px",
          }}
        >
          Install on Shopify
        </a>
        <p style={{ marginTop: "14px", fontSize: "13px", color: "#9ca3af" }}>Free plan available · No credit card required</p>
      </div>

      {/* Features */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
          {[
            {
              icon: "🔔",
              title: "Automatic restock alerts",
              body: "Customers subscribe once. When stock returns, they receive an email instantly — no manual work required.",
            },
            {
              icon: "🎯",
              title: "Variant-level tracking",
              body: "Track demand at the size, colour, or option level so you know exactly which variants to reorder.",
            },
            {
              icon: "🎨",
              title: "Fully customisable widget",
              body: "Match the notify button to your brand with custom colours, text, and border radius — no code needed.",
            },
            {
              icon: "📈",
              title: "Recover lost revenue",
              body: "See which products are losing the most sales and track conversions from alert to purchase.",
            },
          ].map(({ icon, title, body }) => (
            <div
              key={title}
              style={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ fontSize: "28px", marginBottom: "12px" }}>{icon}</div>
              <div style={{ fontWeight: "700", fontSize: "15px", color: "#111827", marginBottom: "8px" }}>{title}</div>
              <div style={{ fontSize: "14px", color: "#6b7280", lineHeight: "1.6" }}>{body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #e5e7eb", backgroundColor: "#fff", padding: "24px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: "13px", color: "#9ca3af" }}>
          &copy; {new Date().getFullYear()} RestockGuard &nbsp;·&nbsp;{" "}
          <a href="/privacy" style={{ color: "#6b7280", textDecoration: "none" }}>Privacy Policy</a>
        </p>
      </footer>
    </div>
  );
}
