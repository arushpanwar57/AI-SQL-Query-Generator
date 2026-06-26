from sqlalchemy import text
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger("seeder")

def seed_sample_business_data(db: Session) -> None:
    """
    Seeds sample business tables (departments, employees) into the database
    to provide immediate metadata tables for the NL SQL Generator to inspect and query.
    """
    try:
        # Check if departments table already exists
        # This check works on both PostgreSQL and MySQL
        db.execute(text("SELECT 1 FROM departments LIMIT 1"))
        logger.info("Sample business tables already seeded.")
    except Exception:
        # Tables do not exist, let's create and seed them
        logger.info("Seeding sample business tables...")
        db.rollback() # rollback failed check transaction
        
        try:
            dialect_name = db.bind.dialect.name
            if dialect_name == "sqlite":
                # 1. Create Departments table (SQLite syntax)
                db.execute(text("""
                    CREATE TABLE departments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name VARCHAR(100) NOT NULL,
                        location VARCHAR(100)
                    );
                """))
                
                # 2. Create Employees table (SQLite syntax)
                db.execute(text("""
                    CREATE TABLE employees (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name VARCHAR(100) NOT NULL,
                        email VARCHAR(100) UNIQUE,
                        salary NUMERIC(10, 2),
                        department_id INTEGER,
                        active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """))
            else:
                # 1. Create Departments table (PostgreSQL/MySQL syntax)
                db.execute(text("""
                    CREATE TABLE departments (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        location VARCHAR(100)
                    );
                """))
                
                # 2. Create Employees table (PostgreSQL/MySQL syntax)
                db.execute(text("""
                    CREATE TABLE employees (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        email VARCHAR(100) UNIQUE,
                        salary NUMERIC(10, 2),
                        department_id INTEGER,
                        active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """))
            
            # 3. Seed Departments
            db.execute(text("""
                INSERT INTO departments (name, location) VALUES
                ('Engineering', 'San Francisco'),
                ('Marketing', 'New York'),
                ('Sales', 'London'),
                ('Human Resources', 'Paris');
            """))
            
            # 4. Seed Employees
            db.execute(text("""
                INSERT INTO employees (name, email, salary, department_id, active) VALUES
                ('Alice Johnson', 'alice@example.com', 85000.00, 1, TRUE),
                ('Bob Smith', 'bob@example.com', 48000.00, 1, TRUE),
                ('Charlie Brown', 'charlie@example.com', 62000.00, 2, TRUE),
                ('Diana Prince', 'diana@example.com', 95000.00, 3, TRUE),
                ('Evan Wright', 'evan@example.com', 35000.00, 4, FALSE),
                ('Fiona Gallagher', 'fiona@example.com', 52000.00, 2, TRUE);
            """))
            
            db.commit()
            logger.info("Successfully seeded sample departments and employees tables.")
        except Exception as seed_err:
            db.rollback()
            logger.error(f"Failed to seed sample business tables: {seed_err}")
            # Do not block app startup if sample seeding fails (e.g. dialect discrepancies)
