import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_

from src.models.models import User, UserSession, ReservedUsername
from src.repositories.base import BaseRepository

class UserRepository(BaseRepository[User]):
    def __init__(self):
        super().__init__(User)

    def get_by_username(self, db: Session, username: str) -> Optional[User]:
        return db.query(User).filter(User.username == username).first()

    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    def get_by_username_or_email(self, db: Session, identity: str) -> Optional[User]:
        return db.query(User).filter(
            or_(User.username == identity, User.email == identity)
        ).first()

    # Lockout Management
    def increment_failed_attempts(self, db: Session, user: User, max_attempts: int, lockout_minutes: int) -> User:
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= max_attempts:
            user.locked_until = datetime.datetime.utcnow() + datetime.timedelta(minutes=lockout_minutes)
        db.commit()
        db.refresh(user)
        return user

    def reset_failed_attempts(self, db: Session, user: User) -> User:
        user.failed_login_attempts = 0
        user.locked_until = None
        db.commit()
        db.refresh(user)
        return user

    # Session Management
    def create_session(
        self, db: Session, user_id: int, session_token: str, refresh_token: str,
        expires_at: datetime.datetime, ip_address: Optional[str] = None, user_agent: Optional[str] = None
    ) -> UserSession:
        session = UserSession(
            user_id=user_id,
            session_token=session_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
            is_active=True
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    def get_session(self, db: Session, session_token: str) -> Optional[UserSession]:
        return db.query(UserSession).filter(
            UserSession.session_token == session_token,
            UserSession.is_active == True
        ).first()

    def get_session_by_refresh_token(self, db: Session, refresh_token: str) -> Optional[UserSession]:
        return db.query(UserSession).filter(
            UserSession.refresh_token == refresh_token,
            UserSession.is_active == True
        ).first()

    def invalidate_session(self, db: Session, session_token: str) -> bool:
        session = db.query(UserSession).filter(UserSession.session_token == session_token).first()
        if session:
            session.is_active = False
            db.commit()
            return True
        return False

    def invalidate_all_user_sessions(self, db: Session, user_id: int) -> None:
        db.query(UserSession).filter(
            UserSession.user_id == user_id,
            UserSession.is_active == True
        ).update({"is_active": False}, synchronize_session=False)
        db.commit()

    def get_active_sessions(self, db: Session) -> List[UserSession]:
        # Return all sessions that are active and not expired
        now = datetime.datetime.utcnow()
        return db.query(UserSession).filter(
            UserSession.is_active == True,
            UserSession.expires_at > now
        ).all()

    # Reserved Username Management (6 Months rule)
    def is_username_reserved(self, db: Session, username: str) -> bool:
        self.release_expired_reserved_usernames(db)
        reserved = db.query(ReservedUsername).filter(
            ReservedUsername.username == username,
            ReservedUsername.expires_at > datetime.datetime.utcnow()
        ).first()
        return reserved is not None

    def create_reserved_username(self, db: Session, username: str, user_id: int) -> ReservedUsername:
        # reserve username for 6 months
        expires = datetime.datetime.utcnow() + datetime.timedelta(days=180) # ~ 6 months
        reserved = ReservedUsername(
            username=username,
            reserved_by_user_id=user_id,
            expires_at=expires
        )
        db.add(reserved)
        db.commit()
        db.refresh(reserved)
        return reserved

    def release_expired_reserved_usernames(self, db: Session) -> int:
        now = datetime.datetime.utcnow()
        deleted = db.query(ReservedUsername).filter(ReservedUsername.expires_at <= now).delete()
        if deleted > 0:
            db.commit()
        return deleted

user_repository = UserRepository()
