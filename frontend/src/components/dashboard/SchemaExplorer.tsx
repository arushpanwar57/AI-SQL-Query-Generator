import React, { useState, useEffect } from 'react';
import { schemaAPI } from '../../services/api';
import { SchemaResponse, TableMetadata } from '../../types';
import { Database, Table, Key, Link as LinkIcon, RefreshCw, Layers, Search, Hash } from 'lucide-react';

export const SchemaExplorer: React.FC = () => {
  const [connStr, setConnStr] = useState(() => {
    const saved = localStorage.getItem('db_connection_string');
    if (!saved || saved === 'postgresql://postgres:postgres@db:5432/sql_assistant') {
      return 'sqlite:///./sql_assistant.db';
    }
    return saved;
  });
  
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableMetadata | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadSchema = async () => {
    if (!connStr) return;
    setLoading(true);
    setError(null);
    setSelectedTable(null);
    try {
      const data = await schemaAPI.inspect(connStr);
      setSchema(data);
      if (data.tables.length > 0) {
        setSelectedTable(data.tables[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch schema. Please verify connection credentials.');
      setSchema(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchema();
  }, []);

  const filteredTables = schema?.tables.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="flex flex-col gap-5 h-[calc(100vh-88px)] overflow-hidden">
      
      {/* Top action bar */}
      <div className="glass rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-200/50 dark:border-slate-800/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-800 dark:text-white text-base">Schema Explorer</h2>
            <p className="text-xs text-slate-400">Reflect structure and browse constraints safely</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            value={connStr}
            onChange={(e) => setConnStr(e.target.value)}
            placeholder="postgresql://user:pass@host:5432/dbname"
            className="flex-1 sm:w-80 bg-slate-100 dark:bg-slate-950/40 text-xs text-slate-800 dark:text-slate-200 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 font-mono transition-all"
          />
          <button
            onClick={loadSchema}
            disabled={loading}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 px-4 rounded-xl transition-all active:scale-[0.98] shrink-0"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-mono">
          {error}
        </div>
      )}

      {schema && (
        <div className="flex-1 flex gap-6 overflow-hidden">
          
          {/* Left panel: Table List */}
          <div className="w-72 glass rounded-3xl p-4 flex flex-col gap-4 border border-slate-200/50 dark:border-slate-800/40 overflow-hidden shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tables..."
                className="w-full bg-slate-100 dark:bg-slate-950/60 pl-9 pr-4 py-2 rounded-xl text-xs text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 placeholder-slate-400"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredTables.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">No tables matched.</div>
              ) : (
                filteredTables.map((table) => (
                  <button
                    key={table.name}
                    onClick={() => setSelectedTable(table)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      selectedTable?.name === table.name
                        ? 'bg-indigo-600 text-white border-transparent'
                        : 'bg-white dark:bg-slate-950/20 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Table className="w-4 h-4 shrink-0" />
                      <span className="truncate">{table.name}</span>
                    </span>
                    <span className={`text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded-md ${
                      selectedTable?.name === table.name ? 'bg-indigo-700/60 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                    }`}>
                      {table.columns.length}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right panel: Columns, Constraints & Relationships details */}
          {selectedTable ? (
            <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
              
              {/* Columns list */}
              <div className="flex-1 glass rounded-3xl p-5 border border-slate-200/50 dark:border-slate-800/40 overflow-hidden flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-extrabold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                      <Table className="w-5 h-5 text-indigo-400" /> Table '{selectedTable.name}' Schema
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" /> Estimated Rows: <b>{selectedTable.row_count_estimate}</b>
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-950/40 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Column</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Data Type</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Nullable</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Constraints</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTable.columns.map((col, idx) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all">
                          <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{col.name}</td>
                          <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{col.data_type}</td>
                          <td className="px-4 py-3 text-slate-500">{col.is_nullable ? 'Yes' : 'No'}</td>
                          <td className="px-4 py-3 flex flex-wrap gap-1.5">
                            {col.is_primary_key && (
                              <span className="flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/15 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-lg">
                                <Key className="w-3 h-3" /> PK
                              </span>
                            )}
                            {col.is_foreign_key && (
                              <span 
                                className="flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/15 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-lg"
                                title={`References ${col.foreign_key_target}`}
                              >
                                <LinkIcon className="w-3 h-3" /> FK ({col.foreign_key_target})
                              </span>
                            )}
                            {!col.is_primary_key && !col.is_foreign_key && (
                              <span className="text-slate-400 italic text-[10px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Foreign Keys and Constraints Panel */}
              <div className="w-full lg:w-80 glass rounded-3xl p-5 border border-slate-200/50 dark:border-slate-800/40 overflow-y-auto shrink-0 flex flex-col gap-4">
                <h3 className="font-extrabold text-slate-800 dark:text-white text-sm flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <Layers className="w-5 h-5 text-indigo-400" /> Relationships &amp; Joins
                </h3>

                {selectedTable.foreign_keys.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">No foreign key constraints defined for this table.</p>
                ) : (
                  <div className="space-y-4">
                    {selectedTable.foreign_keys.map((fk, idx) => (
                      <div key={idx} className="p-4 bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2">
                        <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold">
                          <LinkIcon className="w-3.5 h-3.5" /> Relation #{idx + 1}
                        </div>
                        <div className="text-[11px] space-y-1.5">
                          <div>
                            <span className="text-slate-400">Local columns:</span>
                            <pre className="mt-0.5 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800/40 font-mono font-bold text-slate-700 dark:text-slate-300">
                              {fk.constrained_columns.join(', ')}
                            </pre>
                          </div>
                          <div className="text-center py-0.5 text-indigo-400 font-bold">↳ references</div>
                          <div>
                            <span className="text-slate-400">Referred Table:</span>
                            <pre className="mt-0.5 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800/40 font-mono font-bold text-slate-700 dark:text-slate-300">
                              {fk.referred_table}({fk.referred_columns.join(', ')})
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex-1 glass rounded-3xl flex items-center justify-center text-slate-400 text-xs italic">
              Select a table from the list to explore metadata
            </div>
          )}

        </div>
      )}
      
      {!schema && !loading && (
        <div className="flex-1 glass rounded-3xl flex flex-col items-center justify-center text-slate-400 p-8 text-center">
          <Database className="w-12 h-12 text-slate-600 mb-3 animate-bounce" />
          <p className="text-sm font-semibold">Workspace Schema Unloaded</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">Please verify the database connection details in the header bar and click Refresh to reflect metadata.</p>
        </div>
      )}
    </div>
  );
};
