import { useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate, prisma } from "../shopify.server";
import { UpgradePrompt } from "../lib/upgrade-prompt";
import { PageHeader } from "../components/PageHeader";

const PLAN_HIERARCHY = ["FREE", "STARTER", "GROWTH", "PREMIUM"];

const STYLING_DEFAULTS = {
  buttonBg: "#000000",
  buttonText: "#ffffff",
  borderRadius: 6,
  fontSize: "Medium",
  widgetSize: "Standard",
};

const PRESETS = [
  {
    name: "Minimal",
    config: { buttonBg: "#000000", buttonText: "#ffffff", borderRadius: 4, fontSize: "Small" },
  },
  {
    name: "Clean",
    config: { buttonBg: "#2c6ecb", buttonText: "#ffffff", borderRadius: 6, fontSize: "Medium" },
  },
  {
    name: "Bold",
    config: { buttonBg: "#bf0711", buttonText: "#ffffff", borderRadius: 0, fontSize: "Large" },
  },
  {
    name: "Premium",
    config: { buttonBg: "#1a1a1a", buttonText: "#d4af37", borderRadius: 8, fontSize: "Medium" },
    requiresPlan: "GROWTH",
  },
  {
    name: "Dark",
    config: { buttonBg: "#ffffff", buttonText: "#000000", borderRadius: 4, fontSize: "Small" },
    requiresPlan: "GROWTH",
  },
];

const FONT_SIZE_PX = { Small: 13, Medium: 15, Large: 17 };

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
    select: { settings: true, plan: true },
  });

  return {
    styling: { ...STYLING_DEFAULTS, ...(shop?.settings?.styling ?? {}) },
    plan: shop?.plan ?? "FREE",
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
    select: { settings: true },
  });

  const current = shop?.settings ?? {};

  await prisma.shop.update({
    where: { shopDomain: session.shop },
    data: {
      settings: {
        ...current,
        styling: {
          buttonBg: formData.get("buttonBg") || STYLING_DEFAULTS.buttonBg,
          buttonText: formData.get("buttonText") || STYLING_DEFAULTS.buttonText,
          borderRadius: parseInt(formData.get("borderRadius") || "6", 10),
          fontSize: formData.get("fontSize") || STYLING_DEFAULTS.fontSize,
          widgetSize: formData.get("widgetSize") || STYLING_DEFAULTS.widgetSize,
        },
      },
    },
  });

  return { saved: true };
};

