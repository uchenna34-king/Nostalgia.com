import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const saveExchangeRate = vi.fn();
const refresh = vi.fn();
let pathname = "/admin/settings";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
  usePathname: () => pathname,
}));
vi.mock("@/app/admin/settings/actions", () => ({
  saveExchangeRate: (...a: unknown[]) => saveExchangeRate(...a),
}));

import RateForm from "@/components/admin/RateForm";
import AdminNav from "@/components/admin/AdminNav";

const input = () => screen.getByLabelText("₦ per $1") as HTMLInputElement;
const save = () => screen.getByRole("button", { name: /save rate|saving/i });
const type = (value: string) => fireEvent.change(input(), { target: { value } });

function mount(props: Partial<Parameters<typeof RateForm>[0]> = {}) {
  return render(<RateForm rate={1500} autoCount={12} fixedCount={3} {...props} />);
}

beforeEach(() => {
  saveExchangeRate.mockReset();
  refresh.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe("RateForm (UI-SPEC 7c)", () => {
  it("is pre-filled with the current rate and can't be saved unchanged", () => {
    mount();
    expect(input().value).toBe("1500");
    expect(input().getAttribute("aria-describedby")).toBe("rate-hint rate-impact");
    expect((save() as HTMLButtonElement).disabled).toBe(true);
  });

  it("says how many prices the rate moves and how many it doesn't", () => {
    mount();
    expect(
      screen.getByText(
        "12 products follow this rate and will be re-priced when you save. 3 have their own dollar price and won't change.",
      ),
    ).toBeTruthy();
  });

  it.each([
    [{ autoCount: 1, fixedCount: 1 }, "1 product follows this rate and will be re-priced when you save. 1 has its own dollar price and won't change."],
    [{ autoCount: 0, fixedCount: 0 }, "No products follow this rate."],
  ])("words the impact line for %j", (counts, text) => {
    mount(counts);
    expect(screen.getByText(text)).toBeTruthy();
  });

  it("previews a ₦45,000 piece at the typed rate, rounded up", () => {
    mount();
    expect(screen.getByText("At this rate, a ₦45,000 piece is $30.")).toBeTruthy();
    type("1600");
    expect(screen.getByText("At this rate, a ₦45,000 piece is $29.")).toBeTruthy();
  });

  it("flags a rate outside 100–100,000 and hides the example", () => {
    mount();
    type("99");
    expect(screen.getByText("Enter a whole number from 100 to 100,000.")).toBeTruthy();
    expect(input().getAttribute("aria-invalid")).toBe("true");
    expect(screen.queryByText(/At this rate/)).toBeNull();
    expect((save() as HTMLButtonElement).disabled).toBe(true);
  });

  it("saves, reports the re-priced count and refreshes", async () => {
    saveExchangeRate.mockResolvedValue({ ok: true, updated: 12 });
    mount();
    type("1600");
    await act(async () => fireEvent.click(save()));
    expect(saveExchangeRate).toHaveBeenCalledWith("1600");
    expect(screen.getByRole("status").textContent).toBe("Saved. 12 dollar prices updated.");
    expect(refresh).toHaveBeenCalled();
    // Saved value becomes the new baseline: saving again needs a change.
    expect((save() as HTMLButtonElement).disabled).toBe(true);
    type("1601");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it.each([
    [1, "Saved. 1 dollar price updated."],
    [0, "Saved. No dollar prices needed updating."],
  ])("words the success for %i updates", async (updated, text) => {
    saveExchangeRate.mockResolvedValue({ ok: true, updated });
    mount();
    type("1600");
    await act(async () => fireEvent.click(save()));
    expect(screen.getByRole("status").textContent).toBe(text);
  });

  it("asks before a change of more than 20%, and saves nothing on cancel", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    mount();
    type("15000");
    await act(async () => fireEvent.click(save()));
    expect(confirm).toHaveBeenCalledWith(
      "Change the rate from ₦1,500 to ₦15,000 per $1? That is a 900% change, and 12 dollar prices on the storefront will update straight away.",
    );
    expect(saveExchangeRate).not.toHaveBeenCalled();
  });

  it("doesn't ask for a change of 20% or less", async () => {
    const confirm = vi.spyOn(window, "confirm");
    saveExchangeRate.mockResolvedValue({ ok: true, updated: 12 });
    mount();
    type("1800");
    await act(async () => fireEvent.click(save()));
    expect(confirm).not.toHaveBeenCalled();
    expect(saveExchangeRate).toHaveBeenCalledWith("1800");
  });

  it("keeps the typed value and says so when the save fails", async () => {
    saveExchangeRate.mockResolvedValue({ ok: false, error: "save_failed" });
    mount();
    type("1600");
    await act(async () => fireEvent.click(save()));
    expect(screen.getByRole("alert").textContent).toBe("Couldn't save the rate — try again.");
    expect(input().value).toBe("1600");
  });

  it("shows the placeholder note only while the rate is the starting ₦1,500", () => {
    const { unmount } = mount();
    expect(
      screen.getByText(
        "₦1,500 is the starting placeholder rate. Check it against today's rate before you launch.",
      ),
    ).toBeTruthy();
    unmount();
    mount({ rate: 1600 });
    expect(screen.queryByText(/starting placeholder rate/)).toBeNull();
  });
});

describe("AdminNav", () => {
  it("lists Settings after Reviews and marks it active on its page", () => {
    render(<AdminNav />);
    const labels = screen.getAllByRole("link").map((a) => a.textContent);
    expect(labels).toEqual(["Products", "Collections", "Orders", "Reviews", "Settings"]);
    expect(screen.getByRole("link", { name: "Settings" }).className).toContain("border-sepia");
  });
});
