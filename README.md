# FraudIQ: Fraud Intelligence Platform

End-to-end fraud detection stack: engineered transaction features, an ensemble ML model (Isolation Forest + Logistic Regression + Random Forest), and a React operator dashboard with SHAP-based explainability.

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.4-F7931E?logo=scikitlearn&logoColor=white)](https://scikit-learn.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)

## Live Demo

The live deployment is split across two platforms:

- Frontend: Vercel (React + Vite app in `frontend/`)
- Backend API: Render Web Service (FastAPI app in `backend/`, deployed via `backend/Dockerfile`)

> **Cold start note:** The backend runs on Render's free tier, which spins down after 15 minutes of inactivity. The first request after a period of no traffic may take 20-40 seconds to respond. This is a hosting constraint, not an application bug. Subsequent requests are fast.

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
- **Why F1 is 0.40 while ROC-AUC is 0.97:** The IEEE-CIS dataset has a 3.5% fraud rate. At this imbalance, the default 0.5 decision threshold is optimistic toward the majority class, suppressing recall and pulling F1 down. ROC-AUC is the correct discriminative metric for imbalanced fraud detection -- it measures rank ordering across all thresholds rather than performance at one threshold. The ensemble correctly ranks 97% of fraud-legitimate pairs. Threshold calibration to the business's preferred precision/recall trade-off is a deployment-time decision, not a model quality issue.
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

## How To Review This Project

Use this 2-minute checklist for employer/reviewer verification.

### 1) Backend health

- URL: `https://fraud-detection-303p.onrender.com/health`
- Expected output:

```json
{"status":"ok","service":"Fraud Intelligence Platform"}
```

### 2) Model metrics (real-data proof)

- URL: `https://fraud-detection-303p.onrender.com/transactions/metrics`
- Expected fields in response:
	- `f1_score`
	- `roc_auc`
	- `dataset_size`
	- `summary`
- Example summary value:

```text
F1: 0.40 | ROC-AUC: 0.97 | Trained on 590,540 transactions
```

### 3) Frontend dashboard

- URL: `https://fraud-detection-jade.vercel.app/dashboard`
- Expected UI:
	- `Model Snapshot` bar at top with live metrics summary.
	- `Model Performance (Real Data)` card with F1/Precision/Recall/ROC-AUC.

### 4) Explainability page

- From Dashboard, open a transaction in `Top Fraud Alerts`.
- Expected UI on `/investigate/{transaction_id}`:
	- `Explainability Analysis (SHAP values)` section.
	- Horizontal contribution bars (red = pushes toward fraud, green = pushes away).
	- Tooltip with plain-English feature explanation on hover.

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
