import { useLoaderData, useFetcher, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate, prisma } from "../shopify.server";
import { PageHeader } from "../components/PageHeader";

const DEFAULTS = {
  buttonText: "Notify me when back in stock",
  successMessage: "You're on the list! We'll email you when this is back.",
  emailPlaceholder: "Enter your email address",
  preorderButtonText: "Reserve yours now",
  fromName: "RestockGuard",
  fromEmail: "alerts@sample-guard.com",
  showBranding: true,
};

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
    select: { settings: true, plan: true },
  });

  return {
    settings: { ...DEFAULTS, ...(shop?.settings ?? {}) },
    plan: shop?.plan ?? "FREE",
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
    select: { settings: true, plan: true },
  });

  const plan = shop?.plan ?? "FREE";
  const current = shop?.settings ?? {};

  await prisma.shop.update({
    where: { shopDomain: session.shop },
    data: {
      settings: {
        ...current,
        buttonText: formData.get("buttonText") || DEFAULTS.buttonText,
        successMessage: formData.get("successMessage") || DEFAULTS.successMessage,
        emailPlaceholder: formData.get("emailPlaceholder") || DEFAULTS.emailPlaceholder,
        preorderButtonText: formData.get("preorderButtonText") || DEFAULTS.preorderButtonText,
        fromName: formData.get("fromName") || DEFAULTS.fromName,
        fromEmail: formData.get("fromEmail") || DEFAULTS.fromEmail,
        // FREE plan always shows branding
        showBranding: plan === "FREE" ? true : formData.get("showBranding") === "on",
      },
    },
  });

  return { saved: true };
};

export default function SettingsPage() {
  const { settings, plan } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const saved = fetcher.data?.saved;
  const saving = fetcher.state !== "idle";

  return (
    <s-page heading="Settings">
      <PageHeader currentTab="settings" plan={plan} />
      {saved && (
        <s-banner tone="success">
          <s-paragraph>Settings saved successfully ✓</s-paragraph>
        </s-banner>
      )}

      <fetcher.Form method="post">
        <s-section heading="💬 Custom messages">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Field
              label="Notify button text"
              name="buttonText"
              defaultValue={settings.buttonText}
            />
            <Field
              label="Success message"
              name="successMessage"
              defaultValue={settings.successMessage}
            />
            <Field
              label="Email placeholder"
              name="emailPlaceholder"
              defaultValue={settings.emailPlaceholder}
            />
            <Field
              label="Preorder button text"
              name="preorderButtonText"
              defaultValue={settings.preorderButtonText}
            />
          </div>
        </s-section>

        <s-section heading="📧 Email settings">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Field label="From name" name="fromName" defaultValue={settings.fromName} />
            <Field
              label="From email"
              name="fromEmail"
              type="email"
              defaultValue={settings.fromEmail}
            />
          </div>
        </s-section>

        <s-section heading="🎨 Widget settings">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="checkbox"
                id="showBranding"
                name="showBranding"
                defaultChecked={settings.showBranding}
                disabled={plan === "FREE"}
                style={{
                  width: "16px",
                  height: "16px",
                  cursor: plan === "FREE" ? "not-allowed" : "pointer",
                  accentColor: "#1a56db",
                }}
              />
              <label htmlFor="showBranding" style={{ fontSize: "14px", color: "#202223" }}>
                Show "Powered by RestockGuard" branding on the widget
              </label>
              {plan === "FREE" && (
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 10px",
                    backgroundColor: "#f1f2f3",
                    color: "#6d7175",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    border: "1px solid #d1d5db",
                  }}
                >
                  <button onClick={() => navigate("/app/upgrade")} style={{ color: "#1a56db", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "12px" }}>
                    🔒 Upgrade to remove
                  </button>
                </span>
              )}
            </div>
          </div>
        </s-section>

        <s-section>
          <button
            type="submit"
            disabled={saving}
            style={{
              display: "block",
              width: "100%",
              maxWidth: "480px",
              padding: "12px 20px",
              backgroundColor: saving ? "#6d7175" : "#1a56db",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "15px",
              fontWeight: "700",
              cursor: saving ? "wait" : "pointer",
              transition: "background-color 0.15s",
            }}
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </s-section>
      </fetcher.Form>
    </s-page>
  );
}

function Field({ label, name, type = "text", defaultValue }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label htmlFor={name} style={{ fontSize: "14px", fontWeight: "600", color: "#202223" }}>
        {label}
      </label>
      <input
        id={name}
        type={type}
        name={name}
        defaultValue={defaultValue}
        style={inputStyle}
      />
    </div>
  );
}

const inputStyle = {
  padding: "9px 12px",
  borderRadius: "6px",
  border: "1px solid #c9cccf",
  fontSize: "14px",
  width: "100%",
  maxWidth: "480px",
  boxSizing: "border-box",
  color: "#202223",
};

export const headers = (headersArgs) => boundary.headers(headersArgs);
