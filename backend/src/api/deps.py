from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import datetime

from src.core.config import settings
from src.core.database import get_db
from src.core.security import decode_token
from src.models.models import User, UserSession
from src.repositories.user import user_repository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(token)
    user_id_str: str = payload.get("sub")
    session_id: int = payload.get("session_id")
    token_type: str = payload.get("type")
    
    if user_id_str is None or session_id is None or token_type != "access":
        raise credentials_exception
        
    user_id = int(user_id_str)
    
    # Check active session
    session = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == user_id,
        UserSession.is_active == True,
        UserSession.expires_at > datetime.datetime.utcnow()
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or logged out."
        )

    # Update session activity
    session.last_activity = datetime.datetime.utcnow()
    db.commit()

    user = user_repository.get(db, id=user_id)
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action."
            )
        return current_user

# Role access helpers
allow_admin = RoleChecker(["admin"])
allow_developer = RoleChecker(["admin", "developer"])
allow_viewer = RoleChecker(["admin", "developer", "viewer"])
