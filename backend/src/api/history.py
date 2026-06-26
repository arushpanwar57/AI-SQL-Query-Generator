from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from src.core.database import get_db
from src.schemas.schemas import HistoryResponse
from src.repositories.history import history_repository
from src.api.deps import get_current_active_user
from src.models.models import User

router = APIRouter(prefix="/history", tags=["Query History"])

@router.get("", response_model=List[HistoryResponse])
def list_history(
    search: Optional[str] = Query(None, description="Search keyword in prompt, SQL, or database name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    history_items = history_repository.get_user_history(db, user_id=current_user.id, search=search)
    return history_items
