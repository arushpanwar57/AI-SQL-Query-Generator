import os
from typing import List, Any
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI SQL Query Generator & Database Assistant"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = Field(default="SUPER_SECRET_SECURITY_KEY_FOR_JWT_SIGNING_1234567890", env="SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_TIME_MINUTES: int = 15
    
    # Main Database (for users, history, audit log, etc.)
    DATABASE_URL: str = Field(
        default="sqlite:///./sql_assistant.db",
        env="DATABASE_URL"
    )
    
    # AI configuration
    AI_PROVIDER: str = Field(default="gemini", env="AI_PROVIDER")  # "gemini" or "mock"
    GEMINI_API_KEY: str = Field(default="", env="GEMINI_API_KEY")
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> Any:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # Rate Limiting (slowapi limits)
    RATE_LIMIT_AUTH: str = "5/minute"
    RATE_LIMIT_AI: str = "10/minute"
    RATE_LIMIT_DEFAULT: str = "60/minute"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
