import json
import logging
import re
import httpx
from typing import Dict, Any, List

from src.core.config import settings
from src.services.db_schema_service import db_schema_service

logger = logging.getLogger("ai_service")

class BaseAIProvider:
    def generate_sql(self, prompt: str, schema_text: str) -> Dict[str, Any]:
        raise NotImplementedError

class OpenRouterProvider(BaseAIProvider):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model
        self.url = "https://openrouter.ai/api/v1/chat/completions"

    def generate_sql(self, prompt: str, schema_text: str) -> Dict[str, Any]:
        system_instruction = f"""
You are an expert AI SQL Generator and Database Architect.
Your task is to take a natural language user query and a database schema description, then generate the correct SQL query.

Here is the database schema description:
{schema_text}

Strict Rules:
1. Only reference tables and columns that are defined in the schema description above. Do not hallucinate any table or column.
2. If the user request is ambiguous, generate the most likely SQL query as the primary query and include alternatives in the "alternatives" list.
3. For dangerous queries like UPDATE or DELETE without a WHERE clause, or DROP/TRUNCATE, raise warning messages and rate them with High/Critical risk.
4. Your response MUST be a JSON object containing EXACTLY these keys:
- "generated_sql": The primary generated SQL query (ensure it is clean, properly formatted, and doesn't contain markdown formatting like ```sql).
- "alternatives": A list of alternative SQL queries if there is ambiguity (limit to 2-3 queries, otherwise empty list).
- "confidence_score": A float between 0.0 and 1.0 indicating your confidence in the primary query.
- "explanation": A detailed, simple English explanation of the generated query breaking down SELECT, FROM, WHERE, JOINs, GROUP BYs, etc.
- "optimized_sql": An optimized version of the generated SQL query (e.g., using explicit column names instead of *, writing joins optimally, adding hypothetical indexes, etc.).
- "suggestions": A list of suggestions for database improvements or optimization comments (e.g. "Add an index on column X", "Avoid SELECT *").
- "risk_level": One of: "Low", "Medium", "High", "Critical".
- "affected_tables": A list of table names affected or queried by this SQL statement.
- "estimated_rows_returned": Estimated number of rows this query might return (integer, default 0).
- "estimated_rows_modified": Estimated number of rows this query might modify/delete/insert (integer, default 0).
- "warning_message": If the query is dangerous (e.g. missing WHERE clause in UPDATE/DELETE, or dropping tables), explain why. Otherwise, null.

Respond ONLY with the JSON object. Do not wrap in ```json ... ``` markdown tags.
"""

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/ManasNautiyal/AI-SQL-Query-Generator",
            "X-Title": "AI SQL Query Generator"
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_instruction.strip()},
                {"role": "user", "content": f"User request: {prompt}\nGenerate the JSON output matching the requested schema."}
            ],
            "response_format": {"type": "json_object"}
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(self.url, headers=headers, json=payload)
                response.raise_for_status()
                result = response.json()
                
                if "error" in result:
                    raise RuntimeError(result["error"])
                
                raw_text = result["choices"][0]["message"]["content"].strip()
                if raw_text.startswith("```"):
                    raw_text = re.sub(r"^```(?:json)?\n?", "", raw_text)
                    raw_text = re.sub(r"\n?```$", "", raw_text)
                    raw_text = raw_text.strip()
                    
                data = json.loads(raw_text)
                return data
        except Exception as e:
            logger.error(f"OpenRouter API execution failed: {e}")
            raise RuntimeError(f"OpenRouter API request failed: {e}")


