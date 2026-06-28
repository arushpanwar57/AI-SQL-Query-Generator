from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from src.core.config import settings
from src.core.database import Base, engine
from src.core.limiter import limiter
from src.api import auth, generator, schema, admin, history

# Initialize SQLite/PostgreSQL main database tables on startup with retry logic
import time
import logging

logger = logging.getLogger("main")
max_retries = 5
retry_delay = 5
for attempt in range(1, max_retries + 1):
    try:
        Base.metadata.create_all(bind=engine)
        
        # Seed sample business tables for immediate testing/metadata reflections
        from src.core.database import SessionLocal
        from src.core.seed import seed_sample_business_data
        db = SessionLocal()
        try:
            seed_sample_business_data(db)
        finally:
            db.close()
        logger.info("Database initialized and seeded successfully.")
        break
    except Exception as e:
        if attempt == max_retries:
            logger.error(f"Database connection failed after {max_retries} attempts. Exiting.")
            raise e
        logger.warning(f"Database connection attempt {attempt}/{max_retries} failed. Retrying in {retry_delay}s... (Error: {e})")
        time.sleep(retry_delay)


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Clean Architecture AI-Powered SQL Query Generator & DB Assistant API",
    version="1.0.0"
)

# SlowAPI Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom general Exception Handler
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"An unexpected error occurred: {str(exc)}"},
    )

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(generator.router, prefix=settings.API_V1_STR)
app.include_router(schema.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(history.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the SQL Assistant API",
        "version": "1.0.0",
        "status": "online"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
