export interface User {
  id: number;
  username: str;
  email: string;
  role: 'admin' | 'developer' | 'viewer';
  is_active: boolean;
  created_at: string;
}

export type str = string;

export interface ColumnMetadata {
  name: string;
  data_type: string;
  is_nullable: boolean;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  foreign_key_target: string | null;
}

export interface TableMetadata {
  name: string;
  columns: ColumnMetadata[];
  primary_keys: string[];
  foreign_keys: {
    constrained_columns: string[];
    referred_table: string;
    referred_columns: string[];
  }[];
  row_count_estimate: number;
}

export interface SchemaResponse {
  engine_type: string;
  database_name: string;
  tables: TableMetadata[];
}

export interface QueryValidationInfo {
  is_valid: boolean;
  errors: string[];
  warning_message: string | null;
  is_destructive: boolean;
}

export interface QueryImpactInfo {
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  affected_tables: string[];
  estimated_rows_returned: number;
  estimated_rows_modified: number;
  warning_message: string | null;
}

export interface QueryOptimizationInfo {
  optimized_sql: string;
  suggestions: string[];
}

export interface QueryGenerateResponse {
  prompt: string;
  generated_sql: string;
  alternatives: string[];
  confidence_score: number;
  explanation: string;
  validation: QueryValidationInfo;
  impact: QueryImpactInfo;
  optimization: QueryOptimizationInfo;
}

export interface QueryExecuteResponse {
  execution_time_ms: number;
  rows_affected: number;
  columns: string[];
  data: any[][];
  export_csv: string | null;
  export_json: string | null;
  error: string | null;
}

export interface AuditLogEntry {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  ip_address: string | null;
  details: string | null;
  timestamp: string;
}

export interface UserSessionEntry {
  id: number;
  user_id: number;
  username: string;
  session_token: string;
  ip_address: string | null;
  user_agent: string | null;
  last_activity: string;
  expires_at: string;
  is_active: boolean;
}

export interface HistoryItem {
  id: number;
  prompt: string;
  generated_sql: string;
  execution_status: 'success' | 'failed' | 'pending';
  execution_time_ms: number;
  rows_affected: number;
  database_name: string;
  timestamp: string;
}

export interface DashboardStats {
  total_users: number;
  total_queries: number;
  total_audit_logs: number;
  active_sessions: number;
  queries_by_status: Record<string, number>;
  queries_by_day: { date: string; count: number }[];
  top_users: { username: string; count: number }[];
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
  role: string;
}
