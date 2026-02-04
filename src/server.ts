import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { SearchService } from "./services/searchService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_VALUE_EUR = 500000;

const searchService = new SearchService(MAX_VALUE_EUR);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// API Routes
app.get("/api/countries", (_req, res) => {
  const countries = searchService.getAvailableCountries();
  res.json(countries);
});

app.get("/api/tenders", async (req, res) => {
  try {
    const countriesParam = req.query.countries as string | undefined;
    const limitParam = req.query.limit as string | undefined;

    const countries = countriesParam
      ? countriesParam.split(",").filter((c) => c.trim())
      : [];
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    const result = await searchService.searchTenders({
      countries,
      maxValue: MAX_VALUE_EUR,
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
  res.json({ status: "ok", maxValue: MAX_VALUE_EUR });
});

// Serve frontend for all other routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`TenderEU server running at http://localhost:${PORT}`);
  console.log(`Maximum tender value: €${MAX_VALUE_EUR.toLocaleString()}`);
});
