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
    AI_PROVIDER: str = Field(default="openrouter", env="AI_PROVIDER")  # "openrouter" or "mock"
    OPENROUTER_API_KEY: str = Field(default="", env="OPENROUTER_API_KEY")
    OPENROUTER_MODEL: str = Field(default="google/gemini-2.5-flash", env="OPENROUTER_MODEL")
    
    # CORS
    BACKEND_CORS_ORIGINS: Any = ["*"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> Any:
        if isinstance(v, str):
            if not v.startswith("["):
                return [i.strip() for i in v.split(",")]
            else:
                import json
                try:
                    return json.loads(v)
                except Exception:
                    return [v]
        elif isinstance(v, list):
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
