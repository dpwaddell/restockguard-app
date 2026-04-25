export default function PrivacyPolicy() {
  return (
    <div style={page}>
      <div style={container}>
        <div style={header}>
          <span style={shield}>🛡️</span>
          <span style={brand}>RestockGuard</span>
        </div>

        <h1 style={h1}>Privacy Policy</h1>
        <p style={meta}>Effective date: 1 May 2026 &nbsp;·&nbsp; Last updated: 1 May 2026</p>

        <p style={lead}>
          RestockGuard ("we", "us", "our") is a Shopify application that helps merchants recover
          lost sales by sending automated back-in-stock email alerts to customers. This Privacy
          Policy explains what data we collect, how we use it, and your rights regarding that data.
        </p>

        <Section title="1. Data We Collect">
          <p>When you install RestockGuard, we collect and store:</p>
          <ul style={ul}>
            <li><strong>Shop domain</strong> — your Shopify store URL (e.g. yourstore.myshopify.com)</li>
            <li><strong>Access token</strong> — a Shopify API token used to read inventory and product data on your behalf</li>
            <li><strong>Subscriber email addresses</strong> — email addresses entered by your customers when signing up for back-in-stock notifications</li>
            <li><strong>Product and variant IDs</strong> — the specific products customers sign up to be notified about</li>
            <li><strong>Order data</strong> — when a customer who received an alert completes a purchase, we record the order value for conversion analytics</li>
            <li><strong>App settings</strong> — your widget customisation preferences (button text, colours, email copy)</li>
          </ul>
          <p>We do <strong>not</strong> collect payment card details, passwords, or any sensitive personal information beyond what is listed above.</p>
        </Section>

        <Section title="2. How We Use the Data">
          <ul style={ul}>
            <li><strong>Sending restock alerts</strong> — subscriber emails and product IDs are used solely to email customers when inventory becomes available</li>
            <li><strong>Analytics</strong> — aggregate counts of subscribers, alerts sent, opens, clicks, and recovered revenue are shown to you in the RestockGuard dashboard</li>
            <li><strong>App operation</strong> — your shop domain and access token are required to authenticate API calls to Shopify</li>
            <li><strong>Billing</strong> — plan information is stored to gate features and process Shopify subscription charges</li>
          </ul>
          <p>We do not sell subscriber data, use it for advertising, or share it with third parties for their own marketing purposes.</p>
        </Section>

        <Section title="3. Third-Party Services">
          <p>We use the following third-party services to operate RestockGuard:</p>
          <ul style={ul}>
            <li>
              <strong>Resend</strong> (resend.com) — transactional email delivery provider used to send back-in-stock alert emails to your customers. Subscriber email addresses are transmitted to Resend for this purpose. Resend's privacy policy is available at <a href="https://resend.com/legal/privacy-policy" style={link}>resend.com/legal/privacy-policy</a>.
            </li>
            <li>
              <strong>Shopify</strong> — RestockGuard is built on the Shopify Partner platform. Shop and order data is accessed via the Shopify Admin API under your store's permissions.
            </li>
          </ul>
        </Section>

        <Section title="4. Data Retention">
          <ul style={ul}>
            <li>Subscriber records are retained for as long as the RestockGuard app is installed on your store, or until the subscriber unsubscribes</li>
            <li>Alert send records and conversion data are retained for 24 months to support analytics</li>
            <li>If you uninstall the app, your shop data is kept for 90 days in case you reinstall, then automatically purged</li>
            <li>Upon receiving a GDPR shop redact webhook from Shopify (48 days after uninstallation), all remaining data is permanently deleted</li>
          </ul>
        </Section>

        <Section title="5. Data Deletion & Customer Rights">
          <p><strong>For merchants:</strong></p>
          <ul style={ul}>
            <li>You can delete all subscriber data for a specific product from the RestockGuard dashboard (Products page)</li>
            <li>Uninstalling the app from your Shopify admin triggers our app/uninstalled webhook and marks your shop inactive</li>
            <li>You may request full data deletion by emailing <a href="mailto:support@restockguard.com" style={link}>support@restockguard.com</a></li>
          </ul>
          <p><strong>For your customers (end users):</strong></p>
          <ul style={ul}>
            <li>Customers can unsubscribe at any time via the unsubscribe link included in every alert email</li>
            <li>Shopify's GDPR webhooks (customers/redact) trigger automatic deletion of a customer's subscriber records upon their request</li>
            <li>Customers may request access to or deletion of their data by contacting you (the merchant), who can relay the request to us at <a href="mailto:support@restockguard.com" style={link}>support@restockguard.com</a></li>
          </ul>
        </Section>

        <Section title="6. GDPR Compliance">
          <p>
            RestockGuard implements all three Shopify-mandated GDPR webhooks:
          </p>
          <ul style={ul}>
            <li><strong>customers/data_request</strong> — returns all data we hold about a specific customer</li>
            <li><strong>customers/redact</strong> — permanently deletes all subscriber records for a customer</li>
            <li><strong>shop/redact</strong> — permanently deletes all data associated with a shop</li>
          </ul>
          <p>
            The legal basis for processing subscriber email addresses is <strong>legitimate interest</strong>
            (the customer explicitly signed up to receive a notification) and, where required,
            explicit consent obtained at the point of sign-up via your storefront widget.
          </p>
        </Section>

        <Section title="7. Security">
          <p>
            We take reasonable technical and organisational measures to protect your data, including:
          </p>
          <ul style={ul}>
            <li>All data is transmitted over HTTPS/TLS</li>
            <li>Access tokens are stored encrypted at rest</li>
            <li>Database access is restricted to application servers only</li>
            <li>We do not log subscriber email addresses in application logs</li>
          </ul>
        </Section>

        <Section title="8. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify merchants of
            material changes via email or an in-app banner. Continued use of RestockGuard after
            changes take effect constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            If you have questions about this Privacy Policy or wish to exercise your data rights,
            please contact us:
          </p>
          <ul style={ul}>
            <li>Email: <a href="mailto:support@restockguard.com" style={link}>support@restockguard.com</a></li>
            <li>Website: <a href="/privacy" style={link}>restockguard.com/privacy</a></li>
          </ul>
        </Section>

        <div style={footer}>
          <p>© {new Date().getFullYear()} RestockGuard · <a href="/terms" style={link}>Terms of Service</a> · <a href="/privacy" style={link}>Privacy Policy</a></p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={section}>
      <h2 style={h2}>{title}</h2>
      {children}
    </div>
  );
}

