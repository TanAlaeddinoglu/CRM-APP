import { describe, expect, it } from "vitest";

const modules = import.meta.glob("../../src/{components,pages,layout,routes,context}/**/*.{js,jsx}", {
  eager: true,
});

describe("frontend module smoke coverage", () => {
  for (const [modulePath, moduleExports] of Object.entries(modules)) {
    it(`loads ${modulePath}`, () => {
      expect(moduleExports).toBeTruthy();

      const hasDefaultExport = "default" in moduleExports;
      const hasNamedExports = Object.keys(moduleExports).length > (hasDefaultExport ? 1 : 0);

      expect(hasDefaultExport || hasNamedExports).toBe(true);

      if (hasDefaultExport) {
        expect(
          ["function", "object"].includes(typeof moduleExports.default)
        ).toBe(true);
      }
    });
  }
});
