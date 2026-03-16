# Fraud Intelligence Platform

A professional financial fraud detection and investigation system built with FastAPI, PostgreSQL, scikit-learn, React, and TailwindCSS.

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
│   │   └── generate_dataset.py     # Synthetic dataset generator
│   └── data/
│       └── transactions.csv        # Sample dataset (2080 transactions)
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

### 3. Generate Sample Data

```bash
cd backend
python scripts/generate_dataset.py
```

The dataset is saved to `backend/data/transactions.csv` (2080 transactions, 80 users).

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
- Core endpoints verified locally: upload, overview, alerts, trends, network.
- This is a portfolio/demo app using synthetic data, not a production banking system.

---

## Features

| Feature | Description |
|---------|-------------|
| CSV Upload | Ingest transaction datasets with schema validation |
| Fraud Signal Engineering | Amount deviation, location jump, velocity, merchant novelty, device novelty |
| ML Ensemble Scoring | Isolation Forest + Logistic Regression + Random Forest |
| Explainable AI | Human-readable risk factor explanations per transaction |
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
| GET | `/transactions/overview` | Dashboard statistics |
| GET | `/transactions/alerts` | Fraud alerts (filtered by risk level) |
| GET | `/transactions/{id}` | Transaction detail + risk explanation |
| GET | `/transactions/{id}/user-history` | All transactions by same user |
| GET | `/transactions/{id}/merchant-history` | All transactions at same merchant |
| GET | `/transactions/analytics/trends` | Trend analytics data |
| GET | `/transactions/analytics/network` | Fraud network graph |
| POST | `/transactions/score` | Re-score transactions |

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
