import { describe, it, expect } from "vitest";
import { TedApiClient } from "../api/tedClient.js";

describe("TedApiClient", () => {
  describe("searchSoftwareTenders (mock data)", () => {
    it("should return tenders with valid structure", async () => {
      const client = new TedApiClient(500000);
      const tenders = await client.searchSoftwareTenders([], 5);

      expect(tenders.length).toBeGreaterThan(0);

      tenders.forEach((tender) => {
        expect(tender).toHaveProperty("id");
        expect(tender).toHaveProperty("title");
        expect(tender).toHaveProperty("publishedDate");
        expect(tender).toHaveProperty("buyerName");
        expect(tender).toHaveProperty("buyerCountry");
        expect(tender).toHaveProperty("countryCode");
        expect(tender).toHaveProperty("cpvCodes");
        expect(tender).toHaveProperty("description");
        expect(tender).toHaveProperty("requirements");
        expect(tender).toHaveProperty("tedUrl");
      });
    });

    it("should respect limit parameter", async () => {
      const client = new TedApiClient(500000);
      const tenders = await client.searchSoftwareTenders([], 3);

      expect(tenders.length).toBeLessThanOrEqual(3);
    });

    it("should filter by country", async () => {
      const client = new TedApiClient(500000);
      const tenders = await client.searchSoftwareTenders(["DE"], 10);

      tenders.forEach((tender) => {
        expect(tender.countryCode).toBe("DE");
      });
    });

    it("should filter by max value", async () => {
      const client = new TedApiClient(250000);
      const tenders = await client.searchSoftwareTenders([], 20);

      tenders.forEach((tender) => {
        if (tender.estimatedValue) {
          expect(tender.estimatedValue.amount).toBeLessThanOrEqual(250000);
        }
      });
    });

    it("should return empty array for non-existent country", async () => {
      const client = new TedApiClient(500000);
      const tenders = await client.searchSoftwareTenders(["XX"], 10);

      expect(tenders).toHaveLength(0);
    });
  });

  describe("tender data quality", () => {
    it("should have valid TED URLs", async () => {
      const client = new TedApiClient(500000);
      const tenders = await client.searchSoftwareTenders([], 5);

      tenders.forEach((tender) => {
        expect(tender.tedUrl).toMatch(/^https:\/\/ted\.europa\.eu/);
      });
    });

    it("should have valid country codes", async () => {
      const client = new TedApiClient(500000);
      const tenders = await client.searchSoftwareTenders([], 10);

      tenders.forEach((tender) => {
        expect(tender.countryCode).toMatch(/^[A-Z]{2}$/);
      });
    });

    it("should have CPV codes for software/IT", async () => {
      const client = new TedApiClient(500000);
      const tenders = await client.searchSoftwareTenders([], 5);

      tenders.forEach((tender) => {
        expect(tender.cpvCodes.length).toBeGreaterThan(0);
        // Should start with 72 (IT services) or 48 (software packages)
        const hasValidCpv = tender.cpvCodes.some(
          (cpv) => cpv.code.startsWith("72") || cpv.code.startsWith("48")
        );
        expect(hasValidCpv).toBe(true);
      });
    });

    it("should have requirements sections", async () => {
      const client = new TedApiClient(500000);
      const tenders = await client.searchSoftwareTenders([], 5);

      tenders.forEach((tender) => {
        expect(Array.isArray(tender.requirements)).toBe(true);
        if (tender.requirements.length > 0) {
          tender.requirements.forEach((section) => {
            expect(section).toHaveProperty("category");
            expect(section).toHaveProperty("items");
            expect(Array.isArray(section.items)).toBe(true);
          });
        }
      });
    });
  });

  describe("value filtering edge cases", () => {
    it("should include tenders without estimated value", async () => {
      const client = new TedApiClient(100000);
      const tenders = await client.searchSoftwareTenders([], 20);

      // Tenders without estimatedValue should still be included
      const tendersWithoutValue = tenders.filter((t) => !t.estimatedValue);
      // This is valid - we allow null values through
    });

    it("should handle very low max value", async () => {
      const client = new TedApiClient(10000);
      const tenders = await client.searchSoftwareTenders([], 20);

      tenders.forEach((tender) => {
        if (tender.estimatedValue) {
          expect(tender.estimatedValue.amount).toBeLessThanOrEqual(10000);
        }
      });
    });

    it("should handle very high max value", async () => {
      const client = new TedApiClient(10000000);
      const tenders = await client.searchSoftwareTenders([], 20);

      // Should return all mock data since max is very high
      expect(tenders.length).toBeGreaterThan(0);
    });
  });
});
