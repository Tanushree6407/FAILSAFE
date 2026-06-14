"""
FAILSAFE — FastAPI Backend (complete)
Run: uvicorn main:app --reload
"""

from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, timedelta
from sqlalchemy import Integer
from sqlalchemy.orm import Session
import joblib
import pandas as pd
import numpy as np
import shap
import jwt
import bcrypt
import os
import io

from database import get_db, create_tables, User, Student, Prediction, InterventionAction

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="FAILSAFE API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    create_tables()
    _seed_users()

# ── Config ────────────────────────────────────────────────────────────────────
SECRET_KEY           = os.getenv("SECRET_KEY", "change-this-in-production")
ALGORITHM            = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 8
oauth2_scheme        = OAuth2PasswordBearer(tokenUrl="/auth/login")
MODEL_REGISTRY = {
    ("math",       "early"): "ml_models/model_math_early_tuned.pkl",
    ("math",       "mid1"):  "ml_models/model_math_mid1_tuned.pkl",
    ("math",       "mid2"):  "ml_models/model_math_mid2_tuned.pkl",
    ("portuguese", "early"): "ml_models/model_port_early_tuned.pkl",
    ("portuguese", "mid1"):  "ml_models/model_port_mid1_tuned.pkl",
    ("portuguese", "mid2"):  "ml_models/model_port_mid2_tuned.pkl",
}
ENCODER_REGISTRY = {"math": "ml_models/encoder1.pkl", "portuguese": "ml_models/encoder2.pkl"}

_model_cache     = {}
_encoder_cache   = {}
_explainer_cache = {}

CAT_COLS = ["school", "sex", "address", "famsize", "Pstatus", "Fjob", "Mjob",
            "guardian", "reason", "schoolsup", "famsup", "paid", "activities",
            "nursery", "higher", "internet", "romantic"]


def load_model(subject, stage):
    key = (subject, stage)
    if key not in _model_cache:
        path = MODEL_REGISTRY[key]
        if not os.path.exists(path):
            raise HTTPException(404, f"Model file {path} not found")
        _model_cache[key] = joblib.load(path)
    return _model_cache[key]

def load_encoder(subject):
    if subject not in _encoder_cache:
        path = ENCODER_REGISTRY[subject]
        if not os.path.exists(path):
            raise HTTPException(404, f"Encoder {path} not found")
        _encoder_cache[subject] = joblib.load(path)
    return _encoder_cache[subject]

def load_explainer(subject, stage):
    key = (subject, stage)
    if key not in _explainer_cache:
        subj_short = "math" if subject == "math" else "port"
        path = f"ml_models/shap_outputs/values/shap_model_{subj_short}_{stage}_tuned.pkl"
        _explainer_cache[key] = joblib.load(path) if os.path.exists(path) \
                                 else shap.TreeExplainer(load_model(subject, stage))
    return _explainer_cache[key]


# ── Schemas ───────────────────────────────────────────────────────────────────
class StudentInput(BaseModel):
    school: Literal["GP", "MS"]
    sex: Literal["F", "M"]
    age: int = Field(..., ge=15, le=22)
    address: Literal["U", "R"]
    famsize: Literal["LE3", "GT3"]
    Pstatus: Literal["T", "A"]
    Medu: int = Field(..., ge=0, le=4)
    Fedu: int = Field(..., ge=0, le=4)
    Mjob: str
    Fjob: str
    reason: str
    guardian: str
    traveltime: int = Field(..., ge=1, le=4)
    studytime: int = Field(..., ge=1, le=4)
    failures: int = Field(..., ge=0, le=4)
    schoolsup: Literal["yes", "no"]
    famsup: Literal["yes", "no"]
    paid: Literal["yes", "no"]
    activities: Literal["yes", "no"]
    nursery: Literal["yes", "no"]
    higher: Literal["yes", "no"]
    internet: Literal["yes", "no"]
    romantic: Literal["yes", "no"]
    famrel: int = Field(..., ge=1, le=5)
    freetime: int = Field(..., ge=1, le=5)
    goout: int = Field(..., ge=1, le=5)
    Dalc: int = Field(..., ge=1, le=5)
    Walc: int = Field(..., ge=1, le=5)
    health: int = Field(..., ge=1, le=5)
    absences: int = Field(..., ge=0, le=93)
    G1: Optional[float] = None
    G2: Optional[float] = None
    subject: Literal["math", "portuguese"] = "math"
    student_name: Optional[str] = None
    student_ref:  Optional[str] = None
    class_name:   Optional[str] = None