const page = { backgroundColor: "#f9fafb", minHeight: "100vh", padding: "40px 16px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" };
const container = { maxWidth: "760px", margin: "0 auto", backgroundColor: "#fff", borderRadius: "12px", padding: "48px 56px", boxShadow: "0 1px 8px rgba(0,0,0,0.08)" };
const header = { display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" };
const shield = { fontSize: "28px" };
const brand = { fontSize: "20px", fontWeight: "800", color: "#202223" };
const h1 = { fontSize: "28px", fontWeight: "800", color: "#202223", margin: "0 0 4px" };
const meta = { fontSize: "14px", color: "#6d7175", marginBottom: "24px" };
const lead = { fontSize: "16px", lineHeight: "1.7", color: "#3d4044", marginBottom: "8px" };
const section = { borderTop: "1px solid #e1e3e5", paddingTop: "28px", marginTop: "28px" };
const h2 = { fontSize: "18px", fontWeight: "700", color: "#202223", marginBottom: "12px" };
const ul = { paddingLeft: "24px", lineHeight: "1.9", color: "#3d4044", fontSize: "15px" };
const link = { color: "#1a56db", textDecoration: "none" };
const footer = { borderTop: "1px solid #e1e3e5", marginTop: "40px", paddingTop: "24px", textAlign: "center", fontSize: "13px", color: "#6d7175" };
