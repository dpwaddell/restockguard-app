const TABS = [
  { key: "home",      label: "Dashboard",  href: "/app" },
  { key: "waitlists", label: "Waitlists",  href: "/app/waitlists" },
  { key: "products",  label: "Products",   href: "/app/products" },
  { key: "styling",   label: "Styling",    href: "/app/styling" },
  { key: "settings",  label: "Settings",   href: "/app/settings" },
  { key: "upgrade",   label: "Upgrade",    href: "/app/upgrade" },
];

export function PageHeader({ currentTab, plan }) {
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
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "10px",
            backgroundColor: "#008060",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "18px",
            fontWeight: "800",
            flexShrink: 0,
            letterSpacing: "-0.5px",
          }}
        >
          RG
        </div>
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
            <a
              key={tab.key}
              href={tab.href}
              style={{
                display: "inline-block",
                padding: "8px 14px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: isActive ? "600" : "500",
                textDecoration: "none",
                backgroundColor: isActive
                  ? "#1a1a1a"
                  : isUpgrade && plan === "FREE"
                  ? "#008060"
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
            </a>
          );
        })}
      </nav>
    </div>
  );
}
