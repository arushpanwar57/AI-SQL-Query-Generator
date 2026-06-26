from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from typing import List

from src.core.database import get_db
from src.core.limiter import limiter
from src.core.config import settings
from src.schemas.schemas import UserCreate, UserLogin, UserResponse, Token, UpdateUsernameRequest
from src.services.auth_service import auth_service
from src.api.deps import get_current_active_user, get_current_user
from src.models.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_AUTH)
def register(request: Request, user_in: UserCreate, db: Session = Depends(get_db)):
    ip_address = request.client.host if request.client else None
    return auth_service.register_user(db, user_in, ip_address=ip_address)

@router.post("/login", response_model=Token)
@limiter.limit(settings.RATE_LIMIT_AUTH)
def login(request: Request, credentials: UserLogin, db: Session = Depends(get_db)):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    user, tokens = auth_service.authenticate_user(
        db, 
        username_or_email=credentials.username, 
        password=credentials.password,
        ip_address=ip_address,
        user_agent=user_agent
    )
    return tokens

@router.post("/refresh", response_model=Token)
def refresh(request: Request, refresh_token: str, db: Session = Depends(get_db)):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return auth_service.refresh_user_session(db, refresh_token, ip_address=ip_address, user_agent=user_agent)

@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # session_id is encoded in token, get_current_user decodes it, but let's find the active session from request token
    # We can read the authorization header token
    from src.core.security import decode_token
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    payload = decode_token(token)
    session_id = payload.get("session_id")
    
    ip_address = request.client.host if request.client else None
    auth_service.logout_user(db, session_id, ip_address=ip_address)
    return {"detail": "Successfully logged out."}

@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.put("/username", response_model=UserResponse)
def update_username(
    request: Request,
    payload: UpdateUsernameRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    ip_address = request.client.host if request.client else None
    return auth_service.update_username(db, current_user, payload.new_username, ip_address=ip_address)