class PredictionResponse(BaseModel):
    id:               Optional[int] = None
    student_id:       Optional[int] = None
    student_ref:      Optional[str] = None
    subject:          str
    stage:            str
    risk_probability: float
    is_at_risk:       bool
    top_factors:      list[dict]
    interventions:    list[str]
    predicted_at:     Optional[str] = None

class ActionUpdate(BaseModel):
    status: Literal["pending", "in_progress", "done"]
    notes:  Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    role:         str
    name:         Optional[str] = None

class UserCreate(BaseModel):
    email:    str
    password: str
    name:     str
    role:     Literal["faculty", "hod"] = "faculty"


# ── Auth helpers ──────────────────────────────────────────────────────────────
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def check_pw(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())

def create_token(email: str, role: str) -> str:
    return jwt.encode(
        {"sub": email, "role": role,
         "exp": datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)},
        SECRET_KEY, algorithm=ALGORITHM
    )

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"email": payload["sub"], "role": payload["role"]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")

def require_hod(current_user=Depends(get_current_user)):
    if current_user["role"] != "hod":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "HOD access only")
    return current_user

def _seed_users():
    db = next(get_db())
    try:
        if db.query(User).count() == 0:
            db.add_all([
                User(email="faculty@school.edu", password_hash=hash_pw("faculty123"),
                     name="Dr. Smith", role="faculty"),
                User(email="hod@school.edu", password_hash=hash_pw("hod123"),
                     name="Prof. Head", role="hod"),
            ])
            db.commit()
    finally:
        db.close()


# ── ML helpers ────────────────────────────────────────────────────────────────
def build_feature_df(student: StudentInput, stage: str) -> pd.DataFrame:
    row = student.model_dump(
        exclude={"subject", "G1", "G2", "student_name", "student_ref", "class_name"}
    )
    if stage == "mid1":
        row["G1"] = student.G1 or 0
    elif stage == "mid2":
        row["G1"] = student.G1 or 0
        row["G2"] = student.G2 or 0
        row["grade_drop"] = row["G2"] - row["G1"]
    return pd.DataFrame([row])

def build_feature_df_from_row(row: dict, stage: str) -> pd.DataFrame:
    """Build feature dataframe from a raw CSV row dict."""
    exclude_keys = {"subject", "student_name", "student_ref", "class_name", "G3", "at_risk"}
    data = {k: v for k, v in row.items() if k not in exclude_keys}

    # Remove grade columns not needed for this stage
    if stage == "early":
        for col in ["G1", "G2", "grade_drop"]:
            data.pop(col, None)
    elif stage == "mid1":
        for col in ["G2", "grade_drop"]:
            data.pop(col, None)
    elif stage == "mid2":
        g1 = float(data.get("G1", 0))
        g2 = float(data.get("G2", 0))
        data["G1"] = g1
        data["G2"] = g2
        data["grade_drop"] = g2 - g1

    return pd.DataFrame([data])

def encode_features(df: pd.DataFrame, encoder) -> pd.DataFrame:
    cats    = [c for c in CAT_COLS if c in df.columns]
    encoded = encoder.transform(df[cats])
    cols    = encoder.get_feature_names_out(cats)
    return pd.concat(
        [df.drop(columns=cats),
         pd.DataFrame(encoded, columns=cols, index=df.index)], axis=1
    )

