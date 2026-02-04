import { describe, it, expect } from "vitest";
import { EU_COUNTRIES, SOFTWARE_CPV_CODES } from "../models/tender.js";

describe("EU_COUNTRIES", () => {
  it("should have 27 EU member states", () => {
    const countryCount = Object.keys(EU_COUNTRIES).length;
    expect(countryCount).toBe(27);
  });

  it("should have valid 2-letter country codes as keys", () => {
    Object.keys(EU_COUNTRIES).forEach((code) => {
      expect(code).toMatch(/^[A-Z]{2}$/);
    });
  });

  it("should include major EU countries", () => {
    expect(EU_COUNTRIES).toHaveProperty("DE", "Germany");
    expect(EU_COUNTRIES).toHaveProperty("FR", "France");
    expect(EU_COUNTRIES).toHaveProperty("IT", "Italy");
    expect(EU_COUNTRIES).toHaveProperty("ES", "Spain");
    expect(EU_COUNTRIES).toHaveProperty("PL", "Poland");
    expect(EU_COUNTRIES).toHaveProperty("NL", "Netherlands");
  });

  it("should not include non-EU countries", () => {
    expect(EU_COUNTRIES).not.toHaveProperty("UK");
    expect(EU_COUNTRIES).not.toHaveProperty("US");
    expect(EU_COUNTRIES).not.toHaveProperty("CH");
    expect(EU_COUNTRIES).not.toHaveProperty("NO");
  });
});

describe("SOFTWARE_CPV_CODES", () => {
  it("should have valid CPV code format", () => {
    SOFTWARE_CPV_CODES.forEach((code) => {
      // CPV codes are 8 digits
      expect(code).toMatch(/^\d{8}$/);
    });
  });

  it("should include main IT services code", () => {
    expect(SOFTWARE_CPV_CODES).toContain("72000000");
  });

  it("should include software programming code", () => {
    expect(SOFTWARE_CPV_CODES).toContain("72200000");
  });

  it("should include software packages code", () => {
    expect(SOFTWARE_CPV_CODES).toContain("48000000");
  });

  it("should have at least 10 CPV codes", () => {
    expect(SOFTWARE_CPV_CODES.length).toBeGreaterThanOrEqual(10);
  });
});
