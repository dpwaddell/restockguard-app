import React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Img,
  Text,
  Button,
  Link,
  Hr,
} from "@react-email/components";

export function BackInStock({
  shopName = "Our Store",
  productTitle = "Product",
  productImageUrl = null,
  productUrl = "#",
  variantTitle = null,
  unsubscribeUrl = "#",
}) {
  return (
    <Html lang="en">
      <Head />
      <Body style={body}>
        <Container style={container}>

          {/* Header */}
          <Section style={header}>
            <Text style={shopNameText}>{shopName}</Text>
          </Section>

          {/* Product image */}
          <Section>
            <Img
              src={productImageUrl || "https://placehold.co/600x400/f3f4f6/9ca3af?text=Product"}
              alt={productTitle}
              width="600"
              style={productImage}
            />
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={badge}>Back in stock</Text>
            <Text style={productTitleText}>{productTitle}</Text>

            {variantTitle && (
              <Text style={variantText}>{variantTitle}</Text>
            )}

            <Text style={message}>
              Good news — the item you were waiting for is available again. Grab
              yours before it sells out.
            </Text>

            <Button href={productUrl} style={shopButton}>
              Shop Now
            </Button>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You subscribed to back-in-stock alerts for {shopName}.{" "}
              <Link href={unsubscribeUrl} style={unsubscribeLink}>
                Unsubscribe
              </Link>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

export default BackInStock;

/* ---- Styles ---- */

const body = {
  backgroundColor: "#f3f4f6",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: "0",
  padding: "32px 0",
};

const container = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  margin: "0 auto",
  maxWidth: "600px",
  overflow: "hidden",
};

const header = {
  borderBottom: "1px solid #e5e7eb",
  padding: "20px 40px",
};

const shopNameText = {
  color: "#111827",
  fontSize: "16px",
  fontWeight: "700",
  margin: "0",
};

const productImage = {
  display: "block",
  width: "100%",
  height: "auto",
  objectFit: "cover",
};

const content = {
  padding: "32px 40px 24px",
};

const badge = {
  backgroundColor: "#dcfce7",
  borderRadius: "4px",
  color: "#15803d",
  display: "inline-block",
  fontSize: "12px",
  fontWeight: "600",
  letterSpacing: "0.05em",
  margin: "0 0 16px",
  padding: "4px 10px",
  textTransform: "uppercase",
};

const productTitleText = {
  color: "#111827",
  fontSize: "24px",
  fontWeight: "700",
  lineHeight: "1.3",
  margin: "0 0 8px",
};

const variantText = {
  color: "#6b7280",
  fontSize: "15px",
  margin: "0 0 16px",
};

const message = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "16px 0 28px",
};

const shopButton = {
  backgroundColor: "#111827",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: "600",
  padding: "14px 28px",
  textDecoration: "none",
};

const divider = {
  borderColor: "#e5e7eb",
  margin: "0",
};

const footer = {
  padding: "20px 40px",
};

const footerText = {
  color: "#9ca3af",
  fontSize: "13px",
  margin: "0",
};

const unsubscribeLink = {
  color: "#9ca3af",
  textDecoration: "underline",
};