def get_interventions_list(shap_vals, feature_names, student_data, risk_prob: float = 0.0) -> list[str]:
    if hasattr(shap_vals, "ndim") and shap_vals.ndim == 2:
        shap_vals = shap_vals[1]
    shap_df = pd.DataFrame(
        {"feature": feature_names, "shap": shap_vals, "value": student_data.values}
    ).sort_values("shap", ascending=False)
    seen, result = set(), []
    for _, row in shap_df.iterrows():
        f, s, v = row["feature"], row["shap"], row["value"]
        if s <= 0: break
        msg = None
        if "absences"    in f and s > 0.3 and v > 5:    msg = "🔴 Attendance counselling — missing classes frequently"
        elif "failures"  in f and s > 0.3 and v > 0:    msg = "🔴 Enroll in remedial tutoring immediately"
        elif "grade_drop" in f and s > 0.3 and v < -2:  msg = "🔴 Urgent — significant grade decline, schedule faculty meeting"
        elif "G1"        in f and s > 0.3 and v < 10:    msg = "🔴 Very low first-period grade — extra classes recommended"
        elif "G2"        in f and s > 0.3 and v < 10:    msg = "🔴 Very low second-period grade — extra classes recommended"
        elif "Fedu" in f and s > 0.2 and v <= 1:        msg = "🔴  Low parental education - connect family with school support programmes"
        elif "Medu" in f and s > 0.2 and v <= 1:        msg = "🔴  Low parental education - connect family with school support programmes"
        elif "goout"     in f and s > 0.2 and v >= 4:   msg = "🟡 Lifestyle counselling — social activity affecting studies"
        elif "studytime" in f and s > 0.2 and v <= 2:   msg = "🟡 Assign study-skills workshop"
        elif "Walc"      in f and s > 0.2 and v >= 3:   msg = "🟡 Alcohol awareness counselling recommended"
        elif "Dalc"      in f and s > 0.2 and v >= 3:   msg = "🟡 Alcohol awareness counselling recommended"
        elif "schoolsup" in f and s > 0.2 and v == 1:   msg = "🟡 Review existing school support plan"
        elif "health"    in f and s > 0.2 and v <= 2:   msg = "🟢 Refer to health support services"
        elif "famrel"    in f and s > 0.2 and v <= 2:   msg = "🟢 Family relations counselling recommended"
        elif "famsup"    in f and s > 0.2 and v == 0:   msg = "🟢 Connect family with academic resources"
        elif "freetime"  in f and s > 0.2 and v >= 4:   msg = "🟢 Help student structure free time productively"
        elif "higher"    in f and s > 0.2 and v == 0:   msg = "🟢 Career guidance session recommended"
        elif "internet"  in f and s > 0.2 and v == 0:   msg = "🟢 Arrange library/school resource access"
        if msg and msg not in seen:
            result.append(msg); seen.add(msg)

    if not result:
        if risk_prob >= 0.5:
            top_feature = shap_df.iloc[0]["feature"] if len(shap_df) else "overall profile"
            result.append(f"🟡 Student flagged at-risk — schedule faculty review (top factor: {top_feature})")
        else:
            result.append("✅ No immediate intervention required")
    return result

def run_prediction(student: StudentInput, stage: str) -> dict:
    subject   = student.subject
    df        = build_feature_df(student, stage)
    X         = encode_features(df, load_encoder(subject))
    model     = load_model(subject, stage)
    risk_prob = float(model.predict_proba(X)[0, 1])
    shap_vals = load_explainer(subject, stage).shap_values(X)
    # Use class-1 SHAP values for "at risk"
    sv_arr = np.array(shap_vals)
    sv = sv_arr[1][0] if sv_arr.ndim == 3 else sv_arr[0]
    names     = X.columns.tolist()
    factors   = sorted(
        [{"feature": n, "shap": round(float(s), 4)} for n, s in zip(names, sv)],
        key=lambda x: abs(x["shap"]), reverse=True
    )[:10]
    return {
        "risk_probability": round(risk_prob, 4),
        "is_at_risk":       risk_prob >= 0.5,
        "top_factors":      factors,
        "interventions":    get_interventions_list(sv, names, X.iloc[0]),
    }

def run_prediction_from_df(df_row: pd.DataFrame, subject: str, stage: str) -> dict:
    """Run prediction from a pre-built (but not yet encoded) feature dataframe row."""
    X         = encode_features(df_row, load_encoder(subject))
    model     = load_model(subject, stage)
    risk_prob = float(model.predict_proba(X)[0, 1])
    shap_vals = load_explainer(subject, stage).shap_values(X)
    sv_arr = np.array(shap_vals)
    sv = sv_arr[1][0] if sv_arr.ndim == 3 else sv_arr[0]
    names     = X.columns.tolist()
    factors   = sorted(
        [{"feature": n, "shap": round(float(s), 4)} for n, s in zip(names, sv)],
        key=lambda x: abs(x["shap"]), reverse=True
    )[:10]
    return {
        "risk_probability": round(risk_prob, 4),
        "is_at_risk":       risk_prob >= 0.5,
        "top_factors":      factors,
        "interventions":    get_interventions_list(sv, names, X.iloc[0]),
    }

