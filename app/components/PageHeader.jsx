import { useNavigate } from "react-router";

const TABS = [
  { key: "home",      label: "Dashboard",  href: "/app" },
  { key: "waitlists", label: "Waitlists",  href: "/app/waitlists" },
  { key: "products",  label: "Products",   href: "/app/products" },
  { key: "styling",   label: "Styling",    href: "/app/styling" },
  { key: "settings",  label: "Settings",   href: "/app/settings" },
  { key: "upgrade",   label: "Upgrade",    href: "/app/upgrade" },
];

export function PageHeader({ currentTab, plan }) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        backgroundColor: "#fff",
        borderBottom: "1px solid #e1e3e5",
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "4px",
      }}
    >
      {/* Left: icon + name + tagline */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <img
          src="/logo.png"
          width="48"
          height="48"
          style={{ borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}
          alt="RestockGuard"
        />
        <div>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#202223", lineHeight: 1.2 }}>
            RestockGuard
          </div>
          <div style={{ fontSize: "13px", color: "#6d7175", marginTop: "2px" }}>
            Automated back-in-stock alerts &amp; waitlists
          </div>
        </div>
      </div>

      {/* Right: tab navigation */}
      <nav style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {TABS.map((tab) => {
          const isActive = tab.key === currentTab;
          const isUpgrade = tab.key === "upgrade";
          return (
            <button
              key={tab.key}
              onClick={() => navigate(tab.href)}
              style={{
                display: "inline-block",
                padding: "8px 14px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: isActive ? "600" : "500",
                border: "none",
                cursor: "pointer",
                backgroundColor: isActive
                  ? "#1a1a1a"
                  : isUpgrade && plan === "FREE"
                  ? "#1a56db"
                  : "transparent",
                color: isActive
                  ? "#fff"
                  : isUpgrade && plan === "FREE"
                  ? "#fff"
                  : "#6d7175",
                transition: "background-color 0.15s, color 0.15s",
              }}
            >
              {isUpgrade && plan !== "FREE"
                ? `Plan: ${plan.charAt(0) + plan.slice(1).toLowerCase()}`
                : tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
