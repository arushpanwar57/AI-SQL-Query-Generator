from sqlalchemy import inspect, text
from typing import List, Dict, Any, Tuple
import logging

from src.core.database import create_target_engine
from src.schemas.schemas import SchemaResponse, TableMetadata, ColumnMetadata

logger = logging.getLogger("schema_service")

class DbSchemaService:
    def test_connection(self, connection_string: str) -> Tuple[bool, str]:
        """Tests if a connection can be established with the provided connection string."""
        try:
            engine = create_target_engine(connection_string)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True, "Connection successful."
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False, str(e)

    def get_schema_metadata(self, connection_string: str) -> SchemaResponse:
        """
        Uses SQLAlchemy reflection to get structured table and column metadata
        from a target database without accessing any table rows.
        """
        try:
            engine = create_target_engine(connection_string)
            inspector = inspect(engine)
            
            # Identify DB name and engine type
            engine_type = engine.dialect.name
            database_name = ""
            try:
                with engine.connect() as conn:
                    if engine_type == "postgresql":
                        database_name = conn.execute(text("SELECT current_database()")).scalar() or ""
                    elif engine_type == "mysql":
                        database_name = conn.execute(text("SELECT database()")).scalar() or ""
            except Exception:
                database_name = "unknown"

            tables_meta: List[TableMetadata] = []
            table_names = inspector.get_table_names()
            
            for table_name in table_names:
                # Column details
                columns = inspector.get_columns(table_name)
                pk_constraint = inspector.get_pk_constraint(table_name)
                pks = pk_constraint.get("constrained_columns", [])
                fks = inspector.get_foreign_keys(table_name)
                
                columns_meta: List[ColumnMetadata] = []
                for col in columns:
                    name = col["name"]
                    data_type = str(col["type"])
                    is_nullable = col.get("nullable", True)
                    is_primary = name in pks
                    
                    # Check if foreign key
                    is_foreign = False
                    fk_target = None
                    for fk in fks:
                        if name in fk["constrained_columns"]:
                            is_foreign = True
                            idx = fk["constrained_columns"].index(name)
                            referred_table = fk["referred_table"]
                            referred_col = fk["referred_columns"][idx]
                            fk_target = f"{referred_table}.{referred_col}"
                            break

                    columns_meta.append(ColumnMetadata(
                        name=name,
                        data_type=data_type,
                        is_nullable=is_nullable,
                        is_primary_key=is_primary,
                        is_foreign_key=is_foreign,
                        foreign_key_target=fk_target
                    ))

                # Row count estimate (avoid heavy select count(*) if possible, but fallback safely)
                row_count = 0
                try:
                    with engine.connect() as conn:
                        if engine_type == "postgresql":
                            # Use fast Postgres system statistics
                            res = conn.execute(text(
                                f"SELECT reltuples::bigint FROM pg_class WHERE relname = '{table_name}'"
                            )).scalar()
                            row_count = int(res) if res is not None and res >= 0 else 0
                        elif engine_type == "mysql":
                            # Use fast MySQL system statistics
                            res = conn.execute(text(
                                f"SELECT TABLE_ROWS FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '{database_name}' AND TABLE_NAME = '{table_name}'"
                            )).scalar()
                            row_count = int(res) if res is not None else 0
                        else:
                            row_count = 0
                except Exception:
                    pass

                # If fast stats fail or return 0, do a fast limit-0 query to make sure table is readable
                # (but avoid heavy table scans, let's just keep row_count = 0 or run a quick count with timeout)
                
                tables_meta.append(TableMetadata(
                    name=table_name,
                    columns=columns_meta,
                    primary_keys=pks,
                    foreign_keys=[
                        {
                            "constrained_columns": fk["constrained_columns"],
                            "referred_table": fk["referred_table"],
                            "referred_columns": fk["referred_columns"]
                        } for fk in fks
                    ],
                    row_count_estimate=row_count
                ))
                
            return SchemaResponse(
                engine_type=engine_type,
                database_name=database_name,
                tables=tables_meta
            )
        except Exception as e:
            logger.error(f"Failed reflecting schema metadata: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Database schema reflection failed: {str(e)}"
            )

    def get_schema_summary_text(self, connection_string: str) -> str:
        """
        Generates a text summary of the database schema structure (DDL-like description)
        to feed to the LLM system prompt without revealing any data rows.
        """
        metadata = self.get_schema_metadata(connection_string)
        summary = [f"Database Dialect: {metadata.engine_type}", "Tables schema:"]
        
        for table in metadata.tables:
            table_desc = [f"Table '{table.name}':"]
            for col in table.columns:
                pk_indicator = " [PRIMARY KEY]" if col.is_primary_key else ""
                fk_indicator = f" [FOREIGN KEY references {col.foreign_key_target}]" if col.is_foreign_key else ""
                nullable_indicator = " NULL" if col.is_nullable else " NOT NULL"
                table_desc.append(f"  - {col.name}: {col.data_type}{nullable_indicator}{pk_indicator}{fk_indicator}")
            
            if table.foreign_keys:
                table_desc.append("  Relationships:")
                for fk in table.foreign_keys:
                    table_desc.append(
                        f"    * {table.name}({', '.join(fk['constrained_columns'])}) references {fk['referred_table']}({', '.join(fk['referred_columns'])})"
                    )
            summary.append("\n".join(table_desc))
            
        return "\n\n".join(summary)

db_schema_service = DbSchemaService()
