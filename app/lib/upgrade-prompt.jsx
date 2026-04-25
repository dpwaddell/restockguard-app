import { useNavigate } from "react-router";

const PLAN_HIERARCHY = ["FREE", "STARTER", "GROWTH", "PREMIUM"];
const PLAN_LABELS = { FREE: "Free", STARTER: "Starter", GROWTH: "Growth", PREMIUM: "Premium" };

export function UpgradePrompt({ feature, requiredPlan, currentPlan }) {
  const navigate = useNavigate();
  if (PLAN_HIERARCHY.indexOf(currentPlan) >= PLAN_HIERARCHY.indexOf(requiredPlan)) return null;

  return (
    <s-banner tone="warning">
      <s-paragraph>
        This feature requires {PLAN_LABELS[requiredPlan]} — upgrade to unlock {feature}.{" "}
        <button
          onClick={() => navigate("/app/upgrade")}
          style={{ color: "inherit", fontWeight: "600", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "inherit" }}
        >
          Upgrade now
        </button>
      </s-paragraph>
    </s-banner>
  );
}
