// Order confirmation email template (LIVE-03, D-05). Performs no lookups, no
// formatting decisions and no price maths of its own — all of that already
// happened in the pure lib/email-content.ts builder; this component only
// lays out the resulting OrderEmailContent values.
//
// Hard constraints (11-UI-SPEC.md "6. Email template constraints"), because
// most email clients — Outlook desktop especially — support none of this
// project's normal styling:
//   - table-based layout only, via React Email's Section/Row/Column
//     primitives (never a flexbox/grid div structure — that silently
//     collapses in Outlook)
//   - inline `style` props only (no <style> block, no Tailwind classes —
//     Tailwind's generated CSS does not exist in the rendered email HTML)
//   - web-safe fallback font stacks only (Fraunces/Inter will not load in
//     Gmail or Outlook)
//   - locked hex palette, sepia-deep (#8A4524) as the accent, never raw
//     sepia
//   - status rendered as bold colored text, never a background-tinted pill
//   - fixed 600px max content width, centered
//   - every value interpolated as plain React children (escaped) — no raw-
//     HTML injection escape hatch anywhere in this file
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";
import type { OrderEmailContent } from "@/lib/email-content";

const HEADING_FONT = "Georgia, 'Times New Roman', serif";
const BODY_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

const COLORS = {
  cream: "#F4EEE4",
  ink: "#1A1A1A",
  inkSoft: "#3A3A3A",
  sepiaDeep: "#8A4524",
};

export type OrderConfirmationEmailProps = {
  content: OrderEmailContent;
};

export default function OrderConfirmationEmail({
  content,
}: OrderConfirmationEmailProps) {
  const {
    reference,
    preheader,
    lines,
    formattedTotal,
    statusLabel,
    statusColor,
    orderUrl,
    placedOn,
  } = content;

  return (
    <Html>
      <Head />
      <Preview>{preheader}</Preview>
      <Body style={{ backgroundColor: COLORS.cream, margin: 0, padding: "32px 0" }}>
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: "#FFFFFF",
            padding: "40px",
          }}
        >
          <Text
            style={{
              fontFamily: BODY_FONT,
              fontSize: "12px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: COLORS.inkSoft,
              margin: "0 0 8px 0",
            }}
          >
            Nostalgia
          </Text>

          <Heading
            style={{
              fontFamily: HEADING_FONT,
              fontSize: "28px",
              fontWeight: "normal",
              color: COLORS.ink,
              margin: "0 0 8px 0",
            }}
          >
            Your order {reference} is confirmed
          </Heading>

          <Text
            style={{
              fontFamily: BODY_FONT,
              fontSize: "14px",
              color: COLORS.inkSoft,
              margin: "0 0 24px 0",
            }}
          >
            Placed on {placedOn} &middot; Status:{" "}
            <span style={{ color: statusColor, fontWeight: "bold" }}>
              {statusLabel}
            </span>
          </Text>

          <Hr style={{ borderColor: "#E8DFCF", margin: "24px 0" }} />

          <Section>
            {lines.map((line, i) => (
              <Row key={i} style={{ marginBottom: "16px" }}>
                {line.image ? (
                  <Column style={{ width: "64px", verticalAlign: "top" }}>
                    <Img
                      src={line.image}
                      alt={line.name}
                      width={56}
                      height={64}
                      style={{ objectFit: "cover" }}
                    />
                  </Column>
                ) : null}
                <Column style={{ verticalAlign: "top", paddingLeft: line.image ? "12px" : "0" }}>
                  <Text
                    style={{
                      fontFamily: BODY_FONT,
                      fontSize: "14px",
                      color: COLORS.ink,
                      margin: 0,
                    }}
                  >
                    {line.name}
                  </Text>
                  <Text
                    style={{
                      fontFamily: BODY_FONT,
                      fontSize: "12px",
                      color: COLORS.inkSoft,
                      margin: "2px 0 0 0",
                    }}
                  >
                    Size {line.size} &middot; Qty {line.qty}
                  </Text>
                </Column>
                <Column style={{ verticalAlign: "top", textAlign: "right", width: "80px" }}>
                  <Text
                    style={{
                      fontFamily: BODY_FONT,
                      fontSize: "14px",
                      color: COLORS.ink,
                      margin: 0,
                    }}
                  >
                    {line.formattedLineTotal}
                  </Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Hr style={{ borderColor: "#E8DFCF", margin: "24px 0" }} />

          <Row>
            <Column>
              <Text
                style={{
                  fontFamily: BODY_FONT,
                  fontSize: "14px",
                  fontWeight: "bold",
                  color: COLORS.ink,
                  margin: 0,
                }}
              >
                Total
              </Text>
            </Column>
            <Column style={{ textAlign: "right" }}>
              <Text
                style={{
                  fontFamily: BODY_FONT,
                  fontSize: "14px",
                  fontWeight: "bold",
                  color: COLORS.ink,
                  margin: 0,
                }}
              >
                {formattedTotal}
              </Text>
            </Column>
          </Row>

          {orderUrl ? (
            <Text style={{ margin: "32px 0 0 0" }}>
              <Link
                href={orderUrl}
                style={{
                  fontFamily: BODY_FONT,
                  fontSize: "14px",
                  color: COLORS.sepiaDeep,
                  textDecoration: "underline",
                }}
              >
                View your order
              </Link>
            </Text>
          ) : null}

          <Text
            style={{
              fontFamily: BODY_FONT,
              fontSize: "12px",
              color: COLORS.inkSoft,
              margin: "32px 0 0 0",
            }}
          >
            We&rsquo;ll let you know when it ships.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
