// Ambient type declarations for `jest-axe` (installed by 10-01 for the Phase 10
// a11y tests). The package ships no types of its own. Deliberately a local
// declaration rather than a new `@types/*` dependency.
//
// IMPORTANT: this file must stay free of any top-level `import`/`export` — that
// would make it a module, and `declare module "jest-axe"` would then be read as
// an augmentation of an existing module instead of an ambient declaration.
// The Vitest matcher augmentation (which DOES require module scope) therefore
// lives separately in ./vitest.d.ts.

declare module "jest-axe" {
  /** An axe-core violation entry (only the fields we surface are typed). */
  export interface AxeViolation {
    id: string;
    impact?: string;
    description: string;
    help: string;
    helpUrl: string;
    nodes: unknown[];
  }

  export interface AxeResults {
    violations: AxeViolation[];
    passes: unknown[];
    incomplete: unknown[];
    inapplicable: unknown[];
  }

  /** Run axe-core against a container element (or HTML string). */
  export function axe(
    html: Element | string,
    options?: Record<string, unknown>,
  ): Promise<AxeResults>;

  /** Build a preconfigured `axe` with custom rules/options. */
  export function configureAxe(options?: Record<string, unknown>): typeof axe;

  /** The matcher object passed to `expect.extend(...)`. */
  export const toHaveNoViolations: {
    toHaveNoViolations(results: AxeResults): {
      pass: boolean;
      message(): string;
    };
  };
}
