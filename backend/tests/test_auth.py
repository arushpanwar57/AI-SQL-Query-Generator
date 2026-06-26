import pytest
import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.core.security import validate_password_strength
from src.repositories.user import user_repository
from src.services.auth_service import auth_service
from src.models.models import User, ReservedUsername

def test_password_strength():
    # Too short
    assert validate_password_strength("Short1!") is not None
    # No uppercase
    assert validate_password_strength("lowercase123!") is not None
    # No number
    assert validate_password_strength("NoNumbersHere!") is not None
    # No special char
    assert validate_password_strength("NoSpecialChars123") is not None
    # Valid password
    assert validate_password_strength("StrongPass123!") is None

def test_username_reservation_policy(db_session: Session):
    # 1. Create a user
    user = User(username="alice", email="alice@example.com", hashed_password="hashed_password_123", role="viewer")
    db_session.add(user)
    db_session.commit()

    # 2. Update username to "alice_new"
    # This should store "alice" in ReservedUsername for 6 months
    auth_service.update_username(db_session, user, "alice_new")
    
    # 3. Check that "alice" is reserved
    assert user_repository.is_username_reserved(db_session, "alice") is True
    
    # 4. Check that we cannot update someone else to "alice"
    user2 = User(username="bob", email="bob@example.com", hashed_password="hashed_password_123", role="viewer")
    db_session.add(user2)
    db_session.commit()
    
    with pytest.raises(Exception) as exc_info:
        auth_service.update_username(db_session, user2, "alice")
    assert "reserved" in str(exc_info.value.detail).lower()

    # 5. Fast-forward expiration past 6 months
    reserved_entry = db_session.query(ReservedUsername).filter(ReservedUsername.username == "alice").first()
    reserved_entry.expires_at = datetime.datetime.utcnow() - datetime.timedelta(days=1)
    db_session.commit()

    # 6. Check that "alice" is now available
    assert user_repository.is_username_reserved(db_session, "alice") is False

def test_account_lockout_after_failed_attempts(db_session: Session):
    # Register user
    user = User(username="testlock", email="lock@example.com", hashed_password="hashed_password", role="viewer")
    db_session.add(user)
    db_session.commit()

    # Simulate 5 failed attempts
    for _ in range(5):
        user_repository.increment_failed_attempts(db_session, user, max_attempts=5, lockout_minutes=15)

    # Check that account is locked
    assert user.failed_login_attempts == 5
    assert user.locked_until is not None
    assert user.locked_until > datetime.datetime.utcnow()
