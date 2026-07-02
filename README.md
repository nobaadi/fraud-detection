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

## Dataset

**IEEE-CIS Fraud Detection** -- Kaggle competition dataset published by Vesta Corporation.

- Source: [kaggle.com/c/ieee-fraud-detection](https://www.kaggle.com/c/ieee-fraud-detection)
- Size: 590,540 transactions across two CSV files (`train_transaction.csv`, `train_identity.csv`)
- Fraud rate: 3.5% (20,663 fraudulent transactions)
- Features: 434 raw columns including card type, billing address, device fingerprint, email domain, and Vesta's proprietary `V1-V339` engineered features (meaning undisclosed per NDA)
- Time span: approximately 6 months of production e-commerce transactions

**Why real data instead of synthetic:** Fraud patterns are high-dimensional and non-obvious. Synthetic generators produce transactions that look plausible but lack the correlation structures (e.g. card BIN clustering, device reuse patterns, email domain fraud rates) that make the problem hard. A model trained on synthetic data routinely fails on real transactions. Using the IEEE-CIS dataset means the model is evaluated against the same distribution it would encounter in production, and the ROC-AUC of 0.97 reflects real discriminative performance.

The `backend/scripts/generate_dataset.py` script downloads and maps the raw Kaggle CSVs to the application's transaction schema. Run it once before uploading data through the UI.

---

## ML Pipeline

Four sequential stages from raw CSV to per-transaction risk score:

### 1. Feature Engineering (`feature_engineering.py`)

The 434 raw IEEE-CIS columns are reduced to 6 interpretable features that map cleanly to fraud investigation workflows:

| Feature | Computation | Fraud signal |
|---------|-------------|--------------|
| `amount_deviation` | z-score of transaction amount vs. the user's historical mean and std | Unusual amounts relative to user behaviour |
| `location_deviation` | Haversine distance (km) from user's previous transaction | Impossible travel / location jump |
| `transaction_velocity` | Count of transactions by same user in the past hour | Card testing / velocity attack |
| `merchant_novelty` | Boolean: first time user transacts at this merchant | Account takeover at unfamiliar merchant |
| `device_novelty` | Boolean: first time this device fingerprint appears for this user | New device = potential credential theft |
| `amount` | Raw transaction amount | High-value transactions carry higher absolute risk |

### 2. Model Training (`fraud_models.py`)

Training runs as a two-pass semi-supervised approach due to the absence of ground-truth labels after the upload step:

- **Pass 1 -- Isolation Forest (35% weight):** Unsupervised anomaly detection on the 6-feature matrix. Contamination parameter set to 0.05 (slightly above the 3.5% fraud rate to account for near-miss anomalies). Produces pseudo-labels for pass 2.
- **Pass 2a -- Logistic Regression (30% weight):** Supervised model trained on Isolation Forest pseudo-labels. Class weights balanced to compensate for imbalance. Coefficients are directly interpretable as feature importance.
- **Pass 2b -- Random Forest (35% weight):** Ensemble model trained on pseudo-labels. Provides feature importance scores used to rank SHAP contributions in the investigation UI.

Ensemble score = `0.35 * IF_score + 0.30 * LR_score + 0.35 * RF_score`.

### 3. Threshold Calibration

The default ensemble score is continuous [0, 1]. Risk buckets are set at deployment time:

- High risk: score >= 0.65
- Medium risk: 0.35 <= score < 0.65
- Low risk: score < 0.35

These thresholds are configurable. A fraud operations team would tune them based on investigator capacity (how many alerts can be reviewed per day) and acceptable false-positive rate. The `/transactions/score` endpoint allows re-scoring with different thresholds without retraining.

### 4. Inference and Explainability

At inference time, each transaction's 6 features are computed in real-time from transaction history, scored by the ensemble, and stored in PostgreSQL. The investigation page (`/investigate/{id}`) shows:

- SHAP values: per-feature contribution to the final score (positive = pushes toward fraud, negative = pushes away)
- Human-readable risk factor text generated from the feature values
- User history and merchant history pulled from the same database

---

## Fraud Detection Models

**Isolation Forest** (35% weight)
Unsupervised anomaly detection. Detects statistical outliers in multi-dimensional feature space without requiring fraud labels.

**Logistic Regression** (30% weight)
Supervised model trained on pseudo-labels from Isolation Forest. Interpretable coefficients map directly to feature importance.

**Random Forest** (35% weight)
Ensemble model providing feature importance scores used for SHAP explainability.

**Risk thresholds:**
- High: >= 65%
- Medium: 35-64%
- Low: < 35%
