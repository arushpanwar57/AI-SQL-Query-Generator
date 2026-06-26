import React, { useState, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { adminAPI, schemaAPI } from '../../services/api';
import { Terminal, Play, RefreshCw, Database, AlertCircle, CheckCircle2 } from 'lucide-react';

export const DeveloperDDL: React.FC = () => {
  const [connStr, setConnStr] = useState(() => {
    return localStorage.getItem('db_connection_string') || 'postgresql://postgres:postgres@db:5432/sql_assistant';
  });
  const [connOk, setConnOk] = useState<boolean | null>(null);
  const [testingConn, setTestingConn] = useState(false);

  const [ddlSql, setDdlSql] = useState('-- Write DDL here e.g.\n-- CREATE TABLE employees (id SERIAL PRIMARY KEY, name VARCHAR(100));');
  const [executing, setExecuting] = useState(false);
  const [log, setLog] = useState<{ success: boolean; message: string } | null>(null);

  const testConnection = async () => {
    setTestingConn(true);
    setConnOk(null);
    try {
      await schemaAPI.testConnection(connStr);
      setConnOk(true);
    } catch (err) {
      setConnOk(false);
    } finally {
      setTestingConn(false);
    }
  };

  const handleExecute = async () => {
    if (!ddlSql.trim()) return;
    setExecuting(true);
    setLog(null);
    try {
      const res = await adminAPI.executeDDL(ddlSql, connStr);
      setLog({
        success: res.success,
        message: res.message
      });
    } catch (err: any) {
      setLog({
        success: false,
        message: err.response?.data?.detail || 'DDL execution failed. Please verify syntax.'
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-88px)] overflow-hidden">
      
      {/* Header */}
      <div className="glass rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-200/50 dark:border-slate-800/40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-800 dark:text-white text-base">DDL Manager</h2>
            <p className="text-xs text-slate-400">Create, Alter, or Drop Database Structures directly</p>
          </div>
        </div>

        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-transparent">Developer Console</span>
      </div>

      {/* Target DB Configuration */}
      <div className="glass rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 border border-slate-200/50 dark:border-slate-800/40 shrink-0">
        <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 font-semibold text-sm shrink-0">
          <Database className="w-5 h-5" /> Workspace Connection
        </div>
        <input
          type="text"
          value={connStr}
          onChange={(e) => setConnStr(e.target.value)}
          placeholder="postgresql://user:pass@host:5432/dbname"
          className="flex-1 w-full bg-slate-100 dark:bg-slate-950/40 text-xs text-slate-800 dark:text-slate-200 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 font-mono transition-all"
        />
        <button
          onClick={testConnection}
          disabled={testingConn}
          className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold py-2.5 px-4 rounded-xl transition-all active:scale-[0.98]"
        >
          {testingConn ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
          Test Connection
        </button>
        
        {connOk === true && (
          <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4" /> Connected
          </span>
        )}
        {connOk === false && (
          <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
            <AlertTriangle className="w-4 h-4" /> Failed
          </span>
        )}
      </div>

      {/* Editor & Log console */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden min-h-0">
        
        {/* Monaco Editor Panel */}
        <div className="flex-1 glass rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-800/40 flex flex-col">
          <div className="h-12 border-b border-slate-200/80 dark:border-slate-800/80 px-5 flex items-center justify-between bg-white/20 dark:bg-slate-950/20">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
              <Terminal className="w-4 h-4 text-indigo-400" /> DDL Console
            </div>
            <button
              onClick={handleExecute}
              disabled={executing || !ddlSql.trim()}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs py-1.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              {executing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Execute DDL
            </button>
          </div>

          <div className="flex-1 bg-slate-950">
            <MonacoEditor
              height="100%"
              defaultLanguage="sql"
              theme="vs-dark"
              value={ddlSql}
              onChange={(value) => setDdlSql(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'Fira Code, monospace',
                lineHeight: 20,
                scrollBeyondLastLine: false,
                padding: { top: 12, bottom: 12 }
              }}
            />
          </div>
        </div>

        {/* Terminal/Log Panel */}
        <div className="w-full lg:w-96 glass rounded-3xl p-5 border border-slate-200/50 dark:border-slate-800/40 flex flex-col gap-4">
          <h3 className="font-extrabold text-slate-800 dark:text-white text-sm border-b border-slate-200 dark:border-slate-800 pb-3">
            Execution Terminal
          </h3>
          
          <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-900 p-4 font-mono text-xs overflow-y-auto leading-relaxed shadow-inner">
            {log ? (
              <div className={log.success ? 'text-emerald-400' : 'text-red-400'}>
                <div className="flex items-center gap-1.5 mb-2 font-bold">
                  {log.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {log.success ? 'DDL EXECUTED SUCCESS' : 'DDL ERROR'}
                </div>
                <div className="whitespace-pre-wrap">{log.message}</div>
              </div>
            ) : (
              <span className="text-slate-600">Terminal ready. Waiting for DDL execution...</span>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
import { AlertTriangle } from 'lucide-react';
