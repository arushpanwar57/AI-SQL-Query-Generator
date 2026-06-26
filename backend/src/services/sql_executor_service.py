import time
import io
import csv
import json
from typing import Dict, Any, List, Optional
from sqlalchemy import text
import logging

from src.core.database import create_target_engine
from src.schemas.schemas import QueryExecuteResponse
from src.services.sql_validator_service import sql_validator_service

logger = logging.getLogger("executor_service")

class SqlExecutorService:
    def execute_query(self, sql: str, connection_string: str, confirmed: bool = False) -> QueryExecuteResponse:
        """
        Executes a validated query on the target database safely using transactional bounds:
        1. Validates the query and prevents execution of destructive commands if not confirmed.
        2. Measures exact database execution latency.
        3. Formats outputs and provides dynamic exports.
        """
        # Validate first
        validation = sql_validator_service.validate_sql(sql, connection_string)
        if not validation["is_valid"]:
            return QueryExecuteResponse(
                execution_time_ms=0.0,
                rows_affected=0,
                columns=[],
                data=[],
                error=f"SQL Validation Error: {', '.join(validation['errors'])}"
            )

        # Confirm destructive actions
        if validation["is_destructive"] and not confirmed:
            return QueryExecuteResponse(
                execution_time_ms=0.0,
                rows_affected=0,
                columns=[],
                data=[],
                error="Destructive query requires confirmation. Please verify your intent."
            )

        engine = create_target_engine(connection_string)
        start_time = time.perf_counter()
        
        try:
            with engine.begin() as conn:  # automatically starts a transaction and commits on success
                result = conn.execute(text(sql))
                
                columns = []
                data = []
                rows_affected = 0

                if result.returns_rows:
                    columns = list(result.keys())
                    # Convert values to serializable types
                    raw_rows = result.fetchall()
                    rows_affected = len(raw_rows)
                    for row in raw_rows:
                        serialized_row = []
                        for val in row:
                            # format dates/decimals/bytes to serializable strings
                            if hasattr(val, "isoformat"):
                                serialized_row.append(val.isoformat())
                            elif isinstance(val, bytes):
                                serialized_row.append(val.decode("utf-8", errors="ignore"))
                            elif hasattr(val, "__str__") and type(val).__name__ == "Decimal":
                                serialized_row.append(float(val))
                            else:
                                serialized_row.append(val)
                        data.append(serialized_row)
                else:
                    rows_affected = result.rowcount
                    if rows_affected < 0:
                        rows_affected = 0 # e.g. DDL queries return -1
                
                end_time = time.perf_counter()
                execution_time_ms = (end_time - start_time) * 1000.0

                # Generate export files
                export_csv = None
                export_json = None
                if columns and data:
                    export_csv = self._generate_csv(columns, data)
                    export_json = self._generate_json(columns, data)

                return QueryExecuteResponse(
                    execution_time_ms=round(execution_time_ms, 2),
                    rows_affected=rows_affected,
                    columns=columns,
                    data=data,
                    export_csv=export_csv,
                    export_json=export_json,
                    error=None
                )
        except Exception as e:
            logger.error(f"SQL execution failed: {e}")
            return QueryExecuteResponse(
                execution_time_ms=0.0,
                rows_affected=0,
                columns=[],
                data=[],
                error=f"Database Execution Error: {str(e)}"
            )

    def _generate_csv(self, columns: List[str], data: List[List[Any]]) -> str:
        """Generates a CSV string from columns and row data."""
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(columns)
        writer.writerows(data)
        return output.getvalue()

    def _generate_json(self, columns: List[str], data: List[List[Any]]) -> str:
        """Generates a formatted JSON array string from columns and row data."""
        records = []
        for row in data:
            records.append(dict(zip(columns, row)))
        return json.dumps(records, indent=2)

sql_executor_service = SqlExecutorService()
