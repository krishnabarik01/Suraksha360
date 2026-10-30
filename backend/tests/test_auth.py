import pytest
from app.services.auth_service import verify_password, get_password_hash, create_access_token
from jose import jwt
from app.config import settings

def test_password_hashing():
    raw = "beat123"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("wrongpassword", hashed) is False

def test_token_creation():
    token = create_access_token(data={"sub": "admin", "role": "Admin"})
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == "admin"
    assert payload["role"] == "Admin"
