import { describe, it, expect } from "vitest";
import { SearchService } from "../services/searchService.js";

describe("SearchService", () => {
  describe("getAvailableCountries", () => {
    it("should return all 27 EU countries", () => {
      const service = new SearchService();
      const countries = service.getAvailableCountries();

      expect(countries).toHaveLength(27);
    });

    it("should return countries sorted by name", () => {
      const service = new SearchService();
      const countries = service.getAvailableCountries();

      const names = countries.map((c) => c.name);
      const sorted = [...names].sort((a, b) => a.localeCompare(b));

      expect(names).toEqual(sorted);
    });

    it("should have correct structure for each country", () => {
      const service = new SearchService();
      const countries = service.getAvailableCountries();

      countries.forEach((country) => {
        expect(country).toHaveProperty("code");
        expect(country).toHaveProperty("name");
        expect(country.code).toMatch(/^[A-Z]{2}$/);
        expect(country.name.length).toBeGreaterThan(0);
      });
    });
  });

  describe("searchTenders", () => {
    it("should return tenders with correct structure", async () => {
      const service = new SearchService(500000);
      const result = await service.searchTenders({ limit: 5 });

      expect(result).toHaveProperty("tenders");
      expect(result).toHaveProperty("totalCount");
      expect(result).toHaveProperty("filters");
      expect(Array.isArray(result.tenders)).toBe(true);
    });

    it("should respect the limit parameter", async () => {
      const service = new SearchService(500000);
      const result = await service.searchTenders({ limit: 3 });

      expect(result.tenders.length).toBeLessThanOrEqual(3);
    });

    it("should filter by country when specified", async () => {
      const service = new SearchService(500000);
      const result = await service.searchTenders({
        countries: ["DE"],
        limit: 10,
      });

      result.tenders.forEach((tender) => {
        expect(tender.countryCode).toBe("DE");
      });
    });

    it("should filter by multiple countries", async () => {
      const service = new SearchService(500000);
      const result = await service.searchTenders({
        countries: ["DE", "FR"],
        limit: 10,
      });

      result.tenders.forEach((tender) => {
        expect(["DE", "FR"]).toContain(tender.countryCode);
      });
    });
  });
});

describe("SearchService with maxValue filter", () => {
  it("should filter tenders by max value", async () => {
    const service = new SearchService(300000);
    const result = await service.searchTenders({ limit: 20 });

    result.tenders.forEach((tender) => {
      if (tender.estimatedValue) {
        expect(tender.estimatedValue.amount).toBeLessThanOrEqual(300000);
      }
    });
  });

  it("should return fewer results with lower max value", async () => {
    const highValueService = new SearchService(500000);
    const lowValueService = new SearchService(200000);

    const highResult = await highValueService.searchTenders({ limit: 50 });
    const lowResult = await lowValueService.searchTenders({ limit: 50 });

    expect(lowResult.tenders.length).toBeLessThanOrEqual(
      highResult.tenders.length
    );
  });
});
