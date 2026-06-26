import axios, { AxiosError } from 'axios';
import { 
  User, Token, SchemaResponse, QueryGenerateResponse, 
  QueryExecuteResponse, DashboardStats, AuditLogEntry, UserSessionEntry, HistoryItem 
} from '../types';

const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject Access Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor to handle Refresh Token rotation on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    // Prevent infinite loop if refresh token itself returns 401
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh')) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          const res = await axios.post<Token>(`/api/auth/refresh?refresh_token=${refreshToken}`);
          const { access_token } = res.data;
          
          localStorage.setItem('access_token', access_token);
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
          
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed - clear and logout
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_role');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

// ==========================================
// API CLIENT CALLS
// ==========================================

export const authAPI = {
  register: async (data: any) => {
    const res = await api.post<User>('/api/auth/register', data);
    return res.data;
  },
  login: async (data: any) => {
    const res = await api.post<Token>('/api/auth/login', data);
    return res.data;
  },
  logout: async () => {
    const res = await api.post('/api/auth/logout');
    return res.data;
  },
  getProfile: async () => {
    const res = await api.get<User>('/api/auth/profile');
    return res.data;
  },
  updateUsername: async (newUsername: string) => {
    const res = await api.put<User>('/api/auth/username', { new_username: newUsername });
    return res.data;
  }
};

export const schemaAPI = {
  inspect: async (connectionString: string) => {
    const res = await api.post<SchemaResponse>('/api/schema/inspect', { connection_string: connectionString });
    return res.data;
  },
  testConnection: async (connectionString: string) => {
    const res = await api.post<{ status: string; message: string }>('/api/schema/test-connection', { connection_string: connectionString });
    return res.data;
  }
};

export const queryAPI = {
  generate: async (prompt: string, connectionString: string) => {
    const res = await api.post<QueryGenerateResponse>('/api/query/generate', { prompt, connection_string: connectionString });
    return res.data;
  },
  validate: async (sql: string, connectionString: string) => {
    const res = await api.post<any>('/api/query/validate', { sql, connection_string: connectionString });
    return res.data;
  },
  optimize: async (sql: string, connectionString: string) => {
    const res = await api.post<any>('/api/query/optimize', { sql, connection_string: connectionString });
    return res.data;
  },
  impact: async (sql: string, connectionString: string) => {
    const res = await api.post<any>('/api/query/impact', { sql, connection_string: connectionString });
    return res.data;
  },
  execute: async (sql: string, connectionString: string, confirmed: boolean = false) => {
    const res = await api.post<QueryExecuteResponse>(`/api/query/execute?confirmed=${confirmed}`, { sql, connection_string: connectionString });
    return res.data;
  }
};

export const historyAPI = {
  getHistory: async (search?: string) => {
    const res = await api.get<HistoryItem[]>('/api/history', { params: { search } });
    return res.data;
  }
};

export const adminAPI = {
  getStats: async () => {
    const res = await api.get<DashboardStats>('/api/admin/stats');
    return res.data;
  },
  getUsers: async () => {
    const res = await api.get<User[]>('/api/admin/users');
    return res.data;
  },
  changeRole: async (userId: number, role: string) => {
    const res = await api.put<User>('/api/admin/users/role', { user_id: userId, role });
    return res.data;
  },
  getSessions: async () => {
    const res = await api.get<UserSessionEntry[]>('/api/admin/sessions');
    return res.data;
  },
  getAuditLogs: async () => {
    const res = await api.get<AuditLogEntry[]>('/api/admin/audit-logs');
    return res.data;
  },
  executeDDL: async (sql: string, connectionString: string) => {
    const res = await api.post<{ success: boolean; message: string }>('/api/admin/ddl', { sql, connection_string: connectionString });
    return res.data;
  }
};

export default api;
