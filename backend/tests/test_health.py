import pytest
from sqlalchemy import text
from app.main import health_check, root
from app.config import Settings
from app.db import SessionLocal

def test_health_check_endpoint():
    res = health_check()
    assert res["status"] == "healthy"
    assert "system" in res
    assert "city" in res
    assert res["responsible_ai_policy"] == "NO_INDIVIDUAL_PROFILING"

def test_root_endpoint():
    res = root()
    assert "message" in res
    assert "docs_url" in res
    assert "city" in res

def test_cors_settings_parsing():
    s1 = Settings(BACKEND_CORS_ORIGINS="https://app.vercel.app, http://localhost:5173")
    assert "https://app.vercel.app" in s1.BACKEND_CORS_ORIGINS
    assert "http://localhost:5173" in s1.BACKEND_CORS_ORIGINS

    s2 = Settings(BACKEND_CORS_ORIGINS='["https://app.vercel.app"]')
    assert s2.BACKEND_CORS_ORIGINS == ["https://app.vercel.app"]

def test_database_connection_live():
    db = SessionLocal()
    try:
        result = db.execute(text("SELECT 1")).scalar()
        assert result == 1
    finally:
        db.close()

