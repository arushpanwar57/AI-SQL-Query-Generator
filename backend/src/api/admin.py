from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from src.core.database import get_db
from src.schemas.schemas import DashboardStats, UserResponse, ChangeRoleRequest, AuditLogResponse, UserSessionResponse, DDLRequest, DDLResponse
from src.repositories.history import history_repository
from src.repositories.user import user_repository
from src.services.db_admin_service import db_admin_service
from src.api.deps import allow_admin, allow_developer
from src.models.models import User

router = APIRouter(prefix="/admin", tags=["Administration"])

@router.get("/stats", response_model=DashboardStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_admin)
):
    stats = history_repository.get_dashboard_stats(db)
    return stats

@router.get("/users", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_admin)
):
    users = user_repository.get_multi(db, limit=200)
    return users

@router.put("/users/role", response_model=UserResponse)
def change_role(
    request: Request,
    payload: ChangeRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_admin)
):
    ip_address = request.client.host if request.client else None
    updated_user = auth_service_change_role(db, user_id=payload.user_id, role=payload.role, actor_id=current_user.id, ip_address=ip_address)
    return updated_user

def auth_service_change_role(db: Session, user_id: int, role: str, actor_id: int, ip_address: str = None):
    # Import locally to avoid circular dependencies
    from src.services.auth_service import auth_service
    return auth_service.change_user_role(db, user_id, role, actor_id, ip_address)

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_admin)
):
    logs = history_repository.get_audit_logs(db, limit=100)
    # Convert models to include usernames in response
    response_logs = []
    for log in logs:
        username = log.user.username if log.user else "System"
        response_logs.append(
            AuditLogResponse(
                id=log.id,
                user_id=log.user_id,
                username=username,
                action=log.action,
                ip_address=log.ip_address,
                details=log.details,
                timestamp=log.timestamp
            )
        )
    return response_logs

@router.get("/sessions", response_model=List[UserSessionResponse])
def get_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_admin)
):
    sessions = user_repository.get_active_sessions(db)
    response_sessions = []
    for session in sessions:
        response_sessions.append(
            UserSessionResponse(
                id=session.id,
                user_id=session.user_id,
                username=session.user.username,
                session_token=session.session_token,
                ip_address=session.ip_address,
                user_agent=session.user_agent,
                last_activity=session.last_activity,
                expires_at=session.expires_at,
                is_active=session.is_active
            )
        )
    return response_sessions

@router.post("/ddl", response_model=DDLResponse)
def execute_ddl(
    request: Request,
    payload: DDLRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_developer)  # Allow developers and admins
):
    ip_address = request.client.host if request.client else None
    
    # Audit log the modification
    db_name = payload.connection_string.split("/")[-1].split("?")[0]
    history_repository.create_audit_log(
        db,
        user_id=current_user.id,
        action="DDL_EXECUTION",
        ip_address=ip_address,
        details=f"DDL SQL: '{payload.sql[:150]}...' executed on '{db_name}'."
    )

    try:
        db_admin_service.execute_ddl(payload.connection_string, payload.sql)
        return DDLResponse(success=True, message="DDL SQL executed successfully.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
