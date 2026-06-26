from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import QueuePool
import logging

from src.core.config import settings

logger = logging.getLogger("database")

# Main Application Database Engine
# In production, this stores user accounts, history, sessions, and audit logs.
# Fallback to SQLite check_same_thread for easy local running
if settings.DATABASE_URL.startswith("sqlite://"):
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        poolclass=QueuePool,
        pool_size=10,
        max_overflow=20,
        pool_recycle=1800
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency to get the database session for API requests."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_target_engine(connection_uri: str):
    """
    Dynamically creates an engine to connect to a target PostgreSQL, MySQL, or SQLite database
    to execute generated SQL queries or inspect metadata.
    Supports postgresql://, mysql+pymysql://, and sqlite:// connections.
    """
    try:
        if connection_uri.startswith("sqlite://"):
            return create_engine(
                connection_uri,
                connect_args={"check_same_thread": False}
            )
            
        # standardizing prefixes
        if connection_uri.startswith("mysql://"):
            connection_uri = connection_uri.replace("mysql://", "mysql+pymysql://")
            
        target_engine = create_engine(
            connection_uri,
            pool_recycle=300,
            connect_args={"connect_timeout": 5} if "mysql" in connection_uri else {"connect_timeout": 5}
        )
        return target_engine
    except Exception as e:
        logger.error(f"Error creating connection engine for {connection_uri}: {e}")
        raise ValueError(f"Failed to establish database connection settings: {e}")

