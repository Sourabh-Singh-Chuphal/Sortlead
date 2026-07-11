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

---

## Cloud Hosting & Deployment Guide

This project is structured as a monorepo, making it easy to deploy the backend and frontend separately.

### 1. Push Code to GitHub

First, publish the local git repository to your GitHub account:
1. Create a new, empty repository on GitHub named `crm-csv-importer`.
2. Link the repository and push your commits:
   ```bash
   git remote add origin https://github.com/<your-username>/crm-csv-importer.git
   git branch -M main
   git push -u origin main
   ```

### 2. Deploy Backend on Render

Deploy the Node/Express backend using Render's native Docker build support:
1. Log in to [Render.com](https://render.com) and click **New > Web Service**.
2. Select your GitHub repository.
3. Configure the service settings:
   - **Name**: `crm-csv-importer-backend`
   - **Runtime**: `Docker` (Render will auto-detect `/backend/Dockerfile` since it resides in the directory)
   - **Root Directory**: `backend` (Important: Set this to `backend`!)
4. Add your **Environment Variables**:
   - `ANTHROPIC_API_KEY`: `your_anthropic_api_key`
   - `NODE_ENV`: `production`
5. Click **Create Web Service**. Once built, copy your service's URL (e.g., `https://crm-csv-importer-backend.onrender.com`).

### 3. Deploy Frontend on Vercel

Deploy the Next.js app to Vercel:
1. Log in to [Vercel.com](https://vercel.com) and click **Add New > Project**.
2. Select your GitHub repository.
3. Configure the project:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click *Edit* and select the `frontend` folder.
4. Add your **Environment Variables**:
   - `NEXT_PUBLIC_BACKEND_URL`: Set this to your Render backend URL (e.g., `https://crm-csv-importer-backend.onrender.com`).
5. Click **Deploy**. Vercel will build and host the frontend. Open the provided Vercel URL to access your live production app!

---

### 4. Deploy to Google Cloud Platform (GCP)

Both the frontend and backend can be hosted serverless on **Google Cloud Run** using the provided Dockerfiles.

#### Step A: Configure gcloud CLI
Ensure you are logged in and targeting your active project:
```bash
gcloud auth login
gcloud config set project amdproject-494006
```

#### Step B: Deploy Backend to Cloud Run
Run the deployment command from the root of the project. Replace `YOUR_ANTHROPIC_API_KEY` with your Anthropic Claude API Key:
```bash
gcloud run deploy crm-csv-importer-backend \
  --source backend/ \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY"
```
*Once finished, this command will output your backend Service URL (e.g., `https://crm-csv-importer-backend-xxxxxx-uc.a.run.app`).*

#### Step C: Deploy Frontend to Cloud Run
Run the deployment command for the Next.js app. Pass the backend URL as a build-time argument:
```bash
gcloud run deploy crm-csv-importer-frontend \
  --source frontend/ \
  --region us-central1 \
  --allow-unauthenticated \
  --build-arg="NEXT_PUBLIC_BACKEND_URL=https://crm-csv-importer-backend-xxxxxx-uc.a.run.app"
```
*Once finished, this command will output the frontend Service URL. Open it in your browser to access the live app on Google Cloud!*


