from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from src.schemas.schemas import SchemaResponse, TargetDbConfig
from src.services.db_schema_service import db_schema_service
from src.api.deps import get_current_active_user
from src.models.models import User

router = APIRouter(prefix="/schema", tags=["Database Schema"])

@router.post("/inspect", response_model=SchemaResponse)
def inspect_schema(
    payload: TargetDbConfig,
    current_user: User = Depends(get_current_active_user)
):
    try:
        schema = db_schema_service.get_schema_metadata(payload.connection_string)
        return schema
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/test-connection")
def test_db_connection(
    payload: TargetDbConfig,
    current_user: User = Depends(get_current_active_user)
):
    success, msg = db_schema_service.test_connection(payload.connection_string)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "success", "message": msg}
