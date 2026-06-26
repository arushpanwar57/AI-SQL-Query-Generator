import React, { useState, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { queryAPI, schemaAPI, historyAPI } from '../../services/api';
import { QueryGenerateResponse, QueryExecuteResponse, HistoryItem } from '../../types';
import { 
  Play, Sparkles, AlertTriangle, ShieldCheck, CheckCircle2, 
  HelpCircle, Copy, Check, Download, RefreshCw, Database, Terminal, Search
} from 'lucide-react';

export const QueryGenerator: React.FC = () => {
  // Database Connection URL
  const [connStr, setConnStr] = useState(() => {
    return localStorage.getItem('db_connection_string') || 'postgresql://postgres:postgres@db:5432/sql_assistant';
  });
  const [connOk, setConnOk] = useState<boolean | null>(null);
  const [testingConn, setTestingConn] = useState(false);

  // Search & History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchHistory, setSearchHistory] = useState('');

  // Generation
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [pipelineData, setPipelineData] = useState<QueryGenerateResponse | null>(null);
  
  // SQL Editor State
  const [sql, setSql] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'explain' | 'alternatives' | 'safety' | 'optimize' | 'impact'>('explain');

  // Execution
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<QueryExecuteResponse | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('db_connection_string', connStr);
  }, [connStr]);

  const loadHistory = async () => {
    try {
      const items = await historyAPI.getHistory(searchHistory);
      setHistory(items);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [searchHistory]);

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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setGenerating(true);
    setExecResult(null);
    try {
      const data = await queryAPI.generate(prompt, connStr);
      setPipelineData(data);
      setSql(data.generated_sql);
      loadHistory(); // reload history
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Query generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleExecute = async (confirmed: boolean = false) => {
    if (!sql.trim()) return;
    
    // Check if destructive and unconfirmed
    if (pipelineData?.validation?.is_destructive && !confirmed) {
      setShowConfirmModal(true);
      return;
    }
    
    setShowConfirmModal(false);
    setExecuting(true);
    setExecResult(null);
    try {
      const res = await queryAPI.execute(sql, connStr, true);
      setExecResult(res);
      loadHistory();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Execution failed.');
    } finally {
      setExecuting(false);
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectHistoryItem = (item: HistoryItem) => {
    setSql(item.generated_sql);
    setPrompt(item.prompt);
    // Reset pipeline display
    setPipelineData(null);
    setExecResult(null);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-88px)]">
      {/* LEFT SIDEBAR: History Panel */}
      <div className="w-80 glass rounded-3xl p-4 flex flex-col gap-4 overflow-hidden border border-slate-200/50 dark:border-slate-800/40 shrink-0">
        <h3 className="font-bold text-sm tracking-wide text-slate-400 dark:text-slate-500 uppercase px-1">Query History</h3>
        
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchHistory}
            onChange={(e) => setSearchHistory(e.target.value)}
            placeholder="Search queries..."
            className="w-full bg-slate-100 dark:bg-slate-950/60 pl-9 pr-4 py-2 rounded-xl text-xs text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 placeholder-slate-400"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {history.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">No queries logged yet.</div>
          ) : (
            history.map((item) => (
              <button
                key={item.id}
                onClick={() => selectHistoryItem(item)}
                className="w-full text-left p-3 rounded-2xl border border-slate-100 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all hover:scale-[1.01] active:scale-[0.99] group bg-white dark:bg-slate-950/20"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                    item.execution_status === 'success' 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : item.execution_status === 'failed'
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-indigo-500/10 text-indigo-400'
                  }`}>
                    {item.execution_status}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-2 mb-1 group-hover:text-indigo-400 transition-colors">
                  {item.prompt}
                </p>
                <pre className="text-[9px] font-mono text-slate-400 truncate dark:text-slate-500 bg-slate-50 dark:bg-slate-950/60 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800/40">
                  {item.generated_sql}
                </pre>
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT SIDE: Main Generator & Editors */}
      <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-2">
        
        {/* Connection Configuration Strip */}
        <div className="glass rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 border border-slate-200/50 dark:border-slate-800/40">
          <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 font-semibold text-sm shrink-0">
            <Database className="w-5 h-5" /> Target Connection
          </div>
          <input
            type="text"
            value={connStr}
            onChange={(e) => setConnStr(e.target.value)}
            placeholder="postgresql://user:pass@host:5432/dbname"
            className="flex-1 w-full bg-slate-100 dark:bg-slate-950/40 text-xs text-slate-800 dark:text-slate-200 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 placeholder-slate-500 font-mono transition-all"
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

        {/* Natural Language Prompt Area */}
        <div className="glass rounded-3xl p-5 border border-slate-200/50 dark:border-slate-800/40">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" /> Ask AI Generator
              </h3>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Natural Language to SQL</span>
            </div>
            
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g. Show all users registered in the last 7 days earning more than 50000 sorted by latest..."
              rows={2}
              className="w-full bg-white dark:bg-slate-950/40 text-slate-800 dark:text-white p-4 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm placeholder-slate-400 dark:placeholder-slate-600 transition-all leading-relaxed shadow-inner"
            />
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={generating || !prompt.trim()}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-indigo-600/10 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate SQL
              </button>
            </div>
          </form>
        </div>

        {/* Monaco SQL Editor Workspace */}
        <div className="glass rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-800/40 flex flex-col">
          <div className="h-12 border-b border-slate-200/80 dark:border-slate-800/80 px-5 flex items-center justify-between bg-white/20 dark:bg-slate-950/20">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
              <Terminal className="w-4 h-4 text-indigo-400" /> Monaco Editor
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleCopy}
                disabled={!sql}
                className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-all"
                title="Copy SQL"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={() => handleExecute(false)}
                disabled={executing || !sql}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-1.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.98]"
              >
                {executing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Run Query
              </button>
            </div>
          </div>

          <div className="h-48 bg-slate-950">
            <MonacoEditor
              height="100%"
              defaultLanguage="sql"
              theme="vs-dark"
              value={sql}
              onChange={(value) => setSql(value || '')}
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

        {/* Dynamic Pipeline Analysis Tabs */}
        {pipelineData && (
          <div className="glass rounded-3xl p-5 border border-slate-200/50 dark:border-slate-800/40 flex flex-col gap-4">
            <div className="flex border-b border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setActiveTab('explain')}
                className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 -mb-[2px] transition-all ${
                  activeTab === 'explain' 
                    ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                Explanation
              </button>
              <button
                onClick={() => setActiveTab('alternatives')}
                className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 -mb-[2px] transition-all ${
                  activeTab === 'alternatives' 
                    ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                Alternatives ({pipelineData.alternatives?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('safety')}
                className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 -mb-[2px] transition-all ${
                  activeTab === 'safety' 
                    ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                Safety &amp; Validation
                {(!pipelineData.validation?.is_valid || pipelineData.validation?.is_destructive) && (
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block ml-1.5 animate-ping"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('optimize')}
                className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 -mb-[2px] transition-all ${
                  activeTab === 'optimize' 
                    ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                Optimizations
              </button>
              <button
                onClick={() => setActiveTab('impact')}
                className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 -mb-[2px] transition-all ${
                  activeTab === 'impact' 
                    ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                Impact Analysis
              </button>
            </div>

            <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {activeTab === 'explain' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Confidence Score:</span>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">{(pipelineData.confidence_score * 100).toFixed(0)}%</span>
                  </div>
                  <p className="whitespace-pre-wrap">{pipelineData.explanation}</p>
                </div>
              )}

              {activeTab === 'alternatives' && (
                <div className="space-y-3">
                  {pipelineData.alternatives?.length === 0 ? (
                    <p className="text-slate-400 text-xs italic">No alternative suggestions available for this query.</p>
                  ) : (
                    pipelineData.alternatives.map((altSql, index) => (
                      <div key={index} className="p-3 bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                        <code className="text-xs font-mono text-slate-800 dark:text-slate-300 overflow-x-auto select-all">{altSql}</code>
                        <button
                          onClick={() => setSql(altSql)}
                          className="bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all"
                        >
                          Use This
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'safety' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {pipelineData.validation?.is_valid ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/15">
                        <ShieldCheck className="w-4 h-4" /> Syntax Validated
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-red-400 font-bold bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/15">
                        <AlertTriangle className="w-4 h-4" /> Syntax Errors Found
                      </div>
                    )}
                  </div>
                  {pipelineData.validation?.errors.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1 text-xs text-red-300 font-mono bg-red-500/5 p-3 rounded-xl border border-red-500/10">
                      {pipelineData.validation.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  )}
                  {pipelineData.validation?.warning_message && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-300 text-xs flex gap-3">
                      <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                      <span>{pipelineData.validation.warning_message}</span>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'optimize' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wider">Optimized Alternative</h4>
                      <pre className="text-xs font-mono bg-slate-950 p-3 rounded-2xl border border-slate-800 text-indigo-300 overflow-x-auto whitespace-pre-wrap">{pipelineData.optimization?.optimized_sql}</pre>
                      <button
                        onClick={() => setSql(pipelineData.optimization.optimized_sql)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-1.5 px-3 rounded-xl transition-all"
                      >
                        Apply Optimized SQL
                      </button>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wider">Improvement Suggestions</h4>
                      <ul className="list-disc pl-5 space-y-1.5 text-xs">
                        {pipelineData.optimization?.suggestions.map((sug, i) => <li key={i}>{sug}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'impact' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl text-center">
                    <span className="block text-slate-400 text-xs font-semibold mb-1">Risk Profile</span>
                    <span className={`inline-block font-extrabold text-sm uppercase px-3 py-1 rounded-xl ${
                      pipelineData.impact?.risk_level === 'Low'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : pipelineData.impact?.risk_level === 'Medium'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {pipelineData.impact?.risk_level}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl text-center">
                    <span className="block text-slate-400 text-xs font-semibold mb-1">Estimated Rows Returned</span>
                    <span className="font-bold text-lg text-slate-800 dark:text-slate-200">{pipelineData.impact?.estimated_rows_returned}</span>
                  </div>
                  <div className="p-4 bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl text-center">
                    <span className="block text-slate-400 text-xs font-semibold mb-1">Estimated Rows Modified</span>
                    <span className="font-bold text-lg text-slate-800 dark:text-slate-200">{pipelineData.impact?.estimated_rows_modified}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Execution Results Grid */}
        {execResult && (
          <div className="glass rounded-3xl p-5 border border-slate-200/50 dark:border-slate-800/40 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">Execution Result</h3>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>Execution Time: <b className="text-slate-700 dark:text-slate-200">{execResult.execution_time_ms}ms</b></span>
                  <span>Rows Affected: <b className="text-slate-700 dark:text-slate-200">{execResult.rows_affected}</b></span>
                </div>
              </div>

              {execResult.columns?.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadFile(execResult.export_csv || '', 'export.csv', 'text/csv')}
                    className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold py-1.5 px-3 rounded-xl transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> CSV
                  </button>
                  <button
                    onClick={() => downloadFile(execResult.export_json || '', 'export.json', 'application/json')}
                    className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold py-1.5 px-3 rounded-xl transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> JSON
                  </button>
                </div>
              )}
            </div>

            {execResult.error ? (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-mono leading-relaxed">
                {execResult.error}
              </div>
            ) : execResult.columns?.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 font-medium">Query executed successfully. No rows returned.</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-950/40 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      {execResult.columns.map((col, idx) => (
                        <th key={idx} className="px-4 py-3 font-semibold uppercase tracking-wider">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {execResult.data.map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all">
                        {row.map((val, cellIdx) => (
                          <td key={cellIdx} className="px-4 py-3 text-slate-700 dark:text-slate-300 font-mono truncate max-w-[200px]" title={String(val)}>
                            {val === null ? <span className="text-slate-400 italic">null</span> : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONFIRM DESTRUCTIVE MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-900 border border-red-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-200">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="text-lg font-bold">Dangerous Query Warning</h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              This query contains elements that could modify or drop data without proper bounds. If you execute it, the changes will be permanent.
            </p>
            
            <pre className="p-3 bg-red-500/5 border border-red-500/10 rounded-2xl text-[10px] font-mono text-red-300 max-h-36 overflow-y-auto mb-6 whitespace-pre-wrap">
              {sql}
            </pre>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs py-2.5 px-4 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExecute(true)}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs py-2.5 px-5 rounded-xl shadow-lg shadow-red-600/10 transition-all active:scale-[0.98]"
              >
                Confirm and Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
