const PLAN_HIERARCHY = ["FREE", "STARTER", "GROWTH", "PREMIUM"];
const PLAN_LABELS = { FREE: "Free", STARTER: "Starter", GROWTH: "Growth", PREMIUM: "Premium" };

export function UpgradePrompt({ feature, requiredPlan, currentPlan }) {
  if (PLAN_HIERARCHY.indexOf(currentPlan) >= PLAN_HIERARCHY.indexOf(requiredPlan)) return null;

  return (
    <s-banner tone="warning">
      <s-paragraph>
        This feature requires {PLAN_LABELS[requiredPlan]} — upgrade to unlock {feature}.{" "}
        <a href="/app/upgrade" style={{ color: "inherit", fontWeight: "600" }}>
          Upgrade now
        </a>
      </s-paragraph>
    </s-banner>
  );
}
