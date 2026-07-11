# AI-Powered CRM CSV Importer

A high-performance, stateless full-stack CSV importer built for modern CRM systems. Users can drag-and-drop spreadsheets of any format (such as Facebook/Google lead exports, generic sales sheets, or manual spreadsheets), preview the raw data, and map them to a rigid CRM schema in batches using Anthropic's Claude 3.5 Haiku API.

---

## Features

- **Stateless Execution**: The backend holds no database. It chunks records, calls Claude with forced tool-use schemas, validates results, and streams progress back.
- **Real-Time Stream**: Uses Server-Sent Events (SSE) to prevent HTTP request timeouts for larger CSVs, reporting progress live to the user.
- **Virtualized Views**: Utilizes TanStack Virtual to render hundreds of success or skipped records smoothly at 60 FPS.
- **Robust Validation**: Zod schema validation maps incorrect status/source fields to blank and filters out rows without a minimum set of contact information (requires at least email or mobile).
- **Custom Aesthetic**: Implements a Vercel-like design with precise, technical typography (Space Grotesk + IBM Plex Mono) and state colors (mint match, amber review, coral skip).

---

## Technology Stack

- **Frontend**: Next.js 14 (App Router, TypeScript), Tailwind CSS, Framer Motion, TanStack Table, TanStack Virtual, react-dropzone, PapaParse.
- **Backend**: Node.js + Express (TypeScript, ESM), Anthropic Node SDK, Zod, p-retry (exponential backoff).

---

## CRM Schema Mapping Table

| Field Name | Type | Description / Rules |
| :--- | :--- | :--- |
| `created_at` | String | Creation date. Must be parseable by JavaScript's `new Date(created_at)`. |
| `name` | String | Full name of the lead. |
| `email` | String | Primary email address. If multiple emails exist, the first is used; others are appended to `crm_note`. |
| `country_code` | String | Dialing country code (e.g., `+1`, `+91`). |
| `mobile_without_country_code` | String | Mobile number excluding country dialing code. If multiple numbers exist, the first is used; others are appended to `crm_note`. |
| `company` | String | Company name. |
| `city` | String | City. |
| `state` | String | State or province. |
| `country` | String | Country. |
| `lead_owner` | String | Owner or agent assigned to this lead. |
| `crm_status` | String | **Strict enum**: Must be one of `GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, `SALE_DONE` — else left blank (`""`). |
| `data_source` | String | **Strict enum**: Must be one of `leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`, `sarjapur_plots` — else left blank (`""`). |
| `possession_time` | String | Timeline or date of possession. |
| `description` | String | Broad message, comments, or lead queries. |
| `crm_note` | String | Remarks, additional comments, and overflow details (e.g. secondary phones/emails). |

> [!WARNING]
> **Record Exclusion**: A record is completely excluded/skipped if it contains neither an `email` nor a `mobile_without_country_code`. The engine registers this skip and supplies the reason.

---

## Setup & Run Instructions

### 1. Backend Setup

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the environment variables:
   Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
   Add your Anthropic API Key:
   ```env
   ANTHROPIC_API_KEY=your_actual_anthropic_api_key_here
   ```
4. Start the development server (runs on `http://localhost:5000`):
   ```bash
   npm run dev
   ```
5. Run the validator test suite:
   ```bash
   npm run test
   ```

### 2. Frontend Setup

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development build:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

---

## Docker Deployment (Backend)

To package the backend server inside a Docker container:
```bash
cd backend
docker build -t crm-csv-importer-backend .
docker run -p 5000:5000 --env ANTHROPIC_API_KEY="your_api_key" crm-csv-importer-backend
```
