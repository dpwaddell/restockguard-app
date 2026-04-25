import { useLoaderData, useFetcher } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate, prisma } from "../shopify.server";

const DEFAULTS = {
  buttonText: "Notify me when back in stock",
  successMessage: "You're on the list! We'll email you when this is back.",
  emailPlaceholder: "Enter your email address",
  fromName: "RestockGuard",
  fromEmail: "noreply@restockguard.com",
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
  const saved = fetcher.data?.saved;
  const saving = fetcher.state !== "idle";

  return (
    <s-page heading="Settings">
      {saved && (
        <s-banner tone="success">
          <s-paragraph>Settings saved.</s-paragraph>
        </s-banner>
      )}

      <fetcher.Form method="post">
        <s-section heading="Custom messages">
          <s-stack direction="block" gap="base">
            <Field label="Button text" name="buttonText" defaultValue={settings.buttonText} />
            <Field label="Success message" name="successMessage" defaultValue={settings.successMessage} />
            <Field label="Email placeholder" name="emailPlaceholder" defaultValue={settings.emailPlaceholder} />
          </s-stack>
        </s-section>

        <s-section heading="Email settings">
          <s-stack direction="block" gap="base">
            <Field label="From name" name="fromName" defaultValue={settings.fromName} />
            <Field label="From email" name="fromEmail" type="email" defaultValue={settings.fromEmail} />
          </s-stack>
        </s-section>

        <s-section heading="Widget settings">
          <s-stack direction="block" gap="base">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="checkbox"
                id="showBranding"
                name="showBranding"
                defaultChecked={settings.showBranding}
                disabled={plan === "FREE"}
                style={{ width: "16px", height: "16px", cursor: plan === "FREE" ? "not-allowed" : "pointer" }}
              />
              <label htmlFor="showBranding" style={{ fontSize: "14px" }}>
                Show "Powered by RestockGuard" branding on the widget
              </label>
              {plan === "FREE" && (
                <s-badge>
                  <a href="/app/upgrade" style={{ color: "inherit", textDecoration: "none" }}>
                    Upgrade to remove
                  </a>
                </s-badge>
              )}
            </div>
          </s-stack>
        </s-section>

        <s-section>
          <button type="submit" disabled={saving} style={primaryBtn}>
            {saving ? "Saving…" : "Save settings"}
          </button>
        </s-section>
      </fetcher.Form>
    </s-page>
  );
}

function Field({ label, name, type = "text", defaultValue }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label htmlFor={name} style={{ fontSize: "14px", fontWeight: "500" }}>
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
  padding: "8px 12px",
  borderRadius: "6px",
  border: "1px solid #c9cccf",
  fontSize: "14px",
  width: "100%",
  maxWidth: "480px",
  boxSizing: "border-box",
};

const primaryBtn = {
  padding: "10px 20px",
  backgroundColor: "#008060",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
};

export const headers = (headersArgs) => boundary.headers(headersArgs);
