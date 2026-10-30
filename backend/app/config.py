from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union
import json
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Suraksha360 - Predictive Public-Safety & Beat Intelligence"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-for-dev-safety-system-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./safecity.db")

    # City Demo Configuration (Raipur, Chhattisgarh)
    CITY_NAME: str = "Raipur, Chhattisgarh"
    CITY_LAT: float = 21.2514
    CITY_LON: float = 81.6296
    BOUNDS_MIN_LAT: float = 21.1800
    BOUNDS_MAX_LAT: float = 21.3200
    BOUNDS_MIN_LON: float = 81.5600
    BOUNDS_MAX_LON: float = 81.7100
    GRID_CELL_SIZE_KM: float = 0.5  # 500m cells
    TARGET_RESPONSE_TIME_MIN: float = 10.0

    # CORS
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_str = v.strip()
            if v_str.startswith("[") and v_str.endswith("]"):
                try:
                    parsed = json.loads(v_str)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except Exception:
                    pass
            return [i.strip() for i in v_str.split(",") if i.strip()]
        elif isinstance(v, list):
            return [str(item).strip() for item in v if str(item).strip()]
        return v

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()
