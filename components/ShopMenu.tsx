"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CATEGORIES,
  DEPARTMENTS,
  shopHref,
  type DepartmentSlug,
} from "@/lib/taxonomy";

/*
 * The shop menus, both read from lib/taxonomy.ts so the header can never
 * disagree with the pages it links to.
 *
 * Desktop follows ASOS's "shop by product" panel: one column per category that
 * has sections, and a closing column for the categories that don't. Phones
 * follow the ASOS app: a Women | Men switch at the top of the menu, then each
 * category opens in place to show its sections.
 *
 * Both are solid cream, not the header's frosted glass: a list this long over
 * page copy turns into text-on-text, which is unreadable.
 */

const WITH_SECTIONS = CATEGORIES.filter((c) => c.sections.length > 0);
const WITHOUT_SECTIONS = CATEGORIES.filter((c) => c.sections.length === 0);

export function MegaPanel({
  dept,
  onNavigate,
  onMouseEnter,
  onMouseLeave,
}: {
  dept: DepartmentSlug;
  onNavigate: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const d = DEPARTMENTS.find((x) => x.slug === dept)!;

  return (
    <div
      id={`menu-${dept}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute inset-x-0 top-full hidden border-y border-ink/10 bg-cream lg:block"
    >
      <div className="container-x grid grid-cols-[minmax(0,13rem)_repeat(5,minmax(0,1fr))] gap-x-8 py-12">
        <div>
          <p className="eyebrow">{d.label}</p>
          <Link
            href={shopHref(dept)}
            onClick={onNavigate}
            className="mt-4 block font-serif text-[1.25rem] leading-tight text-ink hover:text-ink-soft"
          >
            Shop all {d.possessive.toLowerCase()}
          </Link>
        </div>

        {WITH_SECTIONS.map((cat) => (
          <div key={cat.slug}>
            <Link
              href={shopHref(dept, cat.slug)}
              onClick={onNavigate}
              className="eyebrow block text-ink hover:text-ink-soft"
            >
              {cat.label}
            </Link>
            <ul className="mt-4 space-y-2.5">
              {cat.sections.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={shopHref(dept, cat.slug, s.slug)}
                    onClick={onNavigate}
                    className="link-underline text-[13px] font-medium tracking-[0.01em] text-ink-soft hover:text-ink"
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <p className="eyebrow">More</p>
          <ul className="mt-4 space-y-2.5">
            {WITHOUT_SECTIONS.map((cat) => (
              <li key={cat.slug}>
                <Link
                  href={shopHref(dept, cat.slug)}
                  onClick={onNavigate}
                  className="link-underline text-[13px] font-medium tracking-[0.01em] text-ink-soft hover:text-ink"
                >
                  {cat.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Phone / tablet shop menu. `tabIndex` follows `open` because the closed panel
 * stays in the DOM (it animates both ways) and must not take focus.
 */
export function MobileShopMenu({
  open,
  initialDept,
  onNavigate,
}: {
  open: boolean;
  initialDept: DepartmentSlug;
  onNavigate: () => void;
}) {
  const [dept, setDept] = useState<DepartmentSlug>(initialDept);
  const [expanded, setExpanded] = useState<string | null>(null);
  const tab = open ? 0 : -1;
  const d = DEPARTMENTS.find((x) => x.slug === dept)!;

  return (
    <div>
      <div
        role="group"
        aria-label="Department"
        className="flex border-b border-ink/10"
      >
        {DEPARTMENTS.map((x) => {
          const active = x.slug === dept;
          return (
            <button
              key={x.slug}
              aria-pressed={active}
              tabIndex={tab}
              onClick={() => {
                setDept(x.slug);
                setExpanded(null);
              }}
              className={`-mb-px flex-1 border-b-2 py-4 text-[13px] font-medium uppercase tracking-[0.2em] transition-colors ${
                active
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-soft"
              }`}
            >
              {x.label}
            </button>
          );
        })}
      </div>

      <ul aria-label={`${d.label} categories`} className="flex flex-col">
        <li className="border-b border-ink/10">
          <Link
            href={shopHref(dept)}
            onClick={onNavigate}
            tabIndex={tab}
            className="block py-[18px] text-[16px] font-medium tracking-[0.01em] text-ink"
          >
            Shop all {d.possessive.toLowerCase()}
          </Link>
        </li>
        {CATEGORIES.map((cat) => {
          if (cat.sections.length === 0) {
            return (
              <li key={cat.slug} className="border-b border-ink/10">
                <Link
                  href={shopHref(dept, cat.slug)}
                  onClick={onNavigate}
                  tabIndex={tab}
                  className="block py-[18px] text-[16px] font-medium tracking-[0.01em] text-ink"
                >
                  {cat.label}
                </Link>
              </li>
            );
          }
          const isOpen = expanded === cat.slug;
          const panelId = `m-${dept}-${cat.slug}`;
          return (
            <li key={cat.slug} className="border-b border-ink/10">
              <button
                aria-expanded={isOpen}
                aria-controls={panelId}
                tabIndex={tab}
                onClick={() => setExpanded(isOpen ? null : cat.slug)}
                className="flex w-full items-center justify-between py-[18px] text-left text-[16px] font-medium tracking-[0.01em] text-ink"
              >
                {cat.label}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  className={`h-5 w-5 text-ink-soft transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
                  aria-hidden
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <ul id={panelId} hidden={!isOpen} className="space-y-1 pb-5 pl-4">
                <li>
                  <Link
                    href={shopHref(dept, cat.slug)}
                    onClick={onNavigate}
                    tabIndex={tab}
                    className="block py-2 text-[16px] text-ink-soft hover:text-ink"
                  >
                    All {cat.label.toLowerCase()}
                  </Link>
                </li>
                {cat.sections.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={shopHref(dept, cat.slug, s.slug)}
                      onClick={onNavigate}
                      tabIndex={tab}
                      className="block py-2 text-[16px] text-ink-soft hover:text-ink"
                    >
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