def get_or_create_student(db: Session, student: StudentInput):
    if not student.student_ref:
        return None
    row = db.query(Student).filter_by(student_ref=student.student_ref).first()
    if not row:
        row = Student(name=student.student_name, student_ref=student.student_ref,
                      class_name=student.class_name, subject=student.subject)
        db.add(row); db.flush()
    return row


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/auth/login", response_model=TokenResponse, tags=["auth"])
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=form.username).first()
    if not user or not check_pw(form.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    return {"access_token": create_token(user.email, user.role),
            "role": user.role, "name": user.name}

@app.get("/auth/me", tags=["auth"])
def me(current_user=Depends(get_current_user)):
    return current_user

@app.post("/auth/register", tags=["auth"])
def register(body: UserCreate, db: Session = Depends(get_db), _=Depends(require_hod)):
    if db.query(User).filter_by(email=body.email).first():
        raise HTTPException(409, "Email already registered")
    db.add(User(email=body.email, password_hash=hash_pw(body.password),
                name=body.name, role=body.role))
    db.commit()
    return {"message": "User created"}


# ═══════════════════════════════════════════════════════════════════════════════
# PREDICT — single student
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/predict/{stage}", response_model=PredictionResponse, tags=["predict"])
def predict(
    stage:   Literal["early", "mid1", "mid2"],
    student: StudentInput,
    db:      Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if stage == "mid1" and student.G1 is None:
        raise HTTPException(422, "G1 required for mid1")
    if stage == "mid2" and (student.G1 is None or student.G2 is None):
        raise HTTPException(422, "G1 and G2 required for mid2")

    result     = run_prediction(student, stage)
    db_student = get_or_create_student(db, student)
    db_user    = db.query(User).filter_by(email=current_user["email"]).first()

    pred = Prediction(
        student_id=db_student.id if db_student else None,
        faculty_id=db_user.id if db_user else None,
        subject=student.subject, stage=stage,
        risk_probability=result["risk_probability"],
        is_at_risk=result["is_at_risk"],
        top_factors=result["top_factors"],
        interventions=result["interventions"],
        input_data=student.model_dump(),
    )
    db.add(pred); db.flush()

    for iv in result["interventions"]:
        if iv != "✅ No immediate intervention required":
            db.add(InterventionAction(prediction_id=pred.id,
                                      faculty_id=db_user.id if db_user else None,
                                      text=iv, status="pending"))
    db.commit(); db.refresh(pred)

    return PredictionResponse(
        id=pred.id, student_id=pred.student_id, student_ref=student.student_ref,
        subject=pred.subject, stage=pred.stage,
        risk_probability=pred.risk_probability, is_at_risk=pred.is_at_risk,
        top_factors=pred.top_factors, interventions=pred.interventions,
        predicted_at=pred.predicted_at.isoformat(),
    )


# ═══════════════════════════════════════════════════════════════════════════════
# PREDICT — CSV bulk upload
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/predict/csv/{stage}", tags=["predict"])
async def predict_csv(
    stage:   Literal["early", "mid1", "mid2"],
    subject: Literal["math", "portuguese"] = Query("math"),
    file:    UploadFile = File(...),
    db:      Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents), sep=None, engine="python")
    except Exception as e:
        raise HTTPException(400, f"Could not parse CSV: {e}")

    df.columns = df.columns.str.strip().str.replace("\ufeff", "", regex=False)
    print("CSV COLUMNS:", df.columns.tolist())
    print("NUM COLUMNS:", len(df.columns))

    # Clean up column names (strip whitespace / BOM artifacts)
    df.columns = df.columns.str.strip().str.replace("\ufeff", "", regex=False)

    print("CSV COLUMNS:", df.columns.tolist())  # remove after debugging

    # Validate required grade columns
    if stage in ("mid1", "mid2") and "G1" not in df.columns:
        raise HTTPException(422, "CSV must contain G1 for mid1/mid2")
    if stage == "mid2" and "G2" not in df.columns:
        raise HTTPException(422, "CSV must contain G2 for mid2")

    db_user  = db.query(User).filter_by(email=current_user["email"]).first()
    results  = []
    errors   = []

    for idx, raw_row in df.iterrows():
        row = raw_row.to_dict()
        row_num = int(idx) + 2  # +2: 1-indexed + header row

        try:
            feat_df = build_feature_df_from_row(row, stage)
            result  = run_prediction_from_df(feat_df, subject, stage)
        except Exception as e:
            errors.append({"row": row_num, "error": str(e)})
            continue

        # Persist student if identifiers present
        db_student = None
        student_ref = str(row.get("student_ref", "")).strip()
        if student_ref:
            db_student = db.query(Student).filter_by(student_ref=student_ref).first()
            if not db_student:
                db_student = Student(
                    name=str(row.get("student_name", "")).strip() or None,
                    student_ref=student_ref,
                    class_name=str(row.get("class_name", "")).strip() or None,
                    subject=subject,
                )
                db.add(db_student)
                db.flush()

        pred = Prediction(
            student_id=db_student.id if db_student else None,
            faculty_id=db_user.id if db_user else None,
            subject=subject,
            stage=stage,
            risk_probability=result["risk_probability"],
            is_at_risk=result["is_at_risk"],
            top_factors=result["top_factors"],
            interventions=result["interventions"],
            input_data=row,
        )
        db.add(pred)
        db.flush()

        for iv in result["interventions"]:
            if iv != "✅ No immediate intervention required":
                db.add(InterventionAction(
                    prediction_id=pred.id,
                    faculty_id=db_user.id if db_user else None,
                    text=iv,
                    status="pending",
                ))

        results.append({
            "row": row_num,
            "student_ref": student_ref or None,
            "risk_probability": result["risk_probability"],
            "is_at_risk": result["is_at_risk"],
            "top_factors": result["top_factors"],
            "interventions": result["interventions"],
        })

    db.commit()

    at_risk_count = sum(1 for r in results if r["is_at_risk"])
    return {
        "processed": len(results),
        "errors":    len(errors),
        "at_risk":   at_risk_count,
        "safe":      len(results) - at_risk_count,
        "results":   results,
        "error_details": errors,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# INTERVENTIONS
# ═══════════════════════════════════════════════════════════════════════════════

@app.patch("/interventions/action/{action_id}", tags=["interventions"])
def update_action(action_id: int, body: ActionUpdate,
                  db: Session = Depends(get_db), _=Depends(get_current_user)):
    action = db.query(InterventionAction).filter_by(id=action_id).first()
    if not action: raise HTTPException(404, "Action not found")
    action.status     = body.status
    action.notes      = body.notes
    action.updated_at = datetime.utcnow()
    db.commit()
    return {"id": action.id, "status": action.status, "notes": action.notes}


# ═══════════════════════════════════════════════════════════════════════════════
# HOD DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/hod/summary", tags=["hod"])
def hod_summary(db: Session = Depends(get_db), _=Depends(require_hod)):
    total   = db.query(Prediction).count()
    at_risk = db.query(Prediction).filter_by(is_at_risk=True).count()

    def subject_stats(subj):
        t = db.query(Prediction).filter_by(subject=subj).count()
        r = db.query(Prediction).filter_by(subject=subj, is_at_risk=True).count()
        return {"total": t, "at_risk": r,
                "at_risk_pct": round(r / t * 100, 1) if t else 0}

    total_actions = db.query(InterventionAction).count()
    done_actions  = db.query(InterventionAction).filter_by(status="done").count()
    pending       = db.query(InterventionAction).filter_by(status="pending").count()
    in_progress   = db.query(InterventionAction).filter_by(status="in_progress").count()

    return {
        "overall": {
            "total": total, "at_risk": at_risk, "safe": total - at_risk,
            "at_risk_pct": round(at_risk / total * 100, 1) if total else 0
        },
        "by_subject": {
            "math":       subject_stats("math"),
            "portuguese": subject_stats("portuguese"),
        },
        "interventions": {
            "total":          total_actions,
            "done":           done_actions,
            "pending":        pending,
            "in_progress":    in_progress,
            "completion_pct": round(done_actions / total_actions * 100, 1) if total_actions else 0,
        }
    }

@app.get("/hod/at-risk-list", tags=["hod"])
def hod_at_risk_list(
    subject:    Optional[str] = None,
    stage:      Optional[str] = None,
    class_name: Optional[str] = None,
    limit:      int = Query(50, le=200),
    offset:     int = 0,
    db:         Session = Depends(get_db),
    _=Depends(require_hod)
):
    q = db.query(Prediction).filter_by(is_at_risk=True)
    if subject: q = q.filter_by(subject=subject)
    if stage:   q = q.filter_by(stage=stage)
    preds = q.order_by(Prediction.predicted_at.desc()).offset(offset).limit(limit).all()

    rows = []
    for p in preds:
        info = {}
        if p.student:
            if class_name and p.student.class_name != class_name: continue
            info = {"name": p.student.name, "ref": p.student.student_ref,
                    "class_name": p.student.class_name}

        # Fetch intervention action statuses for this prediction
        actions = db.query(InterventionAction).filter_by(prediction_id=p.id).all()
        action_summary = {
            "total":       len(actions),
            "pending":     sum(1 for a in actions if a.status == "pending"),
            "in_progress": sum(1 for a in actions if a.status == "in_progress"),
            "done":        sum(1 for a in actions if a.status == "done"),
        }

        rows.append({
            "prediction_id":    p.id,
            "student":          info,
            "subject":          p.subject,
            "stage":            p.stage,
            "risk_probability": p.risk_probability,
            "interventions":    p.interventions,
            "action_summary":   action_summary,
            "predicted_at":     p.predicted_at.isoformat(),
        })
    return {"count": len(rows), "results": rows}

@app.get("/hod/trend", tags=["hod"])
def hod_trend(days: int = Query(30, ge=7, le=365),
              db: Session = Depends(get_db), _=Depends(require_hod)):
    from sqlalchemy import func, cast, Date as SaDate
    cutoff = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(
            cast(Prediction.predicted_at, SaDate).label("day"),
            func.count().label("total"),
            func.sum(Prediction.is_at_risk.cast(Integer)).label("at_risk")
        )
        .filter(Prediction.predicted_at >= cutoff)
        .group_by("day").order_by("day").all()
    )
    return [{"date": str(r.day), "total": r.total, "at_risk": int(r.at_risk or 0)} for r in rows]

@app.get("/hod/top-interventions", tags=["hod"])
def hod_top_interventions(db: Session = Depends(get_db), _=Depends(require_hod)):
    from sqlalchemy import func
    rows = (
        db.query(
            InterventionAction.text,
            func.count().label("total"),
            func.sum((InterventionAction.status == "done").cast(Integer)).label("done")
        )
        .group_by(InterventionAction.text)
        .order_by(func.count().desc()).limit(15).all()
    )
    return [{"text": r.text, "total": r.total, "done": int(r.done or 0),
             "completion_pct": round(int(r.done or 0) / r.total * 100, 1)} for r in rows]


# ═══════════════════════════════════════════════════════════════════════════════
# STUDENT HISTORY
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/students/{student_ref}/history", tags=["students"])
def student_history(student_ref: str, db: Session = Depends(get_db),
                    _=Depends(get_current_user)):
    student = db.query(Student).filter_by(student_ref=student_ref).first()
    if not student: raise HTTPException(404, "Student not found")
    preds = db.query(Prediction).filter_by(student_id=student.id)\
              .order_by(Prediction.predicted_at.desc()).all()
    return {
        "student": {"id": student.id, "name": student.name,
                    "ref": student.student_ref, "class": student.class_name},
        "predictions": [
            {"id": p.id, "subject": p.subject, "stage": p.stage,
             "risk_probability": p.risk_probability, "is_at_risk": p.is_at_risk,
             "interventions": p.interventions, "predicted_at": p.predicted_at.isoformat()}
            for p in preds
        ]
    }

@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}