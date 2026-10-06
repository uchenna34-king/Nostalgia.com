import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const session = vi.hoisted(() => ({
  data: null as null | { user: Record<string, unknown> },
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: session.data,
    status: session.data ? "authenticated" : "unauthenticated",
  }),
  signIn: vi.fn(),
}));
vi.mock("@/context/CartContext", () => ({
  useCart: () => ({ count: 0, openDrawer: vi.fn() }),
}));
vi.mock("@/context/WishlistContext", () => ({
  useWishlist: () => ({ count: 0 }),
}));
vi.mock("@/components/ThemeToggle", () => ({ default: () => null }));
vi.mock("@/components/ShopMenu", () => ({
  MegaPanel: () => null,
  MobileShopMenu: () => null,
}));
vi.mock("@/lib/db", () => ({ prisma: {} }));

import Nav from "@/components/Nav";
import { authOptions } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/owner";

afterEach(() => {
  cleanup();
  session.data = null;
});

const adminLinks = () =>
  screen
    .queryAllByRole("link", { name: "Admin", hidden: true })
    .map((a) => a.getAttribute("href"));

describe("Admin link in the storefront nav", () => {
  it("shows the owner a way into /admin, on desktop and in the mobile menu", () => {
    session.data = { user: { name: "Owner", isOwner: true } };
    render(<Nav />);
    expect(adminLinks()).toEqual(["/admin", "/admin"]);
  });

  it("is hidden from other customers", () => {
    session.data = { user: { name: "Ada" } };
    render(<Nav />);
    expect(adminLinks()).toEqual([]);

    cleanup();
    session.data = { user: { name: "Ada", isOwner: false } };
    render(<Nav />);
    expect(adminLinks()).toEqual([]);
  });

  it("is hidden from signed-out visitors", () => {
    render(<Nav />);
    expect(adminLinks()).toEqual([]);
  });
});

describe("session isOwner flag", () => {
  type SessionCallback = (p: {
    session: { user?: { email?: string | null } };
    token: Record<string, unknown>;
  }) => Promise<{ user?: { isOwner?: boolean } }>;
  const sessionCallback = authOptions.callbacks
    ?.session as unknown as SessionCallback;

  it("is true only for the owner's email", async () => {
    const owner = await sessionCallback({
      session: { user: { email: OWNER_EMAIL.toUpperCase() } },
      token: { uid: "u1" },
    });
    expect(owner.user?.isOwner).toBe(true);

    const customer = await sessionCallback({
      session: { user: { email: "someone@example.com" } },
      token: { uid: "u2" },
    });
    expect(customer.user?.isOwner).toBe(false);
  });

  it("never puts the owner's email on a customer's session", async () => {
    const customer = await sessionCallback({
      session: { user: { email: "someone@example.com" } },
      token: { uid: "u2" },
    });
    expect(JSON.stringify(customer)).not.toContain(OWNER_EMAIL);
  });
});
