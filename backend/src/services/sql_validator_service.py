import re
from typing import Dict, Any, List, Tuple
from sqlalchemy import text
import logging

from src.core.database import create_target_engine
from src.services.db_schema_service import db_schema_service

logger = logging.getLogger("validator_service")

class SqlValidatorService:
    def validate_sql(self, sql: str, connection_string: str) -> Dict[str, Any]:
        """
        Validates SQL query structure and syntax:
        1. Checks for empty query.
        2. Detects destructive operations without filters (WHERE).
        3. Executes a database 'EXPLAIN' statement to verify syntax, table existence, and type alignment.
        """
        sql_clean = sql.strip().strip(";").strip()
        if not sql_clean:
            return {
                "is_valid": False,
                "errors": ["Query is empty."],
                "warning_message": None,
                "is_destructive": False
            }

        sql_lower = sql_clean.lower()
        errors: List[str] = []
        warning_message = None
        is_destructive = False

        # 1. Regex check for dangerous queries (UPDATE/DELETE without WHERE)
        is_update = bool(re.search(r"\bupdate\b", sql_lower))
        is_delete = bool(re.search(r"\bdelete\b", sql_lower))
        has_where = bool(re.search(r"\bwhere\b", sql_lower))
        is_drop_truncate = bool(re.search(r"\b(drop|truncate)\b", sql_lower))

        if (is_update or is_delete) and not has_where:
            is_destructive = True
            action = "UPDATE" if is_update else "DELETE"
            warning_message = f"DANGER: This query attempts to {action} records across the entire table without a WHERE filter! This is highly destructive."
        elif is_drop_truncate:
            is_destructive = True
            warning_message = "DANGER: This query contains DDL commands (DROP/TRUNCATE) which will permanently delete structures or tables. Confirmation required."

        # 2. Database validation using EXPLAIN
        # This will verify syntax, column names, table names, types, and joins at the DB level.
        engine = create_target_engine(connection_string)
        try:
            with engine.connect() as conn:
                # EXPLAIN syntax works on both PostgreSQL and MySQL
                # Ensure we run explain on DML statements; explain on DROP/TRUNCATE/CREATE is not allowed or supported
                if not is_drop_truncate:
                    explain_query = f"EXPLAIN {sql_clean}"
                    conn.execute(text(explain_query))
        except Exception as e:
            # Parse DB error
            err_msg = str(e)
            # Make the DB error more user friendly
            friendly_err = self._cleanup_db_error(err_msg)
            errors.append(friendly_err)

        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "warning_message": warning_message,
            "is_destructive": is_destructive
        }

    def _cleanup_db_error(self, raw_error: str) -> str:
        """Parses complex SQLAlchemy/Database exception messages to extract the clean user-facing error."""
        # Look for programming error details
        if "ProgrammingError" in raw_error or "OperationalError" in raw_error:
            # Extract text within quotes or match known messages
            match = re.search(r"\((psycopg2\.errors\.\w+|pymysql\.err\.\w+)\)\s*(.*)", raw_error, re.DOTALL)
            if match:
                return match.group(2).strip()
        
        # Clean standard sql compilation errors
        clean = re.sub(r"\[SQL:.*?\]", "", raw_error)
        clean = re.sub(r"\(Background on this error at:.*?\)", "", clean)
        return clean.strip()

sql_validator_service = SqlValidatorService()
