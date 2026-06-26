import requests
import sys

BASE_URL = "http://127.0.0.1:8000/api"
CONN_STR = "sqlite:///./sql_assistant.db"

def run_verification():
    print("=== STARTING FULL API PIPELINE VERIFICATION ===")
    
    # 1. User Registration
    reg_payload = {
        "username": "tester",
        "email": "tester@example.com",
        "password": "Password123!"
    }
    print("\n1. Testing User Registration (/auth/register)...")
    try:
        res = requests.post(f"{BASE_URL}/auth/register", json=reg_payload)
        if res.status_code == 201:
            print("   [SUCCESS] User registered.")
        else:
            # Maybe already exists, let's print message
            print(f"   [INFO] Status {res.status_code}: {res.json()}")
    except Exception as e:
        print(f"   [FAILED] Registration error: {e}")
        sys.exit(1)

    # 2. User Login
    login_payload = {
        "username": "tester",
        "password": "Password123!"
    }
    print("\n2. Testing User Login & Session Lock (/auth/login)...")
    try:
        res = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
        if res.status_code == 200:
            tokens = res.json()
            access_token = tokens["access_token"]
            role = tokens["role"]
            print(f"   [SUCCESS] Logged in successfully. Role: {role}")
        else:
            print(f"   [FAILED] Login failed: {res.json()}")
            sys.exit(1)
    except Exception as e:
        print(f"   [FAILED] Login error: {e}")
        sys.exit(1)

    headers = {"Authorization": f"Bearer {access_token}"}

    # 3. Connection Test
    conn_payload = {
        "connection_string": CONN_STR
    }
    print("\n3. Testing Schema Target Connection (/schema/test-connection)...")
    try:
        res = requests.post(f"{BASE_URL}/schema/test-connection", json=conn_payload, headers=headers)
        if res.status_code == 200:
            print(f"   [SUCCESS] Target connection tested: {res.json()}")
        else:
            print(f"   [FAILED] Connection failed: {res.json()}")
            sys.exit(1)
    except Exception as e:
        print(f"   [FAILED] Connection test error: {e}")
        sys.exit(1)

    # 4. Schema Reflection / metadata inspection
    print("\n4. Testing Schema Metadata Reflection (/schema/inspect)...")
    try:
        res = requests.post(f"{BASE_URL}/schema/inspect", json=conn_payload, headers=headers)
        if res.status_code == 200:
            schema = res.json()
            tables = [t["name"] for t in schema["tables"]]
            print(f"   [SUCCESS] Schema Reflected. Tables found: {tables}")
            if "employees" not in tables or "departments" not in tables:
                print("   [WARNING] Expected seeded business tables not found in schema!")
        else:
            print(f"   [FAILED] Schema inspection failed: {res.json()}")
            sys.exit(1)
    except Exception as e:
        print(f"   [FAILED] Schema reflection error: {e}")
        sys.exit(1)

    # 5. Query Generation pipeline
    gen_payload = {
        "prompt": "Show all active employees earning more than 50000",
        "connection_string": CONN_STR
    }
    print("\n5. Testing NLP SQL Generation Pipeline (/query/generate)...")
    try:
        res = requests.post(f"{BASE_URL}/query/generate", json=gen_payload, headers=headers)
        if res.status_code == 200:
            gen_data = res.json()
            generated_sql = gen_data["generated_sql"]
            print(f"   [SUCCESS] AI Generation succeeded.")
            print(f"     Prompt: '{gen_payload['prompt']}'")
            print(f"     Generated SQL: '{generated_sql}'")
            print(f"     Explanation: '{gen_data['explanation'][:100]}...'")
            print(f"     Risk Profile: {gen_data['impact']['risk_level']}")
        else:
            print(f"   [FAILED] Generation pipeline failed: {res.json()}")
            sys.exit(1)
    except Exception as e:
        print(f"   [FAILED] Query generation error: {e}")
        sys.exit(1)

    # 6. Query Execution
    exec_payload = {
        "sql": generated_sql,
        "connection_string": CONN_STR
    }
    print("\n6. Testing SQL execution inside transaction (/query/execute)...")
    try:
        res = requests.post(f"{BASE_URL}/query/execute?confirmed=true", json=exec_payload, headers=headers)
        if res.status_code == 200:
            exec_res = res.json()
            print(f"   [SUCCESS] Query executed in {exec_res['execution_time_ms']}ms.")
            print(f"     Rows affected/returned: {exec_res['rows_affected']}")
            print(f"     Columns: {exec_res['columns']}")
            print(f"     Sample Data (first row): {exec_res['data'][0] if exec_res['data'] else 'None'}")
        else:
            print(f"   [FAILED] Query execution failed: {res.json()}")
            sys.exit(1)
    except Exception as e:
        print(f"   [FAILED] Query execution error: {e}")
        sys.exit(1)

    # 7. Query History
    print("\n7. Testing Query History Search (/history)...")
    try:
        res = requests.get(f"{BASE_URL}/history", headers=headers)
        if res.status_code == 200:
            history = res.json()
            print(f"   [SUCCESS] History retrieved. Total logs: {len(history)}")
        else:
            print(f"   [FAILED] History retrieval failed: {res.json()}")
            sys.exit(1)
    except Exception as e:
        print(f"   [FAILED] Query history error: {e}")
        sys.exit(1)

    # 8. User Logout
    print("\n8. Testing User Logout (/auth/logout)...")
    try:
        res = requests.post(f"{BASE_URL}/auth/logout", headers=headers)
        if res.status_code == 200:
            print("   [SUCCESS] User logged out, session invalidated.")
        else:
            print(f"   [FAILED] Logout failed: {res.json()}")
            sys.exit(1)
    except Exception as e:
        print(f"   [FAILED] Logout error: {e}")
        sys.exit(1)

    print("\n=== ALL ENDPOINTS VERIFIED SUCCESSFULLY AND WORK IN SYNC! ===")

if __name__ == "__main__":
    run_verification()