class MockAIProvider(BaseAIProvider):
    """
    A smart local rules-based fallback provider.
    Inspects user prompt for keywords and dynamically maps tables/columns from schema
    to return a highly contextual mock SQL query, explanation, optimization, and risk evaluation.
    """
    def generate_sql(self, prompt: str, schema_text: str) -> Dict[str, Any]:
        prompt_lower = prompt.lower()
        
        # Try to find table names mentioned in prompt or present in schema
        # We can extract table names from the schema text
        tables = re.findall(r"Table '(\w+)'", schema_text)
        
        target_table = "users" # default
        for t in tables:
            if t.lower() in prompt_lower or t.lower()[:-1] in prompt_lower: # handle plural
                target_table = t
                break
                
        # Simple intent detection
        is_delete = any(k in prompt_lower for k in ["delete", "remove", "clear", "truncate", "drop"])
        is_update = any(k in prompt_lower for k in ["update", "modify", "change", "set", "increase", "decrease"])
        is_insert = any(k in prompt_lower for k in ["insert", "add", "create new", "register"])
        
        # Simple column mapping
        # Let's inspect columns for the target table
        columns = []
        table_match = re.search(rf"Table '{target_table}':(.*?)(?=\n\nTable|\Z)", schema_text, re.DOTALL)
        if table_match:
            columns = re.findall(r"-\s*(\w+):", table_match.group(1))

        # Basic filter mapping
        where_clause = ""
        risk_level = "Low"
        warning = None
        rows_modified = 0
        rows_returned = 100 # default mock
        
        # Check filters
        if "active" in prompt_lower and "is_active" in columns:
            where_clause = " WHERE is_active = TRUE"
        elif "inactive" in prompt_lower and "is_active" in columns:
            where_clause = " WHERE is_active = FALSE"
            
        # Check specific numeric filters
        salary_match = re.search(r"(?:salary|earning|earns)\s*(?:>|more than|greater than|above)\s*(\d+)", prompt_lower)
        if salary_match and "salary" in columns:
            where_clause = f" WHERE salary > {salary_match.group(1)}"
        elif "id" in prompt_lower and "id" in columns:
            id_match = re.search(r"id\s*(?:=|is)?\s*(\d+)", prompt_lower)
            val = id_match.group(1) if id_match else "1"
            where_clause = f" WHERE id = {val}"

        # Build query
        if is_delete:
            generated_sql = f"DELETE FROM {target_table}{where_clause};"
            rows_modified = 1 if "id" in where_clause else 50
            rows_returned = 0
            if not where_clause:
                risk_level = "Critical"
                warning = f"Dangerous query: You are attempting to DELETE all records from table '{target_table}' without a WHERE filter!"
            else:
                risk_level = "High"
        elif is_update:
            set_col = "updated_at = NOW()"
            for col in columns:
                if col != "id" and col in prompt_lower:
                    set_col = f"{col} = '{col}_value'"
                    break
            generated_sql = f"UPDATE {target_table} SET {set_col}{where_clause};"
            rows_modified = 1 if "id" in where_clause else 50
            rows_returned = 0
            if not where_clause:
                risk_level = "Critical"
                warning = f"Dangerous query: You are attempting to UPDATE all records in table '{target_table}' without a WHERE filter!"
            else:
                risk_level = "Medium"
        elif is_insert:
            cols_str = ", ".join(columns[:3]) if columns else "username, email"
            vals_str = ", ".join([f"'{c}_val'" for c in columns[:3]]) if columns else "'john_doe', 'john@example.com'"
            generated_sql = f"INSERT INTO {target_table} ({cols_str}) VALUES ({vals_str});"
            rows_modified = 1
            rows_returned = 0
            risk_level = "Low"
        else:
            # Select
            cols_projection = "*"
            if "name" in prompt_lower:
                matched_cols = [c for c in columns if "name" in c or c == "id"]
                if matched_cols:
                    cols_projection = ", ".join(matched_cols)
            
            limit_clause = ""
            if "limit" in prompt_lower or "top" in prompt_lower:
                limit_match = re.search(r"(?:limit|top)\s*(\d+)", prompt_lower)
                val = limit_match.group(1) if limit_match else "10"
                limit_clause = f" LIMIT {val}"
                rows_returned = int(val)
                
            order_clause = ""
            if "sort" in prompt_lower or "order" in prompt_lower or "latest" in prompt_lower:
                sort_col = "created_at" if "created_at" in columns else (columns[0] if columns else "id")
                order_clause = f" ORDER BY {sort_col} DESC"
                
            generated_sql = f"SELECT {cols_projection} FROM {target_table}{where_clause}{order_clause}{limit_clause};"
            risk_level = "Low"

        # Alternative builder
        alternatives = []
        if not is_delete and not is_update and not is_insert:
            # Suggest a count alternative
            alternatives.append(f"SELECT COUNT(*) FROM {target_table}{where_clause};")

        # Explain
        explanation = f"This query performs an operations on the '{target_table}' table. "
        if is_delete:
            explanation += f"It uses DELETE to remove rows. "
        elif is_update:
            explanation += f"It uses UPDATE to modify details. "
        elif is_insert:
            explanation += f"It inserts a new record with initial values. "
        else:
            explanation += f"It retrieves columns from the database. "
            
        if where_clause:
            explanation += f"The WHERE clause filters results to only matching rows: {where_clause.strip()}."
        else:
            explanation += "There is no WHERE clause, meaning it applies to the entire table."

        # Suggestions
        suggestions = ["Avoid using SELECT *; explicitly define projection columns to save bandwidth."]
        if where_clause and "id" not in where_clause:
            suggestions.append(f"Ensure columns used in the WHERE condition (e.g. {where_clause}) are indexed.")
            
        optimized_sql = generated_sql
        if "*" in generated_sql and columns:
            optimized_sql = generated_sql.replace("*", ", ".join(columns[:3]))

        return {
            "generated_sql": generated_sql,
            "alternatives": alternatives,
            "confidence_score": 0.85,
            "explanation": explanation,
            "optimized_sql": optimized_sql,
            "suggestions": suggestions,
            "risk_level": risk_level,
            "affected_tables": [target_table],
            "estimated_rows_returned": rows_returned,
            "estimated_rows_modified": rows_modified,
            "warning_message": warning
        }


class AISqlService:
    def __init__(self):
        self._provider = None

    def get_provider(self) -> BaseAIProvider:
        if self._provider is None:
            # Check configured provider
            provider_type = settings.AI_PROVIDER.lower()
            api_key = settings.OPENROUTER_API_KEY
            model = settings.OPENROUTER_MODEL
            
            if provider_type == "openrouter" and api_key:
                logger.info(f"Initializing OpenRouter AI Provider with model: {model}.")
                self._provider = OpenRouterProvider(api_key, model)
            else:
                logger.warning("OpenRouter API key is missing or provider is configured to 'mock'. Falling back to local Mock Provider.")
                self._provider = MockAIProvider()
        return self._provider

    def generate_sql_pipeline(self, prompt: str, connection_string: str) -> Dict[str, Any]:
        """
        Executes generation pipeline:
        1. Reflects the active schema structure.
        2. Feeds structure to configured AI provider.
        3. Returns generated query, explanation, alternatives, risk assessment, and suggestions.
        """
        # Fetch only database structural schema metadata (protecting data privacy)
        schema_text = db_schema_service.get_schema_summary_text(connection_string)
        
        provider = self.get_provider()
        ai_output = provider.generate_sql(prompt, schema_text)
        
        return ai_output

ai_sql_service = AISqlService()
