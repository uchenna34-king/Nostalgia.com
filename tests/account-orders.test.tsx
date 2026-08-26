import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import OrderList, {
  toOrderRows,
  type Row,
} from "@/components/account/OrderList";
import {
  AccountSignedOut,
  AccountSignOutButton,
} from "@/components/account/AccountAuthActions";
import { signIn, signOut } from "next-auth/react";

// AccountAuthActions calls signIn()/signOut() from next-auth/react, which
// jsdom cannot run for real. Hoisted file-wide by vitest — inert for the
// OrderList blocks, which never import next-auth/react.
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
});

describe("toOrderRows", () => {
  it("returns [] for an empty input array", () => {
    expect(toOrderRows([])).toEqual([]);
  });

  it("maps itemCount as the sum of item quantities, and 0 for corrupt JSON", () => {
    const rows = toOrderRows([
      {
        id: "order-1",
        items: JSON.stringify([
          { slug: "a", name: "A", size: "M", unitPrice: 100, qty: 2 },
          { slug: "b", name: "B", size: "L", unitPrice: 200, qty: 3 },
        ]),
        total: 800,
        status: "paid",
        createdAt: new Date("2026-01-15"),
      },
      {
        id: "order-2",
        items: "not json",
        total: 500,
        status: "pending",
        createdAt: new Date("2026-02-01"),
      },
    ]);

    expect(rows[0].itemCount).toBe(5);
    expect(rows[1].itemCount).toBe(0);
  });

  it("formats createdAt as an en-US short date and preserves id/total/status untouched", () => {
    const createdAt = new Date("2026-03-10");
    const rows = toOrderRows([
      {
        id: "order-abc123",
        items: "[]",
        total: 1234,
        status: "fulfilled",
        createdAt,
      },
    ]);

    expect(rows[0].id).toBe("order-abc123");
    expect(rows[0].total).toBe(1234);
    expect(rows[0].status).toBe("fulfilled");
    expect(rows[0].createdAt).toBe(
      createdAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    );
  });

  it("preserves input order — sorting is the query's job, not this helper's", () => {
    const input = [
      { id: "c", items: "[]", total: 1, status: "paid", createdAt: new Date("2026-01-03") },
      { id: "a", items: "[]", total: 1, status: "paid", createdAt: new Date("2026-01-01") },
      { id: "b", items: "[]", total: 1, status: "paid", createdAt: new Date("2026-01-02") },
    ];
    expect(toOrderRows(input).map((r) => r.id)).toEqual(["c", "a", "b"]);
  });
});

describe("OrderList — empty state", () => {
  it("shows a heading, body copy, and a Browse the collection CTA to /shop", () => {
    render(<OrderList orders={[]} />);

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "No orders yet",
    });
    expect(heading).toBeDefined();
    expect(
      screen.getByText("When you place an order, it'll show up here."),
    ).toBeDefined();

    const cta = screen.getByRole("link", { name: "Browse the collection" });
    expect(cta.getAttribute("href")).toBe("/shop");
  });

  it("renders no h1 (the page owns the h1)", () => {
    render(<OrderList orders={[]} />);
    expect(screen.queryAllByRole("heading", { level: 1 })).toHaveLength(0);
  });

  it("has zero axe violations", async () => {
    const { container } = render(<OrderList orders={[]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

const SAMPLE_ORDERS: Row[] = [
  {
    id: "order-pending-00000001",
    itemCount: 1,
    total: 1000,
    status: "pending",
    createdAt: "Jan 1, 2026",
  },
  {
    id: "order-paid-000000002",
    itemCount: 2,
    total: 2000,
    status: "paid",
    createdAt: "Jan 2, 2026",
  },
  {
    id: "order-fulfilled-0003",
    itemCount: 3,
    total: 3000,
    status: "fulfilled",
    createdAt: "Jan 3, 2026",
  },
  {
    id: "order-cancelled-004",
    itemCount: 4,
    total: 4000,
    status: "cancelled",
    createdAt: "Jan 4, 2026",
  },
];

describe("OrderList — populated state", () => {
  it("renders an sr-only-or-visible h2 'Your orders' and no h1", () => {
    render(<OrderList orders={SAMPLE_ORDERS} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Your orders" }),
    ).toBeDefined();
    expect(screen.queryAllByRole("heading", { level: 1 })).toHaveLength(0);
  });

  it("shows all four status labels as visible text (WCAG 1.4.1 colour independence)", () => {
    render(<OrderList orders={SAMPLE_ORDERS} />);
    expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Paid").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fulfilled").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cancelled").length).toBeGreaterThan(0);
  });

  it("the paid pill uses sepia-deep and never the raw accent token as a standalone class", () => {
    render(<OrderList orders={SAMPLE_ORDERS} />);
    const paidPills = screen.getAllByText("Paid");
    expect(paidPills.length).toBeGreaterThan(0);
    for (const pill of paidPills) {
      expect(pill.className).toContain("sepia-deep");
      expect(pill.className).not.toMatch(/(^|\s)text-sepia(\s|$)/);
      expect(pill.className).not.toMatch(/(^|\s)bg-sepia(\s|$)/);
    }
  });

  it("exposes a 'View order {last8}' link per order to /account/orders/{full id}, visible text is #{last8}", () => {
    render(<OrderList orders={SAMPLE_ORDERS} />);
    const order = SAMPLE_ORDERS[0];
    const last8 = order.id.slice(-8);
    const links = screen.getAllByRole("link", {
      name: `View order ${last8}`,
    });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.getAttribute("href")).toBe(`/account/orders/${order.id}`);
      expect(link.textContent).toContain(`#${last8}`);
    }
  });

  it("renders both a table and a card list, with matching sm: visibility classes", () => {
    const { container } = render(<OrderList orders={SAMPLE_ORDERS} />);
    expect(screen.getByRole("table")).toBeDefined();

    const tableWrapper = container.querySelector(".hidden.sm\\:block");
    expect(tableWrapper).not.toBeNull();
    expect(tableWrapper?.querySelector("table")).not.toBeNull();

    const cardWrapper = container.querySelector(".sm\\:hidden");
    expect(cardWrapper).not.toBeNull();
    expect(cardWrapper?.querySelectorAll("a").length).toBe(
      SAMPLE_ORDERS.length,
    );
  });

  it("has zero axe violations", async () => {
    const { container } = render(<OrderList orders={SAMPLE_ORDERS} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("AccountSignedOut", () => {
  it("renders the signed-out h1 and a Sign in button that calls signIn once", () => {
    render(<AccountSignedOut />);
    expect(
      screen.getByRole("heading", { level: 1, name: "You're signed out" }),
    ).toBeDefined();

    const button = screen.getByRole("button", { name: "Sign in" });
    fireEvent.click(button);
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it("has zero axe violations", async () => {
    const { container } = render(<AccountSignedOut />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("AccountSignOutButton", () => {
  it("renders a Sign out button that calls signOut with { callbackUrl: '/' }", () => {
    render(<AccountSignOutButton />);
    const button = screen.getByRole("button", { name: "Sign out" });
    fireEvent.click(button);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });

  it("has zero axe violations", async () => {
    const { container } = render(<AccountSignOutButton />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
