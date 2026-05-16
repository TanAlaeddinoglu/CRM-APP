import { describe, expect, it } from "vitest";

import {
  EXPORT_MODEL_CONFIGS,
  getExportModelConfig,
} from "../../../src/components/export/exportModels.js";

describe("exportModels", () => {
  it("returns config for supported model", () => {
    const config = getExportModelConfig("customer");

    expect(config).toBeTruthy();
    expect(config.model).toBe("customer");
    expect(config.fields.length).toBeGreaterThan(0);
  });

  it("normalizes incoming model keys", () => {
    const config = getExportModelConfig(" Payments ");
    expect(config.model).toBe("payments");
  });

  it("returns null for unsupported model", () => {
    expect(getExportModelConfig("unknown-model")).toBeNull();
  });

  it("contains the expected core export model set", () => {
    expect(Object.keys(EXPORT_MODEL_CONFIGS).sort()).toEqual(
      ["customer", "events", "payments", "product", "tag", "user"].sort()
    );
  });
});
