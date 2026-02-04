# TenderEU

A web application for searching EU public tenders for software development projects.

## Features

- Search for software development tenders from TED (Tenders Electronic Daily)
- Filter by EU country (multi-select)
- Maximum tender value: EUR 500,000
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
```

## Usage

1. Open http://localhost:3000 in your browser
2. Select one or more EU countries (optional)
3. Choose the number of results to display
4. Click "Search Tenders" to find available software development tenders
5. Expand "Detailed Requirements" on each tender card to view categorized requirements
6. Click "View on TED" to see the full tender on the official EU portal

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/countries` | GET | List of EU countries |
| `/api/tenders` | GET | Search tenders |

### Query Parameters for `/api/tenders`

| Parameter | Type | Description |
|-----------|------|-------------|
| `countries` | string | Comma-separated country codes (e.g., `DE,FR,NL`) |
| `limit` | number | Number of results (default: 10, max: 50) |

## CPV Codes

The application searches for tenders in the following software-related CPV categories:

- 72000000 - IT services: consulting, software development
- 72200000 - Software programming and consultancy
- 72210000 - Programming services of packaged software
- 72230000 - Custom software development
- 48000000 - Software packages and information systems

## License

MIT
