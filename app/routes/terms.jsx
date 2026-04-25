export default function TermsOfService() {
  return (
    <div style={page}>
      <div style={container}>
        <div style={header}>
          <span style={shield}>🛡️</span>
          <span style={brand}>RestockGuard</span>
        </div>

        <h1 style={h1}>Terms of Service</h1>
        <p style={meta}>Effective date: 1 May 2026 &nbsp;·&nbsp; Last updated: 1 May 2026</p>

        <p style={lead}>
          These Terms of Service ("Terms") govern your use of RestockGuard ("Service"), a Shopify
          application provided by RestockGuard ("we", "us", "our"). By installing or using
          RestockGuard, you agree to these Terms. If you do not agree, do not install the app.
        </p>

        <Section title="1. Description of Service">
          <p>
            RestockGuard is a Shopify embedded application that enables merchants to collect
            customer email sign-ups for out-of-stock products and automatically send email
            notifications when inventory is restocked. Features include waitlist management,
            preorder mode, widget customisation, and analytics.
          </p>
        </Section>

        <Section title="2. Acceptable Use">
          <p>You agree to use RestockGuard only for lawful purposes and in accordance with these Terms. You must not:</p>
          <ul style={ul}>
            <li>Use the Service to send unsolicited emails (spam) or messages unrelated to back-in-stock notifications</li>
            <li>Attempt to reverse engineer, decompile, or extract the source code of the application</li>
            <li>Use the Service to store or transmit malicious code or content that violates any law</li>
            <li>Share your access credentials or allow unauthorised third parties to access the Service on your behalf</li>
            <li>Use automated means to scrape, harvest, or extract subscriber data in bulk</li>
            <li>Resell, sublicense, or otherwise commercialise the Service without our written consent</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate your account for violations of this section
            without prior notice.
          </p>
        </Section>

        <Section title="3. Billing and Subscription">
          <p><strong>Free Plan:</strong> RestockGuard offers a free tier with limited features at no charge.</p>
          <p><strong>Paid Plans:</strong> Starter, Growth, and Premium plans are billed as monthly recurring subscriptions through Shopify's billing system.</p>
          <p><strong>Free Trial:</strong> All paid plans include a 30-day free trial period. You will not be charged until the trial period ends. You may cancel at any time during the trial without incurring any charge.</p>
          <p><strong>Billing cycle:</strong> Charges are processed monthly through your Shopify account. Shopify's standard billing policies apply. We do not directly handle payment card information.</p>
          <p><strong>Upgrades and downgrades:</strong> You may change your plan at any time. Upgrades take effect immediately; downgrades take effect at the start of the next billing cycle.</p>
          <p><strong>Cancellation:</strong> You may cancel your subscription at any time by uninstalling RestockGuard from your Shopify admin or by downgrading to the Free plan. Cancellation stops future charges; no refunds are issued for unused portions of a billing period, except where required by applicable law.</p>
          <p><strong>Price changes:</strong> We will give you at least 30 days' notice of any price changes via email or an in-app notification.</p>
        </Section>

        <Section title="4. Data and Privacy">
          <p>
            Your use of the Service is also governed by our{" "}
            <a href="/privacy" style={link}>Privacy Policy</a>, which is incorporated into these
            Terms by reference. You are responsible for ensuring that your collection of customer
            email addresses and use of RestockGuard complies with applicable privacy laws (including
            GDPR, CCPA, and other relevant legislation) in the jurisdictions where you operate.
          </p>
          <p>
            You retain ownership of your subscriber data. We process it only as a data processor on
            your behalf, as described in our Privacy Policy.
          </p>
        </Section>

        <Section title="5. Intellectual Property">
          <p>
            RestockGuard and all related logos, designs, code, and content are owned by or licensed
            to us. Nothing in these Terms transfers any intellectual property rights to you.
          </p>
          <p>
            You grant us a limited licence to display your store name and domain within the
            application interface solely for the purpose of operating the Service.
          </p>
        </Section>

        <Section title="6. Service Availability">
          <p>
            We aim to provide a reliable service but do not guarantee 100% uptime. The Service is
            provided on an "as is" and "as available" basis. We may perform scheduled maintenance
            with reasonable notice, or emergency maintenance without notice when necessary.
          </p>
          <p>
            We are not liable for any loss of revenue or data resulting from service interruptions,
            email delivery failures, or third-party service outages (including Shopify or Resend
            downtime).
          </p>
        </Section>

        <Section title="7. Limitation of Liability">
          <p>
            To the maximum extent permitted by applicable law, RestockGuard and its affiliates,
            directors, employees, and agents shall not be liable for:
          </p>
          <ul style={ul}>
            <li>Any indirect, incidental, special, consequential, or punitive damages</li>
            <li>Loss of profits, revenue, data, goodwill, or business opportunities</li>
            <li>Costs of procuring substitute services</li>
          </ul>
          <p>
            Our total aggregate liability to you for any claim arising out of or related to these
            Terms or the Service shall not exceed the total amount you paid us in the 3 months
            preceding the claim, or £50, whichever is greater.
          </p>
          <p>
            Some jurisdictions do not allow the exclusion of certain warranties or the limitation of
            certain damages, so these limitations may not apply to you in full.
          </p>
        </Section>

        <Section title="8. Indemnification">
          <p>
            You agree to indemnify and hold harmless RestockGuard from any claims, damages, losses,
            or expenses (including reasonable legal fees) arising from: (a) your use of the Service
            in violation of these Terms; (b) your violation of any applicable law or third-party
            right; or (c) any content or data you provide through the Service.
          </p>
        </Section>

        <Section title="9. Termination">
          <p>
            Either party may terminate these Terms at any time. We may suspend or terminate your
            access immediately if you breach these Terms, fail to pay applicable fees, or if
            required by law. Upon termination, your right to use the Service ceases. We will
            handle your data in accordance with our Privacy Policy and Shopify's GDPR webhook
            requirements.
          </p>
        </Section>

        <Section title="10. Changes to These Terms">
          <p>
            We may update these Terms from time to time. We will notify you of material changes
            at least 14 days before they take effect via email or an in-app notice. Continued use
            of the Service after changes take effect constitutes acceptance of the updated Terms.
          </p>
        </Section>

        <Section title="11. Governing Law">
          <p>
            These Terms are governed by and construed in accordance with the laws of England and
            Wales, without regard to conflict of law principles. Any disputes arising from these
            Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales,
            unless you are located in a jurisdiction that requires disputes to be resolved locally.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            If you have questions about these Terms, please contact us:
          </p>
          <ul style={ul}>
            <li>Email: <a href="mailto:support@restockguard.com" style={link}>support@restockguard.com</a></li>
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
