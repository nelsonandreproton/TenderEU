import { TedApiClient } from "../api/tedClient.js";
import { SearchFilters, SearchResult, EU_COUNTRIES } from "../models/tender.js";

export class SearchService {
  private tedClient: TedApiClient;

  constructor(maxValueEur: number = 500000) {
    this.tedClient = new TedApiClient(maxValueEur);
  }

  async searchTenders(filters: SearchFilters): Promise<SearchResult> {
    const countries = filters.countries || [];
    const limit = filters.limit || 10;

    const tenders = await this.tedClient.searchSoftwareTenders(countries, limit);

    return {
      tenders,
      totalCount: tenders.length,
      filters,
    };
  }

  getAvailableCountries(): { code: string; name: string }[] {
    return Object.entries(EU_COUNTRIES)
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
