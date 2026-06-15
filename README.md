# Fraud Intelligence Platform

A professional financial fraud detection and investigation system built with FastAPI, PostgreSQL, scikit-learn, React, and TailwindCSS.

## Live Demo

The live deployment is split across two platforms:

- Frontend: Vercel (React + Vite app in `frontend/`)
- Backend API: Render Web Service (FastAPI app in `backend/`, deployed via `backend/Dockerfile`)

Architecture flow:

1. Browser loads frontend from Vercel.
2. Frontend calls FastAPI endpoints on Render using `VITE_API_BASE_URL`.
3. FastAPI reads/writes transaction data in PostgreSQL and returns analytics to the UI.

Required environment variables:

- Frontend (`frontend/.env` or Vercel Environment Variables)
	- `VITE_API_BASE_URL=https://your-render-backend.onrender.com`
- Backend (Render Environment Variables)
	- `DATABASE_URL=<your-postgres-connection-string>`
	- `ENVIRONMENT=production`
	- `CORS_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com`

Health check endpoint for Render:

- `GET /health`

---

## Architecture

```
fraud-detection/
├── backend/                  # FastAPI + ML backend
│   ├── app/
│   │   ├── main.py           # FastAPI app + CORS
│   │   ├── config.py         # Settings (env vars)
│   │   ├── database.py       # SQLAlchemy engine
│   │   ├── models.py         # ORM models
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── feature_engineering.py  # Fraud signal computation
│   │   ├── fraud_models.py   # Isolation Forest + LR + RF ensemble
│   │   └── routers/
│   │       └── transactions.py     # All API endpoints
│   ├── scripts/
│   │   └── generate_dataset.py     # IEEE-CIS Kaggle dataset downloader + mapper
│   └── data/
│       └── transactions.csv        # Real mapped dataset (~590k transactions)
├── frontend/                 # React + TypeScript
│   └── src/
│       ├── pages/            # Dashboard, Alerts, Investigate, Network, Analytics, Upload
│       ├── components/       # Reusable UI components
│       ├── api/              # Axios API client
│       └── types/            # TypeScript types
└── docker-compose.yml
```

---

## Quick Start (Docker)

```bash
docker-compose up --build
```

