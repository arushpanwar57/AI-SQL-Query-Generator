from sqlalchemy import text
import logging

from src.core.database import create_target_engine

logger = logging.getLogger("db_admin_service")

class DbAdminService:
    def execute_ddl(self, connection_string: str, sql: str) -> bool:
        """
        Executes a schema-modifying DDL statement (CREATE, ALTER, DROP) on the target database.
        Runs inside a transaction block to auto-rollback if schema creation fails.
        """
        engine = create_target_engine(connection_string)
        sql_clean = sql.strip()
        
        try:
            with engine.begin() as conn:
                conn.execute(text(sql_clean))
            return True
        except Exception as e:
            logger.error(f"DDL execution failed: {e}")
            raise RuntimeError(f"Database DDL error: {str(e)}")

db_admin_service = DbAdminService()
