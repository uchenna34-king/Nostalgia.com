import RateForm from "@/components/admin/RateForm";
import { getRateSettings } from "@/lib/settings";

// Rendering is owner-gated by app/admin/layout.tsx (requireOwner); the save
// action checks the owner again on its own.
export default async function AdminSettingsPage() {
  const settings = await getRateSettings();

  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.25em] text-sepia">Store</p>
      <h1 className="mt-2 font-serif text-3xl text-ink">Settings</h1>

      {settings ? (
        <section aria-labelledby="rate-heading" className="mt-8">
          <h2 id="rate-heading" className="font-serif text-lg text-ink">
            Exchange rate
          </h2>
          <p className="mt-2 max-w-prose text-sm text-ink-soft">
            Dollar prices you haven&apos;t set by hand are worked out from the naira
            price at this rate and rounded up to the next whole dollar. Prices
            you&apos;ve set by hand never change.
          </p>
          <RateForm
            rate={settings.rate}
            autoCount={settings.autoCount}
            fixedCount={settings.fixedCount}
            updatedLabel={settings.updatedAt.toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          />
        </section>
      ) : (
        <p className="mt-8 border border-[#9B2C2C] bg-[#9B2C2C]/5 px-4 py-3 text-sm text-[#9B2C2C]">
          The exchange rate hasn&apos;t been set up yet. The latest database update
          needs to be applied.
        </p>
      )}
    </div>
  );
}
