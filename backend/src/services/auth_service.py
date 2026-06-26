import datetime
import uuid
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from src.models.models import User, UserSession
from src.schemas.schemas import UserCreate, Token
from src.repositories.user import user_repository
from src.repositories.history import history_repository
from src.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, validate_password_strength
from src.core.config import settings

class AuthService:
    def register_user(self, db: Session, user_in: UserCreate, ip_address: Optional[str] = None) -> User:
        # Validate strength
        pw_err = validate_password_strength(user_in.password)
        if pw_err:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pw_err)

        # Check existing username
        if user_repository.get_by_username(db, user_in.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username is already taken."
            )
            
        # Check if username is reserved (6 month policy)
        if user_repository.is_username_reserved(db, user_in.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This username was recently released and is reserved."
            )

        # Check existing email
        if user_repository.get_by_email(db, user_in.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered."
            )

        # First user is admin, others default to viewer (or developer if defined)
        # To make development testing easier, we check if users table is empty.
        is_first = db.query(User).count() == 0
        role = "admin" if is_first else "viewer"

        hashed_pw = get_password_hash(user_in.password)
        user = User(
            username=user_in.username,
            email=user_in.email,
            hashed_password=hashed_pw,
            role=role,
            is_active=True
        )
        created_user = user_repository.create(db, obj_in=user)
        
        # Log audit
        history_repository.create_audit_log(
            db,
            user_id=created_user.id,
            action="USER_REGISTRATION",
            ip_address=ip_address,
            details=f"User {created_user.username} registered with role {created_user.role}"
        )
        return created_user

    def authenticate_user(
        self, db: Session, username_or_email: str, password: str,
        ip_address: Optional[str] = None, user_agent: Optional[str] = None
    ) -> Tuple[User, Token]:
        user = user_repository.get_by_username_or_email(db, username_or_email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect username/email or password."
            )

        # Check lockout
        if user.locked_until and user.locked_until > datetime.datetime.utcnow():
            lock_duration = int((user.locked_until - datetime.datetime.utcnow()).total_seconds() / 60) + 1
            history_repository.create_audit_log(
                db, user_id=user.id, action="LOGIN_FAILED_LOCKED", ip_address=ip_address,
                details=f"Failed login attempt on locked account {user.username}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account locked. Try again in {lock_duration} minutes."
            )

        if not verify_password(password, user.hashed_password):
            # Increment failed attempts
            user_repository.increment_failed_attempts(
                db, user, max_attempts=settings.MAX_LOGIN_ATTEMPTS, lockout_minutes=settings.LOCKOUT_TIME_MINUTES
            )
            
            if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
                history_repository.create_audit_log(
                    db, user_id=user.id, action="ACCOUNT_LOCKOUT", ip_address=ip_address,
                    details=f"Account locked for {settings.LOCKOUT_TIME_MINUTES} minutes due to max failed attempts"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Incorrect password. Too many failed attempts. Account locked for {settings.LOCKOUT_TIME_MINUTES} minutes."
                )
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Incorrect username/email or password. Attempts remaining: {settings.MAX_LOGIN_ATTEMPTS - user.failed_login_attempts}"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account is deactivated."
            )

        # Reset failed attempts on success
        user_repository.reset_failed_attempts(db, user)

        # Create session tokens
        session_token = str(uuid.uuid4())
        refresh_token = str(uuid.uuid4())
        
        # Expire session in ACCESS_TOKEN_EXPIRE_MINUTES
        session_expiry = datetime.datetime.utcnow() + datetime.timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        session = user_repository.create_session(
            db,
            user_id=user.id,
            session_token=session_token,
            refresh_token=refresh_token,
            expires_at=session_expiry,
            ip_address=ip_address,
            user_agent=user_agent
        )

        access_token_expires = datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id), "role": user.role, "session_id": session.id},
            expires_delta=access_token_expires
        )
        refresh_token_jwt = create_refresh_token(
            data={"sub": str(user.id), "session_id": session.id, "refresh_token": refresh_token}
        )

        # Log audit
        history_repository.create_audit_log(
            db, user_id=user.id, action="USER_LOGIN", ip_address=ip_address,
            details=f"Successful login for {user.username}. Session id: {session.id}"
        )

        return user, Token(
            access_token=access_token,
            refresh_token=refresh_token_jwt,
            role=user.role
        )

    def refresh_user_session(
        self, db: Session, refresh_token_jwt: str,
        ip_address: Optional[str] = None, user_agent: Optional[str] = None
    ) -> Token:
        from src.core.security import decode_token
        try:
            payload = decode_token(refresh_token_jwt)
            if payload.get("type") != "refresh":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token type")
                
            user_id = int(payload.get("sub"))
            session_id = payload.get("session_id")
            uuid_refresh_token = payload.get("refresh_token")
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        session = db.query(UserSession).filter(
            UserSession.id == session_id,
            UserSession.user_id == user_id,
            UserSession.refresh_token == uuid_refresh_token,
            UserSession.is_active == True,
            UserSession.expires_at > datetime.datetime.utcnow()
        ).first()

        if not session:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or invalid")

        user = user_repository.get(db, user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is disabled")

        # Session is valid, rotate or reissue access token
        access_token_expires = datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        new_access_token = create_access_token(
            data={"sub": str(user.id), "role": user.role, "session_id": session.id},
            expires_delta=access_token_expires
        )
        
        # update last activity
        session.last_activity = datetime.datetime.utcnow()
        db.commit()

        return Token(
            access_token=new_access_token,
            refresh_token=refresh_token_jwt,  # Keep the same refresh token
            role=user.role
        )

    def logout_user(self, db: Session, session_id: int, ip_address: Optional[str] = None) -> None:
        session = db.query(UserSession).filter(UserSession.id == session_id).first()
        if session:
            session.is_active = False
            db.commit()
            
            history_repository.create_audit_log(
                db, user_id=session.user_id, action="USER_LOGOUT", ip_address=ip_address,
                details=f"Successful logout for user ID {session.user_id}. Session closed."
            )

    def update_username(self, db: Session, user: User, new_username: str, ip_address: Optional[str] = None) -> User:
        if new_username == user.username:
            return user
            
        if len(new_username) < 3:
            raise HTTPException(status_code=400, detail="Username must be at least 3 characters.")

        # Check availability
        existing = user_repository.get_by_username(db, new_username)
        if existing:
            raise HTTPException(status_code=400, detail="Username already in use.")

        # Check reserved
        if user_repository.is_username_reserved(db, new_username):
            raise HTTPException(status_code=400, detail="This username is reserved.")

        # Reserve the OLD username
        old_username = user.username
        user_repository.create_reserved_username(db, old_username, user.id)

        user.username = new_username
        db.commit()
        db.refresh(user)

        history_repository.create_audit_log(
            db, user_id=user.id, action="USERNAME_CHANGE", ip_address=ip_address,
            details=f"Username changed from '{old_username}' to '{new_username}'. Old username reserved for 6 months."
        )
        return user

    def change_user_role(self, db: Session, user_id: int, role: str, actor_id: int, ip_address: Optional[str] = None) -> User:
        user = user_repository.get(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
            
        old_role = user.role
        user.role = role
        db.commit()
        db.refresh(user)

        history_repository.create_audit_log(
            db, user_id=actor_id, action="USER_ROLE_CHANGED", ip_address=ip_address,
            details=f"Changed user {user.username} (ID {user.id}) role from {old_role} to {role}."
        )
        return user

auth_service = AuthService()
