import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { buildProviderFlags } from "@/lib/auth-flags";
import SignInForm from "@/components/SignInForm";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
});

describe("buildProviderFlags", () => {
  it("enables Google only when both client id and secret are present", () => {
    expect(
      buildProviderFlags({
        GOOGLE_CLIENT_ID: "id",
        GOOGLE_CLIENT_SECRET: "secret",
      }).hasGoogle,
    ).toBe(true);
  });

  it("disables Google when only one of the two vars is present", () => {
    expect(buildProviderFlags({ GOOGLE_CLIENT_ID: "id" }).hasGoogle).toBe(
      false,
    );
    expect(
      buildProviderFlags({ GOOGLE_CLIENT_SECRET: "secret" }).hasGoogle,
    ).toBe(false);
  });

  it("disables Google when neither var is present", () => {
    expect(buildProviderFlags({}).hasGoogle).toBe(false);
  });

  it("enables demo login only for the exact string true", () => {
    expect(
      buildProviderFlags({ ALLOW_DEMO_LOGIN: "true" }).allowDemoLogin,
    ).toBe(true);
  });

  it("is the footgun test: the string false must NOT enable demo login", () => {
    expect(
      buildProviderFlags({ ALLOW_DEMO_LOGIN: "false" }).allowDemoLogin,
    ).toBe(false);
  });

  it("rejects near-miss values: wrong case, numeric string, empty string, unset", () => {
    expect(
      buildProviderFlags({ ALLOW_DEMO_LOGIN: "TRUE" }).allowDemoLogin,
    ).toBe(false);
    expect(
      buildProviderFlags({ ALLOW_DEMO_LOGIN: "1" }).allowDemoLogin,
    ).toBe(false);
    expect(buildProviderFlags({ ALLOW_DEMO_LOGIN: "" }).allowDemoLogin).toBe(
      false,
    );
    expect(buildProviderFlags({}).allowDemoLogin).toBe(false);
  });

  it("derives the two flags independently of each other", () => {
    const googleOnDemoOff = buildProviderFlags({
      GOOGLE_CLIENT_ID: "id",
      GOOGLE_CLIENT_SECRET: "secret",
      ALLOW_DEMO_LOGIN: "false",
    });
    expect(googleOnDemoOff.hasGoogle).toBe(true);
    expect(googleOnDemoOff.allowDemoLogin).toBe(false);

    const googleOffDemoOn = buildProviderFlags({
      ALLOW_DEMO_LOGIN: "true",
    });
    expect(googleOffDemoOn.hasGoogle).toBe(false);
    expect(googleOffDemoOn.allowDemoLogin).toBe(true);
  });
});

describe("SignInForm", () => {
  it("renders both providers when Google and demo are both enabled", () => {
    render(
      <SignInForm googleEnabled demoEnabled callbackUrl="/" />,
    );
    expect(
      screen.getByRole("button", { name: /Continue with Google/i }),
    ).toBeDefined();
    expect(screen.getByLabelText(/Demo email/i)).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Continue with demo account/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Sign in as store owner/i }),
    ).toBeDefined();
    expect(screen.getByText("or")).toBeDefined();
  });

  it("renders only the Google button when demo is disabled", () => {
    render(
      <SignInForm googleEnabled demoEnabled={false} callbackUrl="/" />,
    );
    expect(
      screen.getByRole("button", { name: /Continue with Google/i }),
    ).toBeDefined();
    expect(screen.queryByLabelText(/Demo email/i)).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Continue with demo account/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Sign in as store owner/i }),
    ).toBeNull();
    expect(screen.queryByText("or")).toBeNull();
    // No element whose text mentions demo survives.
    expect(screen.queryByText(/demo/i)).toBeNull();
  });

  it("renders only demo controls when Google is disabled", () => {
    render(
      <SignInForm googleEnabled={false} demoEnabled callbackUrl="/" />,
    );
    expect(
      screen.queryByRole("button", { name: /Continue with Google/i }),
    ).toBeNull();
    expect(screen.getByLabelText(/Demo email/i)).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Continue with demo account/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Sign in as store owner/i }),
    ).toBeDefined();
  });

  it("renders the misconfiguration line when neither provider is enabled", () => {
    const { container } = render(
      <SignInForm googleEnabled={false} demoEnabled={false} callbackUrl="/" />,
    );
    expect(container.textContent?.trim().length).toBeGreaterThan(0);
    expect(screen.getByText(/not configured/i)).toBeDefined();
  });

  it("never renders the owner email as visible text", () => {
    render(
      <SignInForm
        googleEnabled={false}
        demoEnabled
        callbackUrl="/"
        ownerEmail="owner@example.test"
      />,
    );
    expect(
      screen.getByRole("button", { name: /Sign in as store owner/i }),
    ).toBeDefined();
    expect(screen.queryByText(/owner@example\.test/)).toBeNull();
  });

  it("has zero axe violations with both providers enabled", async () => {
    const { container } = render(
      <SignInForm googleEnabled demoEnabled callbackUrl="/" />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has zero axe violations with Google only", async () => {
    const { container } = render(
      <SignInForm googleEnabled demoEnabled={false} callbackUrl="/" />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("never gives a button an aria-label that omits its own visible text", () => {
    const { container } = render(
      <SignInForm
        googleEnabled
        demoEnabled
        callbackUrl="/"
        ownerEmail="owner@example.test"
      />,
    );
    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      const label = button.getAttribute("aria-label");
      if (label) {
        expect(label).toContain(button.textContent?.trim() ?? "");
      }
    }
  });
});
