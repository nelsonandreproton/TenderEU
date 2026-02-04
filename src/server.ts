import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { SearchService } from "./services/searchService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DEFAULT_MAX_VALUE_EUR = 500000;
const ABSOLUTE_MAX_VALUE_EUR = 5000000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// API Routes
app.get("/api/countries", (_req, res) => {
  const searchService = new SearchService();
  const countries = searchService.getAvailableCountries();
  res.json(countries);
});

app.get("/api/tenders", async (req, res) => {
  try {
    const countriesParam = req.query.countries as string | undefined;
    const limitParam = req.query.limit as string | undefined;
    const maxValueParam = req.query.maxValue as string | undefined;

    const countries = countriesParam
      ? countriesParam
          .split(",")
          .map((c) => c.trim().toUpperCase())
          .filter((c) => /^[A-Z]{2}$/.test(c))
      : [];
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    const maxValue = maxValueParam
      ? Math.min(parseInt(maxValueParam, 10), ABSOLUTE_MAX_VALUE_EUR)
      : DEFAULT_MAX_VALUE_EUR;

    const searchService = new SearchService(maxValue);
    const result = await searchService.searchTenders({
      countries,
      maxValue,
      limit: Math.min(limit, 50),
    });

    res.json(result);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Failed to fetch tenders" });
  }
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    defaultMaxValue: DEFAULT_MAX_VALUE_EUR,
    absoluteMaxValue: ABSOLUTE_MAX_VALUE_EUR,
  });
});

// Serve frontend for all other routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`TenderEU server running at http://localhost:${PORT}`);
  console.log(`Default max value: €${DEFAULT_MAX_VALUE_EUR.toLocaleString()}`);
  console.log(`Absolute max value: €${ABSOLUTE_MAX_VALUE_EUR.toLocaleString()}`);
});
