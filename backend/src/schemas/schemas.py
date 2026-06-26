from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any
from datetime import datetime

# ==========================================
# AUTHENTICATION SCHEMAS
# ==========================================

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    username: str = Field(..., description="Username or email address")
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str

class TokenPayload(BaseModel):
    sub: int
    role: str
    session_id: int
    exp: int

class UpdateUsernameRequest(BaseModel):
    new_username: str = Field(..., min_length=3, max_length=50)

class ChangeRoleRequest(BaseModel):
    user_id: int
    role: str = Field(..., pattern="^(admin|developer|viewer)$")

# ==========================================
# SCHEMA SCHEMAS
# ==========================================

class ColumnMetadata(BaseModel):
    name: str
    data_type: str
    is_nullable: bool
    is_primary_key: bool
    is_foreign_key: bool
    foreign_key_target: Optional[str] = None  # e.g. "users.id"

class TableMetadata(BaseModel):
    name: str
    columns: List[ColumnMetadata]
    primary_keys: List[str]
    foreign_keys: List[dict]  # details of relationship
    row_count_estimate: int

class SchemaResponse(BaseModel):
    engine_type: str  # postgresql or mysql
    database_name: str
    tables: List[TableMetadata]

class TargetDbConfig(BaseModel):
    connection_string: str = Field(..., description="PostgreSQL or MySQL connection URI")

# ==========================================
# SQL GENERATION & PIPELINE SCHEMAS
# ==========================================

class QueryGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=5)
    connection_string: str

class QueryValidationInfo(BaseModel):
    is_valid: bool
    errors: List[str]
    warning_message: Optional[str] = None
    is_destructive: bool

class QueryImpactInfo(BaseModel):
    risk_level: str  # Low, Medium, High, Critical
    affected_tables: List[str]
    estimated_rows_returned: int
    estimated_rows_modified: int
    warning_message: Optional[str] = None

class QueryOptimizationInfo(BaseModel):
    optimized_sql: str
    suggestions: List[str]

class QueryGenerateResponse(BaseModel):
    prompt: str
    generated_sql: str
    alternatives: List[str]
    confidence_score: float
    explanation: str
    validation: QueryValidationInfo
    impact: QueryImpactInfo
    optimization: QueryOptimizationInfo

class QueryValidateRequest(BaseModel):
    sql: str
    connection_string: str

class QueryExecuteRequest(BaseModel):
    sql: str
    connection_string: str

class QueryExecuteResponse(BaseModel):
    execution_time_ms: float
    rows_affected: int
    columns: List[str]
    data: List[List[Any]]  # List of rows, where each row is a list of values
    export_csv: Optional[str] = None
    export_json: Optional[str] = None
    error: Optional[str] = None

# ==========================================
# DDL OPERATIONS
# ==========================================

class DDLRequest(BaseModel):
    connection_string: str
    sql: str

class DDLResponse(BaseModel):
    success: bool
    message: str

# ==========================================
# AUDIT & MONITORING SCHEMAS
# ==========================================

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    username: Optional[str]
    action: str
    ip_address: Optional[str]
    details: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True

class UserSessionResponse(BaseModel):
    id: int
    user_id: int
    username: str
    session_token: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    last_activity: datetime
    expires_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

class HistoryResponse(BaseModel):
    id: int
    prompt: str
    generated_sql: str
    execution_status: str
    execution_time_ms: float
    rows_affected: int
    database_name: str
    timestamp: datetime

    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    total_users: int
    total_queries: int
    total_audit_logs: int
    active_sessions: int
    queries_by_status: dict  # e.g. {"success": 100, "failed": 5}
    queries_by_day: List[dict]  # [{"date": "2026-06-25", "count": 20}]
    top_users: List[dict]  # [{"username": "john", "count": 50}]
