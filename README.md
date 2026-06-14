# FAILSAFE 🎓

An academic risk prediction system that identifies at-risk students early using machine learning, with explainable AI-driven intervention recommendations for faculty.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | FastAPI, Uvicorn |
| Database | PostgreSQL, SQLAlchemy |
| ML Models | XGBoost, scikit-learn, SHAP |
| Frontend | React + Vite |
| Auth | JWT (PyJWT), bcrypt |

## Project Structure

```
FAILSAFE/
├── backend/
│   ├── main.py            # FastAPI app — run this
│   ├── train.py           # ML training script
│   ├── database.py        # DB models & connection
│   ├── ml_models/         # Trained .pkl model & encoder files
│   │   └── shap_outputs/  # Precomputed SHAP plots & values
│   └── requirements.txt
├── frontend/              # React + Vite UI
│   ├── src/
│   ├── public/
│   └── package.json
└── README.md
```

## Models

Six XGBoost models trained across:
- **2 subjects:** Math, Portuguese
- **3 intervention stages:** Early (no grades), Mid1 (G1 available), Mid2 (G1 + G2 available)

SHAP values provide per-student explainability and drive intervention recommendations.

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL running locally

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Set your database URL as an environment variable:
```bash
export DATABASE_URL=postgresql://user:password@localhost/failsafe
```

Then run:
```bash
uvicorn main:app --reload
```

API will be available at `http://localhost:8000`  
Interactive docs at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:5173`

### Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Faculty | faculty@school.edu | faculty123 |
| HOD | hod@school.edu | hod123 |

> Change these before any deployment.

## Retraining Models

```bash
cd backend
python train.py
```

Trained models are saved to `ml_models/`. SHAP outputs are saved to `ml_models/shap_outputs/`.

## Dataset

Uses the [UCI Student Performance Dataset](https://archive.ics.uci.edu/dataset/320/student+performance) (Math & Portuguese subjects).