export interface Tender {
  id: string;
  title: string;
  publishedDate: string;
  deadline: string | null;
  buyerName: string;
  buyerCountry: string;
  countryCode: string;
  cpvCodes: CpvCode[];
  estimatedValue: EstimatedValue | null;
  description: string;
  requirements: RequirementSection[];
  tedUrl: string;
  procedureType: string | null;
  contractType: string | null;
}

export interface CpvCode {
  code: string;
  description: string;
}

export interface EstimatedValue {
  amount: number;
  currency: string;
}

export interface RequirementSection {
  category: string;
  items: string[];
}

export interface SearchFilters {
  countries?: string[];
  maxValue?: number;
  cpvCodes?: string[];
  limit?: number;
}

export interface SearchResult {
  tenders: Tender[];
  totalCount: number;
  filters: SearchFilters;
}

export const EU_COUNTRIES: Record<string, string> = {
  AT: "Austria",
  BE: "Belgium",
  BG: "Bulgaria",
  HR: "Croatia",
  CY: "Cyprus",
  CZ: "Czechia",
  DK: "Denmark",
  EE: "Estonia",
  FI: "Finland",
  FR: "France",
  DE: "Germany",
  GR: "Greece",
  HU: "Hungary",
  IE: "Ireland",
  IT: "Italy",
  LV: "Latvia",
  LT: "Lithuania",
  LU: "Luxembourg",
  MT: "Malta",
  NL: "Netherlands",
  PL: "Poland",
  PT: "Portugal",
  RO: "Romania",
  SK: "Slovakia",
  SI: "Slovenia",
  ES: "Spain",
  SE: "Sweden",
};

export const SOFTWARE_CPV_CODES = [
  "72000000", // IT services: consulting, software development, Internet and support
  "72200000", // Software programming and consultancy services
  "72210000", // Programming services of packaged software products
  "72211000", // Programming services of systems and user software
  "72212000", // Programming services of application software
  "72220000", // Systems and technical consultancy services
  "72230000", // Custom software development services
  "72240000", // Systems analysis and programming services
  "72250000", // System and support services
  "72260000", // Software-related services
  "72300000", // Data services
  "72400000", // Internet services
  "48000000", // Software packages and information systems
  "48200000", // Networking, Internet and intranet software package
  "48300000", // Document creation, drawing, imaging, scheduling and productivity software
  "48400000", // Business transaction and personal business software
  "48500000", // Communication and multimedia software
  "48600000", // Database and operating software
  "48700000", // Software package utilities
  "48800000", // Information systems and servers
  "48900000", // Miscellaneous software packages and computer systems
];