Then visit:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Manual Setup (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+

### 1. Database

```bash
createdb fraud_detection
```

### 2. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install fastapi "uvicorn[standard]" sqlalchemy alembic pandas numpy scikit-learn python-multipart pydantic pydantic-settings python-dotenv scipy networkx psycopg2-binary

# Copy env template
# Windows (PowerShell): copy .env.example .env
# macOS/Linux: cp .env.example .env

uvicorn app.main:app --reload --port 8000
```

### 3. Generate Real Dataset (IEEE-CIS)

```bash
cd backend
python scripts/generate_dataset.py
```

This downloads/processes IEEE-CIS data from Kaggle (with mirror fallback) and saves mapped output to `backend/data/transactions.csv`.

Typical output size: `590,540` transactions with real fraud labels.

### 4. Upload Data via UI

1. Open http://localhost:3000/upload
2. Either upload `backend/data/transactions.csv` (quick demo) or upload your own CSV.
3. Ensure your custom CSV includes required columns:
	transaction_id, user_id, timestamp, amount, merchant, merchant_category, location, device_type
4. Optional columns:
	latitude, longitude
5. The platform ingests, analyzes, and scores all transactions automatically.

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 6. One-command scripts (Windows)

From the repo root:

```powershell
.\start-backend.ps1
```

In a second terminal:

```powershell
.\start-frontend.ps1
```

---

## Quality Status

- Frontend TypeScript build passes (`npm run build`).
- Backend health endpoint responds at `/health`.
- Core endpoints verified locally and in production: upload, overview, alerts, trends, network, metrics.
- Current model metrics (real data): `F1: 0.40 | ROC-AUC: 0.97 | Trained on 590,540 transactions`.
- Explainability includes SHAP value contributions on transaction investigation pages.

---

## Deploy Guide (Vercel + Backend Host)

Vercel is ideal for the React frontend. The FastAPI + ML backend should be deployed on a backend host (Render, Railway, Fly.io, or similar).

### 1. Deploy Backend (Render recommended)

Use Docker deployment with `backend/Dockerfile`.

Set backend environment variables:

- `DATABASE_URL` = your hosted Postgres connection string
- `ENVIRONMENT` = `production`
- `CORS_ORIGINS` = your Vercel frontend URL(s), comma-separated

Example:

```text
CORS_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com
```

After deploy, verify:

- `https://your-backend-url/health`

### 2. Deploy Frontend on Vercel

In Vercel project settings:

- Framework Preset: `Vite`
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

Set frontend environment variable:

- `VITE_API_BASE_URL` = your backend URL

Example:

```text
VITE_API_BASE_URL=https://your-backend-url
```

### 3. Verify Deployment

1. Open your Vercel URL.
2. Go to Upload page and upload sample or custom CSV.
3. Confirm Dashboard, Alerts, Analytics, Network pages load data.

### Notes

- The sample CSV is optional. Users can upload their own CSV if it follows required columns.
- Frontend API base URL is environment-driven via `VITE_API_BASE_URL`.
- CORS is environment-driven via `CORS_ORIGINS`.

---

## Features

| Feature | Description |
|---------|-------------|
| CSV Upload | Ingest transaction datasets with schema validation |
| Fraud Signal Engineering | Amount deviation, location jump, velocity, merchant novelty, device novelty |
| ML Ensemble Scoring | Isolation Forest + Logistic Regression + Random Forest |
| Explainable AI | Human-readable risk factor explanations per transaction |
| SHAP Explainability | Per-feature contribution bars (positive/negative impact) on investigation page |
| Fraud Dashboard | Overview stats, risk distribution, daily alerts chart |
| Alerts Table | All suspicious transactions sorted by risk score |
| Transaction Investigation | Full risk breakdown with user + merchant history |
| Network Analysis | Account relationship graph showing fraud clusters |
| Trend Analytics | Time-series alerts, probability distribution, top merchants, geographic risk |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/transactions/upload` | Upload CSV and run fraud analysis |
| GET | `/transactions/metrics` | Model metrics + summary string for portfolio/reviewer display |
| GET | `/transactions/overview` | Dashboard statistics |
| GET | `/transactions/alerts` | Fraud alerts (filtered by risk level) |
| GET | `/transactions/{id}` | Transaction detail + risk explanation |
| GET | `/transactions/{id}/user-history` | All transactions by same user |
| GET | `/transactions/{id}/merchant-history` | All transactions at same merchant |
| GET | `/transactions/analytics/trends` | Trend analytics data |
| GET | `/transactions/analytics/network` | Fraud network graph |
| POST | `/transactions/score` | Re-score transactions |

---

## Reviewer Quick Check

Use these to validate live deployment quickly:

- Backend health: `https://fraud-detection-303p.onrender.com/health`
- Backend metrics: `https://fraud-detection-303p.onrender.com/transactions/metrics`
- Frontend dashboard: `https://fraud-detection-jade.vercel.app/dashboard`

---

## Fraud Detection Models

**Isolation Forest** (35% weight)
Unsupervised anomaly detection. Detects statistical outliers in multi-dimensional feature space.

**Logistic Regression** (30% weight)
Supervised model trained on pseudo-labels from Isolation Forest. Interpretable coefficients.

**Random Forest** (35% weight)
Ensemble model providing feature importance scores for explainability.

**Features used:**
- `amount_deviation` — z-score of transaction amount vs user history
- `location_deviation` — km distance from user's previous transaction
- `transaction_velocity` — number of transactions in past hour
- `merchant_novelty` — first time user transacts at this merchant
- `device_novelty` — first time this device is used by user
- `amount` — absolute transaction amount

**Risk thresholds:**
- High: ≥ 65%
- Medium: 35–64%
- Low: < 35%
