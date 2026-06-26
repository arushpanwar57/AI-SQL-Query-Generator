import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Terminal, Database, Shield, History, Network } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { isAdmin, isDeveloper } = useAuth();

  const getLinkClass = ({ isActive }: { isActive: boolean }) => {
    return `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
      isActive 
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/40'
    }`;
  };

  return (
    <aside className="w-64 border-r border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/40 backdrop-blur-md h-full flex flex-col justify-between p-4 z-20 shrink-0 select-none transition-colors duration-300">
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-2">Workspace</div>
          <NavLink to="/" end className={getLinkClass}>
            <Terminal className="w-5 h-5 shrink-0 group-hover:scale-105 transition-transform" />
            <span>SQL Assistant</span>
          </NavLink>
          
          <NavLink to="/schema" className={getLinkClass}>
            <Network className="w-5 h-5 shrink-0 group-hover:scale-105 transition-transform" />
            <span>Schema Explorer</span>
          </NavLink>
        </div>

        {isDeveloper && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-2">Developer Tools</div>
            <NavLink to="/developer-ddl" className={getLinkClass}>
              <Database className="w-5 h-5 shrink-0 group-hover:scale-105 transition-transform" />
              <span>DDL Manager</span>
            </NavLink>
          </div>
        )}

        {isAdmin && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-2">Management</div>
            <NavLink to="/admin" className={getLinkClass}>
              <Shield className="w-5 h-5 shrink-0 group-hover:scale-105 transition-transform" />
              <span>Admin Portal</span>
            </NavLink>
          </div>
        )}
      </div>

      <div className="p-3 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 text-center">
        <div className="text-xs font-bold text-indigo-500 dark:text-indigo-400">AI Database Assistant</div>
        <p className="text-[10px] text-slate-400 mt-1">Reflects database metadata schema safely for SQL construction.</p>
      </div>
    </aside>
  );
};
