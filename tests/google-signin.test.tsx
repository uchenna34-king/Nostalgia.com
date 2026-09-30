import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { signInErrorMessage } from "@/lib/auth-errors";
import SignInForm from "@/components/SignInForm";
import RegisterForm from "@/components/RegisterForm";
import SignUpPrompt from "@/components/SignUpPrompt";

const signIn = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => ({ signIn }));
vi.mock("@/app/register/actions", () => ({ registerAccount: vi.fn() }));

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
  signIn.mockReset();
});

const GENERIC = "Google sign-in didn't complete. Please try again.";

describe("signInErrorMessage", () => {
  it("explains an unlinked password account", () => {
    expect(signInErrorMessage("OAuthAccountNotLinked")).toBe(
      "This email is already registered. Sign in with your password below, and you can use Google next time.",
    );
  });

  it("explains a refused (unverified) Google email", () => {
    expect(signInErrorMessage("AccessDenied")).toBe(
      "We couldn't confirm that Google email address. Try another account or sign in with email.",
    );
  });

  it("gives one generic message for OAuth failures and unknown codes", () => {
    for (const code of ["OAuthSignin", "OAuthCallback", "Callback", "Nope"]) {
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

  it("keeps the copy calm", () => {
    for (const code of ["OAuthAccountNotLinked", "AccessDenied", "x"]) {
      expect(signInErrorMessage(code)).not.toContain("!");
    }
  });
});

describe.each([
  [
    "SignInForm",
    (googleEnabled: boolean) => (
      <SignInForm
        googleEnabled={googleEnabled}
        demoEnabled={false}
        callbackUrl="/checkout"
      />
    ),
    ["Email", "Password"],
  ],
  [
    "RegisterForm",
    (googleEnabled: boolean) => (
      <RegisterForm googleEnabled={googleEnabled} callbackUrl="/checkout" />
    ),
    ["Full name", "Email", "Password", "Confirm password"],
  ],
] as const)("%s Google button", (_name, renderForm, fields) => {
  it("renders Continue with Google and signs in through Google", () => {
    render(renderForm(true));
    const button = screen.getByRole("button", { name: "Continue with Google" });
    expect(screen.getByText("or")).toBeDefined();

    fireEvent.click(button);
    expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/checkout" });
    // The button can never submit the password form it sits beside.
    expect(button.getAttribute("type")).toBe("button");
  });

  it("renders neither button nor divider when Google is off", () => {
    render(renderForm(false));
    expect(
      screen.queryByRole("button", { name: /Google/i }),
    ).toBeNull();
    expect(screen.queryByText("or")).toBeNull();
  });

  it("keeps the password form either way", () => {
    for (const googleEnabled of [true, false]) {
      render(renderForm(googleEnabled));
      for (const label of fields) {
        expect(screen.getByLabelText(label)).toBeDefined();
      }
      cleanup();
    }
  });

  it("has no axe violations with Google on", async () => {
    const { container } = render(renderForm(true));
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("SignUpPrompt copy", () => {
  const renderPrompt = (googleEnabled: boolean) =>
    render(<SignUpPrompt open onClose={() => {}} googleEnabled={googleEnabled} />);

  it("doesn't mention Google when Google is off", () => {
    renderPrompt(false);
    expect(screen.getByRole("dialog").textContent).not.toMatch(/google/i);
  });

  it("mentions Google when it's on", () => {
    renderPrompt(true);
    expect(screen.getByRole("dialog").textContent).toMatch(/or with Google/);
  });
});
