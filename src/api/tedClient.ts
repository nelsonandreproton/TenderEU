import {
  Tender,
  CpvCode,
  RequirementSection,
  SOFTWARE_CPV_CODES,
  EU_COUNTRIES,
} from "../models/tender.js";

const TED_API_BASE = "https://api.ted.europa.eu/v3";
const TED_WEBSITE_BASE = "https://ted.europa.eu/en/notice/-/detail";

interface TedSearchRequest {
  query: string;
  fields: string[];
  pageSize: number;
  page: number;
}

interface TedNotice {
  ND?: string;
  TI?: string;
  PD?: string;
  DT?: string;
  CY?: string;
  TW?: string;
  AC?: string;
  PC?: string;
  OC?: string[];
  RC?: string;
  NC?: string;
  PR?: string;
  TD?: string;
  OJ?: string;
  "total-value"?: string;
  "award-criterion"?: string;
  "contracting-authority"?: string;
  "short-description"?: string;
  TVL?: string;
  TVH?: string;
}

export class TedApiClient {
  private maxValueEur: number;

  constructor(maxValueEur: number = 500000) {
    this.maxValueEur = maxValueEur;
  }

  async searchSoftwareTenders(
    countries: string[] = [],
    limit: number = 10
  ): Promise<Tender[]> {
    const query = this.buildQuery(countries);

    try {
      const response = await fetch(`${TED_API_BASE}/notices/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query: query,
          fields: [
            "ND",
            "TI",
            "PD",
            "DT",
            "CY",
            "TW",
            "AC",
            "PC",
            "OC",
            "RC",
            "NC",
            "PR",
            "TD",
            "OJ",
            "TVL",
            "TVH",
          ],
          pageSize: Math.min(limit * 3, 100), // Fetch more to account for filtering
          page: 1,
        } as TedSearchRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("TED API Error:", response.status, errorText);
        throw new Error(`TED API error: ${response.status}`);
      }

      const data = await response.json() as { notices?: TedNotice[]; results?: TedNotice[] };
      const notices: TedNotice[] = data.notices || data.results || [];

      const tenders = await Promise.all(
        notices.slice(0, limit * 2).map((notice) => this.transformNotice(notice))
      );

      // Filter by max value and return requested limit
      return tenders
        .filter((t) => this.isWithinBudget(t))
        .slice(0, limit);
    } catch (error) {
      console.error("Failed to fetch from TED API:", error);
      // Return mock data for development/demo purposes
      return this.getMockTenders(countries, limit);
    }
  }

  private buildQuery(countries: string[]): string {
    const cpvQuery = SOFTWARE_CPV_CODES.map((code) => `PC=${code}*`).join(
      " OR "
    );

    let query = `(${cpvQuery})`;

    // Add country filter
    if (countries.length > 0) {
      const countryQuery = countries.map((c) => `CY=${c}`).join(" OR ");
      query += ` AND (${countryQuery})`;
    }

    // Filter for contract notices (CN) and active tenders
    query += ` AND TD=CN`;

    // Add value filter (TVL = Total Value Low estimate)
    query += ` AND TVL<=${this.maxValueEur}`;

    return query;
  }

  private async transformNotice(notice: TedNotice): Promise<Tender> {
    const countryCode = notice.CY || "EU";
    const value = this.parseValue(notice.TVL || notice.TVH);

    return {
      id: notice.ND || `TED-${Date.now()}`,
      title: notice.TI || "Untitled Tender",
      publishedDate: this.formatDate(notice.PD),
      deadline: notice.DT ? this.formatDate(notice.DT) : null,
      buyerName: notice.AC || notice["contracting-authority"] || "Unknown",
      buyerCountry: EU_COUNTRIES[countryCode] || countryCode,
      countryCode: countryCode,
      cpvCodes: this.parseCpvCodes(notice.PC, notice.OC),
      estimatedValue: value,
      description: notice.TW || notice["short-description"] || "",
      requirements: this.extractRequirements(
        notice.TW || notice["short-description"] || ""
      ),
      tedUrl: `${TED_WEBSITE_BASE}/${notice.ND}`,
      procedureType: notice.PR || null,
      contractType: notice.NC || "Services",
    };
  }

  private parseValue(
    valueStr: string | undefined
  ): { amount: number; currency: string } | null {
    if (!valueStr) return null;

    const numericValue = parseFloat(valueStr.replace(/[^0-9.]/g, ""));
    if (isNaN(numericValue)) return null;

    return {
      amount: numericValue,
      currency: "EUR",
    };
  }

  private isWithinBudget(tender: Tender): boolean {
    if (!tender.estimatedValue) return true; // Include if no value specified
    return tender.estimatedValue.amount <= this.maxValueEur;
  }

  private formatDate(dateStr: string | undefined): string {
    if (!dateStr) return new Date().toISOString().split("T")[0];

    // Handle various date formats from TED
    try {
      if (dateStr.length === 8) {
        // Format: YYYYMMDD
        return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
      }
      return new Date(dateStr).toISOString().split("T")[0];
    } catch {
      return dateStr;
    }
  }

  private parseCpvCodes(
    mainCode: string | undefined,
    additionalCodes: string[] | undefined
  ): CpvCode[] {
    const codes: CpvCode[] = [];

    if (mainCode) {
      codes.push({
        code: mainCode,
        description: this.getCpvDescription(mainCode),
      });
    }

    if (additionalCodes) {
      additionalCodes.forEach((code) => {
        codes.push({
          code: code,
          description: this.getCpvDescription(code),
        });
      });
    }

    return codes;
  }

  private getCpvDescription(code: string): string {
    const descriptions: Record<string, string> = {
      "72000000": "IT services: consulting, software development",
      "72200000": "Software programming and consultancy",
      "72210000": "Programming services of packaged software",
      "72211000": "Systems and user software programming",
      "72212000": "Application software programming",
      "72220000": "Systems and technical consultancy",
      "72230000": "Custom software development",
      "72240000": "Systems analysis and programming",
      "72250000": "System and support services",
      "72260000": "Software-related services",
      "72300000": "Data services",
      "72400000": "Internet services",
      "48000000": "Software packages and information systems",
    };

    const baseCode = code.slice(0, 8);
    return descriptions[baseCode] || "IT/Software services";
  }

  private extractRequirements(description: string): RequirementSection[] {
    const sections: RequirementSection[] = [];

    // Technical Requirements
    const technicalKeywords = [
      "technical",
      "system",
      "platform",
      "architecture",
      "integration",
      "API",
      "database",
      "cloud",
      "security",
      "performance",
      "scalability",
      "infrastructure",
    ];
    const technicalItems = this.extractItems(description, technicalKeywords);
    if (technicalItems.length > 0) {
      sections.push({ category: "Technical Requirements", items: technicalItems });
    }

    // Functional Requirements
    const functionalKeywords = [
      "function",
      "feature",
      "module",
      "user",
      "interface",
      "workflow",
      "process",
      "report",
      "dashboard",
      "management",
    ];
    const functionalItems = this.extractItems(description, functionalKeywords);
    if (functionalItems.length > 0) {
      sections.push({ category: "Functional Requirements", items: functionalItems });
    }

    // Compliance & Standards
    const complianceKeywords = [
      "compliance",
      "GDPR",
      "standard",
      "certification",
      "ISO",
      "regulation",
      "legal",
      "accessibility",
      "WCAG",
    ];
    const complianceItems = this.extractItems(description, complianceKeywords);
    if (complianceItems.length > 0) {
      sections.push({ category: "Compliance & Standards", items: complianceItems });
    }

    // Timeline & Delivery
    const timelineKeywords = [
      "deadline",
      "delivery",
      "phase",
      "milestone",
      "timeline",
      "duration",
      "month",
      "year",
      "implementation",
    ];
    const timelineItems = this.extractItems(description, timelineKeywords);
    if (timelineItems.length > 0) {
      sections.push({ category: "Timeline & Delivery", items: timelineItems });
    }

    // If no specific requirements found, create general section
    if (sections.length === 0 && description.length > 0) {
      const sentences = description
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 20 && s.length < 300);

      if (sentences.length > 0) {
        sections.push({
          category: "General Requirements",
          items: sentences.slice(0, 5),
        });
      }
    }

    return sections;
  }

  private extractItems(text: string, keywords: string[]): string[] {
    const sentences = text.split(/[.!?]+/).map((s) => s.trim());
    const items: string[] = [];

    for (const sentence of sentences) {
      if (sentence.length < 15 || sentence.length > 400) continue;

      const lowerSentence = sentence.toLowerCase();
      for (const keyword of keywords) {
        if (lowerSentence.includes(keyword.toLowerCase())) {
          items.push(sentence);
          break;
        }
      }
    }

    return [...new Set(items)].slice(0, 5);
  }

  private getMockTenders(countries: string[], limit: number): Tender[] {
    const mockData: Tender[] = [
      {
        id: "2024/S 001-000001",
        title: "Development of Digital Citizen Portal",
        publishedDate: "2024-01-15",
        deadline: "2024-03-01",
        buyerName: "Ministry of Digital Affairs",
        buyerCountry: "Germany",
        countryCode: "DE",
        cpvCodes: [
          { code: "72212000", description: "Application software programming" },
          { code: "72230000", description: "Custom software development" },
        ],
        estimatedValue: { amount: 450000, currency: "EUR" },
        description:
          "Development of a comprehensive digital citizen portal for accessing government services online. The platform must support multiple authentication methods, integrate with existing databases, and provide a modern responsive interface.",
        requirements: [
          {
            category: "Technical Requirements",
            items: [
              "RESTful API architecture with OpenAPI 3.0 specification",
              "Cloud-native deployment on EU-based infrastructure",
              "Integration with national eID systems",
              "Support for 10,000+ concurrent users",
            ],
          },
          {
            category: "Functional Requirements",
            items: [
              "User dashboard for tracking service requests",
              "Document upload and digital signature capability",
              "Multi-language support (minimum 3 EU languages)",
              "Automated notification system via email and SMS",
            ],
          },
          {
            category: "Compliance & Standards",
            items: [
              "GDPR compliance with data residency in EU",
              "WCAG 2.1 AA accessibility standards",
              "ISO 27001 security certification required",
            ],
          },
        ],
        tedUrl: "https://ted.europa.eu/en/notice/-/detail/2024-001",
        procedureType: "Open procedure",
        contractType: "Services",
      },
      {
        id: "2024/S 001-000002",
        title: "Healthcare Data Management System",
        publishedDate: "2024-01-12",
        deadline: "2024-02-28",
        buyerName: "National Health Service Agency",
        buyerCountry: "France",
        countryCode: "FR",
        cpvCodes: [
          { code: "72211000", description: "Systems and user software programming" },
          { code: "48000000", description: "Software packages" },
        ],
        estimatedValue: { amount: 380000, currency: "EUR" },
        description:
          "Implementation of a centralized healthcare data management system for regional hospitals. The system must handle patient records, appointment scheduling, and medical imaging integration.",
        requirements: [
          {
            category: "Technical Requirements",
            items: [
              "HL7 FHIR R4 compliance for health data interoperability",
              "DICOM integration for medical imaging",
              "High availability with 99.9% uptime SLA",
              "Encrypted data storage and transmission",
            ],
          },
          {
            category: "Functional Requirements",
            items: [
              "Patient record management with version history",
              "Appointment scheduling with calendar integration",
              "Prescription management module",
              "Analytics dashboard for hospital administrators",
            ],
          },
          {
            category: "Compliance & Standards",
            items: [
              "EU Medical Device Regulation compliance",
              "GDPR Article 9 special category data handling",
              "French HDS (Hébergeur de Données de Santé) certification",
            ],
          },
        ],
        tedUrl: "https://ted.europa.eu/en/notice/-/detail/2024-002",
        procedureType: "Open procedure",
        contractType: "Services",
      },
      {
        id: "2024/S 001-000003",
        title: "Public Transport Mobile Application",
        publishedDate: "2024-01-10",
        deadline: "2024-02-25",
        buyerName: "Metropolitan Transport Authority",
        buyerCountry: "Netherlands",
        countryCode: "NL",
        cpvCodes: [
          { code: "72212000", description: "Application software programming" },
          { code: "72400000", description: "Internet services" },
        ],
        estimatedValue: { amount: 290000, currency: "EUR" },
        description:
          "Development of a mobile application for real-time public transport information, ticket purchasing, and journey planning across the metropolitan area.",
        requirements: [
          {
            category: "Technical Requirements",
            items: [
              "Native iOS and Android applications",
              "Real-time GTFS data integration",
              "Offline mode with cached timetables",
              "Push notification service for delays and disruptions",
            ],
          },
          {
            category: "Functional Requirements",
            items: [
              "Journey planner with multi-modal routing",
              "Mobile ticket purchasing and validation",
              "Favorite routes and stations",
              "Accessibility features for visually impaired users",
            ],
          },
          {
            category: "Timeline & Delivery",
            items: [
              "MVP delivery within 6 months",
              "Full feature release within 12 months",
              "2-year maintenance and support period",
            ],
          },
        ],
        tedUrl: "https://ted.europa.eu/en/notice/-/detail/2024-003",
        procedureType: "Open procedure",
        contractType: "Services",
      },
      {
        id: "2024/S 001-000004",
        title: "Municipal Document Management System",
        publishedDate: "2024-01-08",
        deadline: "2024-02-20",
        buyerName: "City Council of Barcelona",
        buyerCountry: "Spain",
        countryCode: "ES",
        cpvCodes: [
          { code: "72230000", description: "Custom software development" },
          { code: "48300000", description: "Document creation software" },
        ],
        estimatedValue: { amount: 195000, currency: "EUR" },
        description:
          "Implementation of a document management system for municipal administration including workflow automation, digital archiving, and citizen request tracking.",
        requirements: [
          {
            category: "Technical Requirements",
            items: [
              "Integration with existing SAP infrastructure",
              "OCR capabilities for document digitization",
              "Full-text search with Elasticsearch",
              "Microservices architecture",
            ],
          },
          {
            category: "Functional Requirements",
            items: [
              "Document versioning and audit trail",
              "Customizable approval workflows",
              "Citizen portal for request submission",
              "Automated document classification",
            ],
          },
          {
            category: "Compliance & Standards",
            items: [
              "Spanish ENS (Esquema Nacional de Seguridad) compliance",
              "Long-term archival format support (PDF/A)",
              "Digital signature integration with @firma",
            ],
          },
        ],
        tedUrl: "https://ted.europa.eu/en/notice/-/detail/2024-004",
        procedureType: "Open procedure",
        contractType: "Services",
      },
      {
        id: "2024/S 001-000005",
        title: "Environmental Monitoring Dashboard",
        publishedDate: "2024-01-05",
        deadline: "2024-02-15",
        buyerName: "Environmental Protection Agency",
        buyerCountry: "Sweden",
        countryCode: "SE",
        cpvCodes: [
          { code: "72220000", description: "Systems and technical consultancy" },
          { code: "72300000", description: "Data services" },
        ],
        estimatedValue: { amount: 320000, currency: "EUR" },
        description:
          "Development of a real-time environmental monitoring dashboard aggregating data from IoT sensors across the country for air quality, water quality, and noise pollution tracking.",
        requirements: [
          {
            category: "Technical Requirements",
            items: [
              "IoT data ingestion supporting MQTT and CoAP protocols",
              "Time-series database for sensor data",
              "Real-time data visualization with WebSocket updates",
              "Geographic information system (GIS) integration",
            ],
          },
          {
            category: "Functional Requirements",
            items: [
              "Public-facing dashboard with historical data",
              "Alert system for threshold violations",
              "Data export in open formats (CSV, JSON)",
              "API for third-party data consumers",
            ],
          },
          {
            category: "Timeline & Delivery",
            items: [
              "Prototype within 3 months",
              "Pilot deployment in 2 regions within 6 months",
              "National rollout within 12 months",
            ],
          },
        ],
        tedUrl: "https://ted.europa.eu/en/notice/-/detail/2024-005",
        procedureType: "Open procedure",
        contractType: "Services",
      },
      {
        id: "2024/S 001-000006",
        title: "Education Learning Management System",
        publishedDate: "2024-01-03",
        deadline: "2024-02-10",
        buyerName: "Ministry of Education",
        buyerCountry: "Poland",
        countryCode: "PL",
        cpvCodes: [
          { code: "72212000", description: "Application software programming" },
          { code: "48000000", description: "Software packages" },
        ],
        estimatedValue: { amount: 485000, currency: "EUR" },
        description:
          "Development of a national learning management system for primary and secondary schools supporting online classes, assignments, grading, and parent communication.",
        requirements: [
          {
            category: "Technical Requirements",
            items: [
              "Support for 500,000+ concurrent users",
              "Video conferencing integration (WebRTC)",
              "Mobile-responsive design",
              "LTI integration for educational tools",
            ],
          },
          {
            category: "Functional Requirements",
            items: [
              "Course content management and curriculum mapping",
              "Assignment submission with plagiarism detection",
              "Gradebook with customizable grading scales",
              "Parent portal with progress tracking",
            ],
          },
          {
            category: "Compliance & Standards",
            items: [
              "SCORM 2004 compliance for content packages",
              "Child data protection (COPPA-equivalent)",
              "Accessibility for students with disabilities",
            ],
          },
        ],
        tedUrl: "https://ted.europa.eu/en/notice/-/detail/2024-006",
        procedureType: "Open procedure",
        contractType: "Services",
      },
      {
        id: "2024/S 001-000007",
        title: "Tax Filing Portal Modernization",
        publishedDate: "2024-01-02",
        deadline: "2024-02-05",
        buyerName: "Federal Tax Administration",
        buyerCountry: "Austria",
        countryCode: "AT",
        cpvCodes: [
          { code: "72230000", description: "Custom software development" },
          { code: "72260000", description: "Software-related services" },
        ],
        estimatedValue: { amount: 420000, currency: "EUR" },
        description:
          "Modernization of the citizen tax filing portal with improved user experience, pre-filled forms, and AI-assisted tax optimization suggestions.",
        requirements: [
          {
            category: "Technical Requirements",
            items: [
              "Migration from legacy monolith to microservices",
              "AI/ML integration for tax optimization",
              "High-security authentication (eIDAS)",
              "API gateway for third-party integrations",
            ],
          },
          {
            category: "Functional Requirements",
            items: [
              "Pre-filled tax forms from employer data",
              "Step-by-step wizard for tax filing",
              "Document upload with automatic data extraction",
              "Tax simulation and comparison tools",
            ],
          },
          {
            category: "Compliance & Standards",
            items: [
              "Austrian digital signature law compliance",
              "PCI-DSS for payment processing",
              "Data retention policies per tax regulations",
            ],
          },
        ],
        tedUrl: "https://ted.europa.eu/en/notice/-/detail/2024-007",
        procedureType: "Open procedure",
        contractType: "Services",
      },
      {
        id: "2024/S 001-000008",
        title: "Smart City IoT Platform",
        publishedDate: "2023-12-28",
        deadline: "2024-02-01",
        buyerName: "City of Helsinki",
        buyerCountry: "Finland",
        countryCode: "FI",
        cpvCodes: [
          { code: "72220000", description: "Systems and technical consultancy" },
          { code: "72400000", description: "Internet services" },
        ],
        estimatedValue: { amount: 375000, currency: "EUR" },
        description:
          "Development of a smart city IoT platform for managing urban infrastructure including smart lighting, parking sensors, and waste management optimization.",
        requirements: [
          {
            category: "Technical Requirements",
            items: [
              "Edge computing capabilities for latency-sensitive applications",
              "Support for LoRaWAN and NB-IoT protocols",
              "Kubernetes-based container orchestration",
              "Event-driven architecture with Apache Kafka",
            ],
          },
          {
            category: "Functional Requirements",
            items: [
              "Centralized device management dashboard",
              "Predictive maintenance alerts",
              "Energy consumption optimization algorithms",
              "Open data API for civic developers",
            ],
          },
          {
            category: "Timeline & Delivery",
            items: [
              "Architecture design within 2 months",
              "Core platform within 8 months",
              "Integration with existing city systems within 12 months",
            ],
          },
        ],
        tedUrl: "https://ted.europa.eu/en/notice/-/detail/2024-008",
        procedureType: "Open procedure",
        contractType: "Services",
      },
      {
        id: "2024/S 001-000009",
        title: "Cultural Heritage Digital Archive",
        publishedDate: "2023-12-22",
        deadline: "2024-01-30",
        buyerName: "National Museum",
        buyerCountry: "Italy",
        countryCode: "IT",
        cpvCodes: [
          { code: "72212000", description: "Application software programming" },
          { code: "72300000", description: "Data services" },
        ],
        estimatedValue: { amount: 245000, currency: "EUR" },
        description:
          "Creation of a digital archive platform for cultural heritage items including 3D artifact scanning, metadata management, and public research access.",
        requirements: [
          {
            category: "Technical Requirements",
            items: [
              "3D model viewer with WebGL support",
              "IIIF compliance for image interoperability",
              "Linked data support (RDF, SPARQL)",
              "High-resolution image processing pipeline",
            ],
          },
          {
            category: "Functional Requirements",
            items: [
              "Collection management with hierarchical organization",
              "Advanced search with faceted filtering",
              "Research annotation and collaboration tools",
              "Public exhibition virtual tours",
            ],
          },
          {
            category: "Compliance & Standards",
            items: [
              "Europeana Data Model (EDM) compliance",
              "Dublin Core metadata standards",
              "Long-term digital preservation (OAIS model)",
            ],
          },
        ],
        tedUrl: "https://ted.europa.eu/en/notice/-/detail/2024-009",
        procedureType: "Open procedure",
        contractType: "Services",
      },
      {
        id: "2024/S 001-000010",
        title: "Agricultural Subsidy Management System",
        publishedDate: "2023-12-20",
        deadline: "2024-01-25",
        buyerName: "Agriculture and Food Agency",
        buyerCountry: "Ireland",
        countryCode: "IE",
        cpvCodes: [
          { code: "72230000", description: "Custom software development" },
          { code: "72240000", description: "Systems analysis and programming" },
        ],
        estimatedValue: { amount: 410000, currency: "EUR" },
        description:
          "Development of a comprehensive agricultural subsidy management system for processing farmer applications, satellite-based verification, and payment disbursement.",
        requirements: [
          {
            category: "Technical Requirements",
            items: [
              "Satellite imagery integration (Copernicus/Sentinel)",
              "GIS-based land parcel identification",
              "Blockchain for audit trail and transparency",
              "Integration with banking systems for payments",
            ],
          },
          {
            category: "Functional Requirements",
            items: [
              "Online application portal for farmers",
              "Automated eligibility verification",
              "Inspection planning and mobile data collection",
              "Appeals management workflow",
            ],
          },
          {
            category: "Compliance & Standards",
            items: [
              "EU Common Agricultural Policy (CAP) compliance",
              "IACS (Integrated Administration and Control System) requirements",
              "Financial audit trail for EU funding",
            ],
          },
        ],
        tedUrl: "https://ted.europa.eu/en/notice/-/detail/2024-010",
        procedureType: "Open procedure",
        contractType: "Services",
      },
      {
        id: "2024/S 001-000011",
        title: "Judicial Case Management System",
        publishedDate: "2023-12-18",
        deadline: "2024-01-20",
        buyerName: "Ministry of Justice",
        buyerCountry: "Belgium",
        countryCode: "BE",
        cpvCodes: [
          { code: "72211000", description: "Systems and user software programming" },
          { code: "72230000", description: "Custom software development" },
        ],
        estimatedValue: { amount: 495000, currency: "EUR" },
        description:
          "Implementation of a modern case management system for civil and criminal courts including e-filing, scheduling, and integration with legal databases.",
        requirements: [
          {
            category: "Technical Requirements",
            items: [
              "Multi-tenant architecture for different court levels",
              "PDF/A generation for legal documents",
              "Advanced full-text search with legal terminology",
              "Real-time synchronization across court locations",
            ],
          },
          {
            category: "Functional Requirements",
            items: [
              "Electronic case filing with validation",
              "Court calendar and hearing scheduling",
              "Automatic deadline calculation",
              "Secure messaging between parties",
            ],
          },
          {
            category: "Compliance & Standards",
            items: [
              "Belgian judicial electronic signature requirements",
              "Court document retention regulations",
              "Trilingual support (Dutch, French, German)",
            ],
          },
        ],
        tedUrl: "https://ted.europa.eu/en/notice/-/detail/2024-011",
        procedureType: "Open procedure",
        contractType: "Services",
      },
      {
        id: "2024/S 001-000012",
        title: "Emergency Response Coordination Platform",
        publishedDate: "2023-12-15",
        deadline: "2024-01-15",
        buyerName: "Civil Protection Department",
        buyerCountry: "Portugal",
        countryCode: "PT",
        cpvCodes: [
          { code: "72220000", description: "Systems and technical consultancy" },
          { code: "72212000", description: "Application software programming" },
        ],
        estimatedValue: { amount: 340000, currency: "EUR" },
        description:
          "Development of an integrated emergency response coordination platform for managing natural disasters, coordinating first responders, and public alert systems.",
        requirements: [
          {
            category: "Technical Requirements",
            items: [
              "Real-time geolocation tracking of response units",
              "CAP (Common Alerting Protocol) integration",
              "Resilient architecture with offline capability",
              "Multi-channel communication (radio, cellular, satellite)",
            ],
          },
          {
            category: "Functional Requirements",
            items: [
              "Incident command system dashboard",
              "Resource allocation and dispatch",
              "Public alert dissemination (SMS, app, sirens)",
              "Post-incident reporting and analysis",
            ],
          },
          {
            category: "Timeline & Delivery",
            items: [
              "Core platform operational within 6 months",
              "Full integration with existing systems within 12 months",
              "Training and documentation delivery",
            ],
          },
        ],
        tedUrl: "https://ted.europa.eu/en/notice/-/detail/2024-012",
        procedureType: "Open procedure",
        contractType: "Services",
      },
    ];

    // Filter by country if specified
    let filtered = mockData;
    if (countries.length > 0) {
      filtered = mockData.filter((t) => countries.includes(t.countryCode));
    }

    // Filter by max value
    filtered = filtered.filter(
      (t) => !t.estimatedValue || t.estimatedValue.amount <= this.maxValueEur
    );

    return filtered.slice(0, limit);
  }
}
