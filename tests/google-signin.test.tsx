import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { signInErrorMessage } from "@/lib/auth-errors";
import { safeCallbackUrl } from "@/lib/safe-callback";
import SignInForm from "@/components/SignInForm";
import SignUpPrompt from "@/components/SignUpPrompt";

const signIn = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => ({ signIn }));
vi.mock("@/lib/db", () => ({ prisma: {} }));

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
  signIn.mockReset();
  vi.unstubAllEnvs();
  vi.resetModules();
});

const GENERIC = "Google sign-in didn't complete. Please try again.";

describe("signInErrorMessage", () => {
  it("explains an email already on another account", () => {
    expect(signInErrorMessage("OAuthAccountNotLinked")).toBe(
      "This email is already linked to another account. Contact us and we'll sort it out.",
    );
  });

  it("explains a refused (unverified) Google email", () => {
    expect(signInErrorMessage("AccessDenied")).toBe(
      "We couldn't confirm that Google email address. Try another Google account.",
    );
  });

  it("gives one generic message for OAuth failures and unknown codes", () => {
    for (const code of [
      "OAuthSignin",
      "OAuthCallback",
      "Callback",
      "CredentialsSignin",
      "Nope",
    ]) {
      expect(signInErrorMessage(code)).toBe(GENERIC);
    }
  });

  it("shows nothing without a code", () => {
    expect(signInErrorMessage(undefined)).toBeNull();
    expect(signInErrorMessage("")).toBeNull();
  });

  it("never echoes a hostile value", () => {
    expect(signInErrorMessage("<script>alert(1)</script>")).toBe(GENERIC);
    // Inherited object keys are not mapped codes either.
    expect(signInErrorMessage("constructor")).toBe(GENERIC);
    expect(signInErrorMessage("__proto__")).toBe(GENERIC);
  });

  it("never mentions passwords or email sign-in", () => {
    for (const code of ["OAuthAccountNotLinked", "AccessDenied", "x"]) {
      expect(signInErrorMessage(code)).not.toMatch(
        /password|sign in with email/i,
      );
      expect(signInErrorMessage(code)).not.toContain("!");
    }
  });
});

describe("safeCallbackUrl", () => {
  it("keeps same-site paths and drops everything else", () => {
    expect(safeCallbackUrl("/checkout")).toBe("/checkout");
    expect(safeCallbackUrl("https://evil.example")).toBe("/");
    expect(safeCallbackUrl("//evil.example")).toBe("/");
    expect(safeCallbackUrl("/\\evil.example")).toBe("/");
    expect(safeCallbackUrl(undefined)).toBe("/");
  });
});

describe("SignInForm", () => {
  it("signs in through Google", () => {
    render(
      <SignInForm googleEnabled demoEnabled={false} callbackUrl="/checkout" />,
    );
    const button = screen.getByRole("button", { name: "Continue with Google" });
    fireEvent.click(button);
    expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/checkout" });
    expect(button.getAttribute("type")).toBe("button");
  });

  it("has no email, password or registration route", () => {
    render(
      <SignInForm googleEnabled demoEnabled={false} callbackUrl="/checkout" />,
    );
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    expect(screen.queryByLabelText(/^email$/i)).toBeNull();
    expect(
      screen.queryByRole("link", { name: /create an account/i }),
    ).toBeNull();
    expect(screen.queryByText("or")).toBeNull();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <SignInForm googleEnabled demoEnabled={false} callbackUrl="/" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("SignUpPrompt", () => {
  it("offers Continue with Google and returns the buyer to checkout", () => {
    render(<SignUpPrompt open onClose={() => {}} googleEnabled />);
    fireEvent.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );
    expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/checkout" });
    expect(
      screen.queryByRole("link", { name: /create an account/i }),
    ).toBeNull();
  });

  it("doesn't mention Google when Google is off", () => {
    render(<SignUpPrompt open onClose={() => {}} googleEnabled={false} />);
    expect(screen.getByRole("dialog").textContent).not.toMatch(/google/i);
  });
});

describe("auth providers", () => {
  async function providerIds(env: Record<string, string>) {
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    const { authOptions } = await import("@/lib/auth");
    return authOptions.providers.map(
      (p) => (p as { options?: { id?: string } }).options?.id ?? p.id,
    );
  }

  it("registers Google only — no password or email-link provider", async () => {
    const ids = await providerIds({
      GOOGLE_CLIENT_ID: "id",
      GOOGLE_CLIENT_SECRET: "secret",
      ALLOW_DEMO_LOGIN: "false",
    });
    expect(ids).toEqual(["google"]);
  });

  it("adds only the demo provider when demo login is on", async () => {
    const ids = await providerIds({
      GOOGLE_CLIENT_ID: "id",
      GOOGLE_CLIENT_SECRET: "secret",
      ALLOW_DEMO_LOGIN: "true",
    });
    expect(ids).toEqual(["google", "demo"]);
  });
});

describe("oauthSignInAllowed", () => {
  const google = { provider: "google" };

  it("lets Google through only when Google verified the email", async () => {
    const { oauthSignInAllowed } = await import("@/lib/auth");
    expect(
      oauthSignInAllowed({
        account: google,
        profile: { email_verified: true },
      }),
    ).toBe(true);
    expect(
      oauthSignInAllowed({
        account: google,
        profile: { email_verified: false },
      }),
    ).toBe(false);
    expect(oauthSignInAllowed({ account: google, profile: {} })).toBe(false);
    expect(oauthSignInAllowed({ account: google })).toBe(false);
  });

  it("leaves the demo provider to its own authorize()", async () => {
    const { oauthSignInAllowed } = await import("@/lib/auth");
    expect(oauthSignInAllowed({ account: { provider: "demo" } })).toBe(true);
  });

  it("is wired in as the signIn callback", async () => {
    const { authOptions } = await import("@/lib/auth");
    const callback = authOptions.callbacks?.signIn as unknown as (p: {
      account: { provider: string };
      profile: { email_verified: boolean };
    }) => Promise<boolean>;
    expect(
      await callback({ account: google, profile: { email_verified: false } }),
    ).toBe(false);
  });
});