export default function StylingPage() {
  const { styling, plan } = useLoaderData();
  const fetcher = useFetcher();
  const saved = fetcher.data?.saved;
  const saving = fetcher.state !== "idle";

  const [config, setConfig] = useState(styling);

  const planIdx = PLAN_HIERARCHY.indexOf(plan);

  function applyPreset(preset) {
    setConfig((prev) => ({ ...prev, ...preset.config }));
  }

  return (
    <s-page heading="Styling">
      <PageHeader currentTab="styling" plan={plan} />
      {saved && (
        <s-banner tone="success">
          <s-paragraph>Styling saved successfully ✓</s-paragraph>
        </s-banner>
      )}

      <UpgradePrompt
        feature="Premium and Dark themes"
        requiredPlan="GROWTH"
        currentPlan={plan}
      />

      <fetcher.Form method="post">
        {/* Controlled hidden inputs carry React state into FormData on submit */}
        <input type="hidden" name="buttonBg" value={config.buttonBg} />
        <input type="hidden" name="buttonText" value={config.buttonText} />
        <input type="hidden" name="borderRadius" value={config.borderRadius} />
        <input type="hidden" name="fontSize" value={config.fontSize} />
        <input type="hidden" name="widgetSize" value={config.widgetSize} />

        <s-section>
          <div style={{ display: "flex", gap: "40px", alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Controls column */}
            <div style={{ flex: "0 0 360px", minWidth: "280px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Theme presets */}
                <div>
                  <div style={sectionLabel}>Theme presets</div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {PRESETS.map((preset) => {
                      const locked =
                        preset.requiresPlan &&
                        planIdx < PLAN_HIERARCHY.indexOf(preset.requiresPlan);
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          disabled={locked}
                          onClick={() => !locked && applyPreset(preset)}
                          title={locked ? `Requires ${preset.requiresPlan} plan` : ""}
                          style={{
                            padding: "10px 14px",
                            borderRadius: "8px",
                            border: "1px solid",
                            borderColor: locked ? "#e1e3e5" : preset.config.buttonBg,
                            backgroundColor: locked ? "#f9fafb" : "#fff",
                            cursor: locked ? "not-allowed" : "pointer",
                            opacity: locked ? 0.6 : 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "6px",
                            minWidth: "72px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                          }}
                        >
                          <div
                            style={{
                              width: "32px",
                              height: "18px",
                              borderRadius: `${preset.config.borderRadius ?? 4}px`,
                              backgroundColor: locked ? "#d1d5db" : preset.config.buttonBg,
                            }}
                          />
                          <span style={{ fontSize: "12px", fontWeight: "600", color: locked ? "#8c9196" : "#202223" }}>
                            {preset.name}
                          </span>
                          {locked && (
                            <span style={{ fontSize: "10px", color: "#8c9196" }}>Growth+</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom overrides */}
                <div style={{ borderTop: "1px solid #e1e3e5", paddingTop: "16px" }}>
                  <div style={sectionLabel}>Custom overrides</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <ColorField
                      label="Button background"
                      value={config.buttonBg}
                      onChange={(v) => setConfig((p) => ({ ...p, buttonBg: v }))}
                    />
                    <ColorField
                      label="Button text colour"
                      value={config.buttonText}
                      onChange={(v) => setConfig((p) => ({ ...p, buttonText: v }))}
                    />
                    <SliderField
                      label="Border radius"
                      sublabel={`${config.borderRadius}px`}
                      min={0}
                      max={24}
                      step={2}
                      value={config.borderRadius}
                      onChange={(v) => setConfig((p) => ({ ...p, borderRadius: v }))}
                      previewStyle={{
                        width: "48px",
                        height: "20px",
                        backgroundColor: config.buttonBg,
                        borderRadius: `${config.borderRadius}px`,
                        display: "inline-block",
                        verticalAlign: "middle",
                        marginLeft: "8px",
                      }}
                    />
                    <SelectField
                      label="Font size"
                      value={config.fontSize}
                      onChange={(v) => setConfig((p) => ({ ...p, fontSize: v }))}
                      options={[
                        { value: "Small", label: "Small (13px)" },
                        { value: "Medium", label: "Medium (15px)" },
                        { value: "Large", label: "Large (17px)" },
                      ]}
                    />
                    <SelectField
                      label="Widget size"
                      value={config.widgetSize}
                      onChange={(v) => setConfig((p) => ({ ...p, widgetSize: v }))}
                      options={[
                        { value: "Compact", label: "Compact" },
                        { value: "Standard", label: "Standard" },
                        { value: "Large", label: "Large" },
                      ]}
                    />
                  </div>
                </div>

                <button type="submit" disabled={saving} style={primaryBtn}>
                  {saving ? "Saving…" : "Save styling"}
                </button>
              </div>
            </div>

            {/* Preview column */}
            <div style={{ flex: 1, minWidth: "280px" }}>
              <div style={sectionLabel}>Live preview</div>
              <ProductPagePreview config={config} />
            </div>
          </div>
        </s-section>
      </fetcher.Form>
    </s-page>
  );
}

function ProductPagePreview({ config }) {
  const { buttonBg, buttonText, borderRadius, fontSize, widgetSize } = config;
  const fsPx = FONT_SIZE_PX[fontSize] || 14;
  const fs = `${fsPx}px`;
  const radius = `${borderRadius}px`;

  const containerPad =
    widgetSize === "Compact" ? "12px 16px" : widgetSize === "Large" ? "24px 28px" : "16px 20px";
  const inputPad =
    widgetSize === "Compact" ? "8px 10px" : widgetSize === "Large" ? "12px 16px" : "10px 14px";
  const btnPad =
    widgetSize === "Compact" ? "8px 14px" : widgetSize === "Large" ? "12px 24px" : "10px 20px";

  return (
    <div
      style={{
        border: "1px solid #e1e3e5",
        borderRadius: "10px",
        backgroundColor: "#fff",
        maxWidth: "420px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}
    >
      {/* Product image placeholder */}
      <div
        style={{
          width: "100%",
          height: "180px",
          backgroundColor: "#f1f2f3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", color: "#8c9196" }}>
          <div style={{ fontSize: "32px", marginBottom: "4px" }}>🖼</div>
          <div style={{ fontSize: "12px" }}>Product image</div>
        </div>
      </div>

      {/* Product details */}
      <div style={{ padding: "16px 20px" }}>
        <div style={{ fontSize: "18px", fontWeight: "700", color: "#202223", marginBottom: "4px" }}>
          Sample Product
        </div>
        <div style={{ fontSize: "16px", fontWeight: "600", color: "#008060", marginBottom: "16px" }}>
          $29.99
        </div>

        {/* Out of stock label */}
        <div
          style={{
            display: "inline-block",
            padding: "3px 10px",
            backgroundColor: "#fdf0ef",
            color: "#bf0711",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: "600",
            marginBottom: "16px",
            border: "1px solid #f5c0bc",
          }}
        >
          Out of stock
        </div>

        {/* Widget */}
        <div
          style={{
            border: "1px solid #e1e3e5",
            borderRadius: `${Math.min(borderRadius, 8)}px`,
            padding: containerPad,
            backgroundColor: "#fafbfc",
          }}
        >
          <p style={{ fontSize: fs, fontWeight: "600", margin: "0 0 10px", color: "#202223" }}>
            Notify me when back in stock
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input
              type="email"
              placeholder="Enter your email address"
              readOnly
              style={{
                flex: 1,
                minWidth: "140px",
                padding: inputPad,
                border: "1px solid #d1d5db",
                borderRadius: radius,
                fontSize: fs,
                outline: "none",
                color: "#6d7175",
                backgroundColor: "#fff",
              }}
            />
            <button
              type="button"
              style={{
                background: buttonBg,
                color: buttonText,
                border: "none",
                borderRadius: radius,
                padding: btnPad,
                fontSize: fs,
                fontWeight: "600",
                cursor: "default",
                whiteSpace: "nowrap",
              }}
            >
              Notify me
            </button>
          </div>
          <p style={{ fontSize: "11px", color: "#8c9196", margin: "8px 0 0" }}>
            Powered by RestockGuard
          </p>
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <label style={{ fontSize: "14px", fontWeight: "500", minWidth: "160px" }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "40px",
            height: "32px",
            borderRadius: "4px",
            border: "1px solid #c9cccf",
            cursor: "pointer",
            padding: "2px",
          }}
        />
        <span style={{ fontSize: "13px", fontFamily: "monospace", color: "#6d7175" }}>{value}</span>
      </div>
    </div>
  );
}

function SliderField({ label, sublabel, min, max, step, value, onChange, previewStyle }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <label style={{ fontSize: "14px", fontWeight: "500" }}>{label}</label>
        <span style={{ fontSize: "13px", color: "#6d7175" }}>{sublabel}</span>
        {previewStyle && <span style={previewStyle} />}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{ width: "100%", maxWidth: "280px", cursor: "pointer" }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontSize: "14px", fontWeight: "500" }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "8px 12px",
          borderRadius: "6px",
          border: "1px solid #c9cccf",
          fontSize: "14px",
          maxWidth: "240px",
          cursor: "pointer",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const sectionLabel = { fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#202223" };
const primaryBtn = {
  padding: "10px 20px",
  backgroundColor: "#008060",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
  width: "100%",
};

export const headers = (headersArgs) => boundary.headers(headersArgs);
