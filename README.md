# TenderEU

A web application for searching EU public tenders for software development projects.

## Features

- Search for software development tenders from TED (Tenders Electronic Daily)
- Filter by EU country (multi-select from all 27 EU member states)
- Configurable maximum tender value (default: €500,000, max: €5,000,000)
- Configurable number of results (5, 10, 20, or 50)
- Detailed requirement extraction with categorized sections:
  - Technical Requirements
  - Functional Requirements
  - Compliance & Standards
  - Timeline & Delivery
- Responsive design for desktop and mobile
- Direct links to TED portal for full tender details

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: HTML, CSS, JavaScript
- **Testing**: Vitest (30 tests)
- **Data Source**: TED API (Tenders Electronic Daily)

## Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the server
npm start
```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Run tests
npm test
```

## Usage

1. Open http://localhost:3000 in your browser
2. Select one or more EU countries (optional)
3. Set the maximum tender value in EUR
4. Choose the number of results to display
5. Click "Search Tenders" to find available software development tenders
6. Expand "Detailed Requirements" on each tender card to view categorized requirements
7. Click "View on TED" to see the full tender on the official EU portal

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check with config info |
| `/api/countries` | GET | List of EU countries |
| `/api/tenders` | GET | Search tenders |

### Query Parameters for `/api/tenders`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `countries` | string | (all) | Comma-separated country codes (e.g., `DE,FR,NL`) |
| `limit` | number | 10 | Number of results (max: 50) |
| `maxValue` | number | 500000 | Maximum tender value in EUR (max: 5,000,000) |

### Example

```bash
curl "http://localhost:3000/api/tenders?countries=DE,FR&limit=5&maxValue=300000"
```

## CPV Codes

The application searches for tenders in the following software-related CPV categories:

| Code | Description |
|------|-------------|
| 72000000 | IT services: consulting, software development |
| 72200000 | Software programming and consultancy |
| 72210000 | Programming services of packaged software |
| 72230000 | Custom software development |
| 72240000 | Systems analysis and programming |
| 48000000 | Software packages and information systems |

## Security

The application includes the following security measures:

- XSS prevention via HTML escaping on all user-facing content
- URL sanitization (only allows `ted.europa.eu` links)
- Server-side input validation for country codes
- Input bounds checking for numeric parameters

## Testing

Run the test suite:

```bash
npm test
```

Test coverage includes:
- EU countries list validation
- CPV codes format validation
- Search filtering (country, value, limit)
- API client mock data structure
- Edge cases for value filtering

## License

MIT
