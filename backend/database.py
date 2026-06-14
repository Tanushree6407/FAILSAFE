from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, JSON, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/failsafe")

Base = declarative_base()
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    password_hash = Column(String)
    name = Column(String)
    role = Column(String, default="faculty")

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    student_ref = Column(String, unique=True)
    class_name = Column(String)
    subject = Column(String)

class Prediction(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    faculty_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    subject = Column(String)
    stage = Column(String)
    risk_probability = Column(Float)
    is_at_risk = Column(Boolean)
    top_factors = Column(JSON)
    interventions = Column(JSON)
    input_data = Column(JSON)
    predicted_at = Column(DateTime, default=datetime.utcnow)
    student = relationship("Student", backref="predictions")

class InterventionAction(Base):
    __tablename__ = "intervention_actions"
    id = Column(Integer, primary_key=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"))
    faculty_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    text = Column(Text)
    status = Column(String, default="pending")
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    Base.metadata.create_all(bind=engine)
