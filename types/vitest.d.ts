// Registers the jest-axe `toHaveNoViolations` matcher on Vitest's assertion
// interfaces, so `expect(await axe(container)).toHaveNoViolations()` type-checks
// in tests/a11y.test.tsx and tests/rating-stars.test.tsx.
//
// `@types/jest-axe` would augment Jest's matchers, not Vitest's, so this local
// augmentation is what actually covers our runner. The leading import is
// required: module augmentation only works in a file with module scope (the
// ambient `jest-axe` module declaration therefore lives in ./jest-axe.d.ts).
import "vitest";

declare module "vitest" {
  interface Assertion<T = unknown> {
    toHaveNoViolations(): T;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}
