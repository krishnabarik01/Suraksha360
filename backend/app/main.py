from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.db import Base, engine, SessionLocal
from app.routers import (
    auth, incidents, risk, accidents, beats,
    units, routes, dispatch, prioritization,
    dashboard, audit, models_mgmt
)
from app.ml.risk_model import crime_risk_model

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist
    Base.metadata.create_all(bind=engine)
    # Auto-seed demo dataset if database is newly initialized
    try:
        from app.seed.seed_db import seed_database
        seed_database(force=False)
    except Exception as e:
        print(f"Auto-seed check notice: {e}")

    # Pre-train baseline model
    db = SessionLocal()
    try:
        crime_risk_model.train(db)
    except Exception as e:
        print(f"Initial model training notice: {e}")
    finally:
        db.close()
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "AI-Based Predictive Public-Safety, Emergency Response and Beat Intelligence System. "
        "Strictly area-level risk estimation. Predictions are advisory only. A human officer always decides."
    ),
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# CORS Middleware (Supports local dev, custom domain, and Vercel preview/production URLs)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|.*\.vercel\.app)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(risk.router, prefix=settings.API_V1_STR)
app.include_router(accidents.router, prefix=settings.API_V1_STR)
app.include_router(incidents.router, prefix=settings.API_V1_STR)
app.include_router(beats.router, prefix=settings.API_V1_STR)
app.include_router(units.router, prefix=settings.API_V1_STR)
app.include_router(routes.router, prefix=settings.API_V1_STR)
app.include_router(dispatch.router, prefix=settings.API_V1_STR)
app.include_router(prioritization.router, prefix=settings.API_V1_STR)
app.include_router(models_mgmt.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "system": settings.PROJECT_NAME,
        "city": settings.CITY_NAME,
        "mode": "area_level_preventive_advisory",
        "responsible_ai_policy": "NO_INDIVIDUAL_PROFILING"
    }

@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs_url": f"{settings.API_V1_STR}/docs",
        "city": settings.CITY_NAME
    }
