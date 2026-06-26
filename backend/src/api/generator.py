from fastapi import APIRouter, Depends, Request, status, HTTPException
from sqlalchemy.orm import Session
import logging

from src.core.database import get_db
from src.core.limiter import limiter
from src.core.config import settings
from src.schemas.schemas import (
    QueryGenerateRequest, QueryGenerateResponse, QueryValidationInfo, 
    QueryImpactInfo, QueryOptimizationInfo, QueryValidateRequest, 
    QueryExecuteRequest, QueryExecuteResponse
)
from src.services.ai_sql_service import ai_sql_service
from src.services.sql_validator_service import sql_validator_service
from src.services.sql_executor_service import sql_executor_service
from src.repositories.history import history_repository
from src.api.deps import get_current_active_user
from src.models.models import User

logger = logging.getLogger("generator_api")
router = APIRouter(prefix="/query", tags=["SQL Operations"])

@router.post("/generate", response_model=QueryGenerateResponse)
@limiter.limit(settings.RATE_LIMIT_AI)
def generate_query(
    request: Request,
    payload: QueryGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        # Step 1: AI generation using prompt and reflected schema (ensuring privacy)
        ai_data = ai_sql_service.generate_sql_pipeline(payload.prompt, payload.connection_string)
        generated_sql = ai_data["generated_sql"]
        
        # Step 2: Validate generated SQL at DB level
        val_res = sql_validator_service.validate_sql(generated_sql, payload.connection_string)
        
        # Step 3: Parse impact
        impact = QueryImpactInfo(
            risk_level=ai_data.get("risk_level", "Low"),
            affected_tables=ai_data.get("affected_tables", []),
            estimated_rows_returned=ai_data.get("estimated_rows_returned", 0),
            estimated_rows_modified=ai_data.get("estimated_rows_modified", 0),
            warning_message=val_res["warning_message"] or ai_data.get("warning_message")
        )
        
        # Step 4: Parse optimizations
        optimization = QueryOptimizationInfo(
            optimized_sql=ai_data.get("optimized_sql", generated_sql),
            suggestions=ai_data.get("suggestions", [])
        )
        
        # Step 5: Save generation to DB History (with "pending" status until execution)
        history_repository.create_history(
            db,
            user_id=current_user.id,
            prompt=payload.prompt,
            generated_sql=generated_sql,
            execution_status="pending",
            execution_time_ms=0.0,
            rows_affected=0,
            database_name=payload.connection_string.split("/")[-1].split("?")[0], # Parse db name
            connection_string=payload.connection_string
        )

        return QueryGenerateResponse(
            prompt=payload.prompt,
            generated_sql=generated_sql,
            alternatives=ai_data.get("alternatives", []),
            confidence_score=ai_data.get("confidence_score", 0.9),
            explanation=ai_data.get("explanation", ""),
            validation=QueryValidationInfo(
                is_valid=val_res["is_valid"],
                errors=val_res["errors"],
                warning_message=val_res["warning_message"],
                is_destructive=val_res["is_destructive"]
            ),
            impact=impact,
            optimization=optimization
        )
    except Exception as e:
        logger.error(f"Generation pipeline failed: {e}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@router.post("/validate")
def validate_query(
    payload: QueryValidateRequest,
    current_user: User = Depends(get_current_active_user)
):
    val = sql_validator_service.validate_sql(payload.sql, payload.connection_string)
    return val

@router.post("/optimize")
def optimize_query(
    payload: QueryValidateRequest,
    current_user: User = Depends(get_current_active_user)
):
    # Simply parses query and feeds mock optimizations or suggestion tags
    # Usually part of consolidation, but provided as individual utility
    val = sql_validator_service.validate_sql(payload.sql, payload.connection_string)
    suggestions = ["Avoid using SELECT *; explicitly define columns.", "Verify indices on join keys."]
    if val["is_destructive"]:
        suggestions.append("Ensure transaction safety before executing destructive queries.")
        
    return {
        "original_sql": payload.sql,
        "optimized_sql": payload.sql.replace("*", "id, name") if "*" in payload.sql else payload.sql,
        "suggestions": suggestions
    }

@router.post("/impact")
def query_impact(
    payload: QueryValidateRequest,
    current_user: User = Depends(get_current_active_user)
):
    val = sql_validator_service.validate_sql(payload.sql, payload.connection_string)
    is_destructive = val["is_destructive"]
    return {
        "risk_level": "Critical" if is_destructive else "Low",
        "affected_tables": ["unknown"],
        "estimated_rows_returned": 100 if not is_destructive else 0,
        "estimated_rows_modified": 50 if is_destructive else 0,
        "warning_message": val["warning_message"]
    }

@router.post("/execute", response_model=QueryExecuteResponse)
def execute_query(
    request: Request,
    payload: QueryExecuteRequest,
    confirmed: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    ip_address = request.client.host if request.client else None
    db_name = payload.connection_string.split("/")[-1].split("?")[0]
    
    # Run query
    result = sql_executor_service.execute_query(
        payload.sql, 
        payload.connection_string, 
        confirmed=confirmed
    )
    
    # Save log to History
    status_str = "success" if result.error is None else "failed"
    history_repository.create_history(
        db,
        user_id=current_user.id,
        prompt="Direct Query Execution",
        generated_sql=payload.sql,
        execution_status=status_str,
        execution_time_ms=result.execution_time_ms,
        rows_affected=result.rows_affected,
        database_name=db_name,
        connection_string=payload.connection_string
    )
    
    # Log Audit
    history_repository.create_audit_log(
        db,
        user_id=current_user.id,
        action="QUERY_EXECUTION",
        ip_address=ip_address,
        details=f"Executed query on '{db_name}': Status={status_str}, Rows={result.rows_affected}, Error={result.error or 'None'}"
    )

    return result
