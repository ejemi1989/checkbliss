import { describe, it, expect } from "vitest";
import { formatMinor, minorToMajor, majorToMinor } from "@/lib/currency";

describe("formatMinor", () => {
  it("formats GBP pence correctly", () => {
    expect(formatMinor(12345, "GBP")).toBe("£123.45");
  });

  it("formats USD cents correctly", () => {
    expect(formatMinor(5000, "USD")).toBe("$50.00");
  });

  it("formats EUR cents correctly", () => {
    expect(formatMinor(9999, "EUR")).toBe("€99.99");
  });

  it("handles zero", () => {
    expect(formatMinor(0, "GBP")).toBe("£0.00");
  });

  it("handles large amounts", () => {
    expect(formatMinor(10000000, "GBP")).toBe("£100,000.00");
  });
});

describe("minorToMajor", () => {
  it("converts pence to pounds", () => {
    expect(minorToMajor(12345)).toBe(123.45);
  });

  it("handles zero", () => {
    expect(minorToMajor(0)).toBe(0);
  });
});

describe("majorToMinor", () => {
  it("converts pounds to pence", () => {
    expect(majorToMinor(123.45)).toBe(12345);
  });

  it("handles zero", () => {
    expect(majorToMinor(0)).toBe(0);
  });
});
