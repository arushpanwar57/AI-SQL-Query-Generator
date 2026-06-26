import pytest
from src.services.sql_validator_service import sql_validator_service
from src.services.ai_sql_service import ai_sql_service

def test_sql_validator_destructive_warnings():
    # UPDATE without WHERE
    res = sql_validator_service.validate_sql("UPDATE users SET email = 'test'", "sqlite:///:memory:")
    assert res["is_destructive"] is True
    assert "DANGER" in res["warning_message"]

    # DELETE without WHERE
    res = sql_validator_service.validate_sql("DELETE FROM products", "sqlite:///:memory:")
    assert res["is_destructive"] is True
    assert "DANGER" in res["warning_message"]

    # Normal queries with WHERE
    res = sql_validator_service.validate_sql("UPDATE users SET email = 'test' WHERE id = 1", "sqlite:///:memory:")
    assert res["is_destructive"] is False
    assert res["warning_message"] is None

    # Normal SELECT
    res = sql_validator_service.validate_sql("SELECT * FROM users", "sqlite:///:memory:")
    assert res["is_destructive"] is False
    assert res["warning_message"] is None

def test_mock_ai_sql_generation():
    schema_text = """
    Database Dialect: postgresql
    Table 'employees':
      - id: INTEGER NOT NULL [PRIMARY KEY]
      - name: VARCHAR(100) NOT NULL
      - salary: NUMERIC
      - active: BOOLEAN
    """
    
    # Test SELECT generation
    res = ai_sql_service.get_provider().generate_sql("show employees earning more than 50000", schema_text)
    assert "employees" in res["generated_sql"].lower()
    assert "salary > 50000" in res["generated_sql"].lower()
    assert res["risk_level"] == "Low"

    # Test DELETE dangerous query warning
    res2 = ai_sql_service.get_provider().generate_sql("delete all employees", schema_text)
    assert "delete" in res2["generated_sql"].lower()
    assert res2["risk_level"] == "Critical"
    assert res2["warning_message"] is not None
