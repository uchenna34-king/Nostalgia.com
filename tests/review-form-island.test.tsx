import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The cached product page renders the same HTML for everyone, so the review
// form works out who is looking in the browser: anonymous visitors (most of
// them) get the sign-in prompt with no request at all; signed-in shoppers get
// their real eligibility from /api/reviews/eligibility.

let sessionStatus: "loading" | "authenticated" | "unauthenticated" = "loading";
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: sessionStatus }) }));

// The form itself is covered by its own tests; here only what it is handed matters.
vi.mock("@/components/ReviewForm", () => ({
  default: ({
    eligibility,
    existingReview,
  }: {
    eligibility: string;
    existingReview?: { title: string };
  }) => (
    <p data-testid="review-form">
      {eligibility}
      {existingReview ? ` / ${existingReview.title}` : ""}
    </p>
  ),
}));

import ReviewFormIsland from "@/components/ReviewFormIsland";

const fetchMock = vi.fn();

beforeEach(() => {
  sessionStatus = "loading";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

const reply = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe("ReviewFormIsland", () => {
  it("holds the space quietly while the session is still loading", () => {
    render(<ReviewFormIsland slug="jacket-01" />);
    expect(screen.queryByTestId("review-form")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the sign-in prompt to anonymous visitors without a request", () => {
    sessionStatus = "unauthenticated";
    render(<ReviewFormIsland slug="jacket-01" />);
    expect(screen.getByTestId("review-form").textContent).toBe("signed-out");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks the server what a signed-in shopper may do, uncached", async () => {
    sessionStatus = "authenticated";
    fetchMock.mockReturnValue(reply(200, { eligibility: "eligible" }));

    render(<ReviewFormIsland slug="jacket 01" />);

    await waitFor(() =>
      expect(screen.getByTestId("review-form").textContent).toBe("eligible"),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reviews/eligibility?slug=jacket%2001",
      { cache: "no-store", credentials: "same-origin" },
    );
  });

  it("passes an existing review through for editing", async () => {
    sessionStatus = "authenticated";
    fetchMock.mockReturnValue(
      reply(200, {
        eligibility: "already-reviewed",
        existingReview: { rating: 4, title: "Warm", body: null },
      }),
    );
    render(<ReviewFormIsland slug="jacket-01" />);
    await waitFor(() =>
      expect(screen.getByTestId("review-form").textContent).toBe("already-reviewed / Warm"),
    );
  });

  it("shows nothing rather than a wrong prompt when the check fails", async () => {
    sessionStatus = "authenticated";
    fetchMock.mockReturnValue(reply(500, { error: "boom" }));
    render(<ReviewFormIsland slug="jacket-01" />);
    await act(async () => {
      await Promise.resolve();
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByTestId("review-form")).toBeNull();
  });
});
