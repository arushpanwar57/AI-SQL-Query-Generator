import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from src.models.models import QueryHistory, AuditLog, User, UserSession
from src.repositories.base import BaseRepository

class HistoryRepository(BaseRepository[QueryHistory]):
    def __init__(self):
        super().__init__(QueryHistory)

    def create_history(
        self, db: Session, user_id: int, prompt: str, generated_sql: str,
        execution_status: str, execution_time_ms: float, rows_affected: int,
        database_name: str, connection_string: Optional[str] = None
    ) -> QueryHistory:
        # Scrub password from connection string for security before storing
        scrubbed_conn = None
        if connection_string:
            # simple scrubber
            parts = connection_string.split("@")
            if len(parts) > 1:
                prefix = parts[0].split("://")
                protocol = prefix[0]
                host = parts[1]
                scrubbed_conn = f"{protocol}://***:***@{host}"
            else:
                scrubbed_conn = connection_string

        history_item = QueryHistory(
            user_id=user_id,
            prompt=prompt,
            generated_sql=generated_sql,
            execution_status=execution_status,
            execution_time_ms=execution_time_ms,
            rows_affected=rows_affected,
            database_name=database_name,
            connection_string=scrubbed_conn
        )
        db.add(history_item)
        db.commit()
        db.refresh(history_item)
        return history_item

    def get_user_history(self, db: Session, user_id: int, search: Optional[str] = None) -> List[QueryHistory]:
        query = db.query(QueryHistory).filter(QueryHistory.user_id == user_id)
        if search:
            query = query.filter(
                (QueryHistory.prompt.ilike(f"%{search}%")) |
                (QueryHistory.generated_sql.ilike(f"%{search}%")) |
                (QueryHistory.database_name.ilike(f"%{search}%"))
            )
        return query.order_by(desc(QueryHistory.timestamp)).all()

    # Audit Logging
    def create_audit_log(
        self, db: Session, user_id: Optional[int], action: str, ip_address: Optional[str], details: Optional[str]
    ) -> AuditLog:
        audit = AuditLog(
            user_id=user_id,
            action=action,
            ip_address=ip_address,
            details=details
        )
        db.add(audit)
        db.commit()
        db.refresh(audit)
        return audit

    def get_audit_logs(self, db: Session, skip: int = 0, limit: int = 100) -> List[AuditLog]:
        return db.query(AuditLog).order_by(desc(AuditLog.timestamp)).offset(skip).limit(limit).all()

    # Analytics for Dashboards
    def get_dashboard_stats(self, db: Session) -> Dict[str, Any]:
        total_users = db.query(User).count()
        total_queries = db.query(QueryHistory).count()
        total_audit_logs = db.query(AuditLog).count()
        
        now = datetime.datetime.utcnow()
        active_sessions = db.query(UserSession).filter(
            UserSession.is_active == True,
            UserSession.expires_at > now
        ).count()
        
        # Status breakdown
        status_groups = db.query(
            QueryHistory.execution_status, func.count(QueryHistory.id)
        ).group_by(QueryHistory.execution_status).all()
        status_dict = {status: count for status, count in status_groups}

        # Daily query statistics (past 7 days)
        seven_days_ago = now - datetime.timedelta(days=7)
        daily_stats = db.query(
            func.date(QueryHistory.timestamp).label("date"),
            func.count(QueryHistory.id).label("count")
        ).filter(QueryHistory.timestamp >= seven_days_ago)\
         .group_by(func.date(QueryHistory.timestamp))\
         .order_by(func.date(QueryHistory.timestamp)).all()
        
        daily_list = [{"date": str(row.date), "count": row.count} for row in daily_stats]

        # Top Users by query volume
        top_user_stats = db.query(
            User.username, func.count(QueryHistory.id).label("count")
        ).join(QueryHistory, User.id == QueryHistory.user_id)\
         .group_by(User.username)\
         .order_by(desc("count"))\
         .limit(5).all()
        
        top_users_list = [{"username": row.username, "count": row.count} for row in top_user_stats]

        return {
            "total_users": total_users,
            "total_queries": total_queries,
            "total_audit_logs": total_audit_logs,
            "active_sessions": active_sessions,
            "queries_by_status": status_dict,
            "queries_by_day": daily_list,
            "top_users": top_users_list
        }

history_repository = HistoryRepository()
