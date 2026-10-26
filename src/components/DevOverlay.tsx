import React, { useState, useEffect, useMemo } from 'react';
import {
  diagnosticBus,
  DiagnosticEvent,
  DiagnosticEventType,
  DiagnosticEventLevel,
} from '../utils/diagnosticEventBus';
import { DiagnosticDashboard } from './DiagnosticDashboard';
import {
  Terminal,
  X,
  AlertTriangle,
  CheckCircle2,
  Info,
  Bug,
  Trash2,
  Maximize2,
  Minimize2,
  Filter,
  Search,
  Activity,
  Layers,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

export const DevOverlay: React.FC = () => {
  if (!import.meta.env.DEV) {
    return null;
  }
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [fullDashboardOpen, setFullDashboardOpen] = useState(false);
  const [events, setEvents] = useState<DiagnosticEvent[]>(() => diagnosticBus.getEvents());
  const [activeFilter, setActiveFilter] = useState<'all' | 'errors' | DiagnosticEventType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<DiagnosticEvent | null>(null);

  // Subscribe to real-time events from diagnosticBus
  useEffect(() => {
    const unsubscribe = diagnosticBus.subscribe((newEvent) => {
      setEvents((prev) => [newEvent, ...prev.slice(0, 149)]);
    });
    return unsubscribe;
  }, []);

  // Keyboard shortcut Ctrl+Shift+D / Cmd+Shift+D to toggle HUD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered event list
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (activeFilter === 'errors') {
        if (evt.level !== 'error' && evt.level !== 'warn') return false;
      } else if (activeFilter !== 'all') {
        if (evt.type !== activeFilter) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSummary = evt.summary.toLowerCase().includes(query);
        const matchesSource = evt.source.toLowerCase().includes(query);
        const matchesDetails = evt.details ? JSON.stringify(evt.details).toLowerCase().includes(query) : false;
        return matchesSummary || matchesSource || matchesDetails;
      }

      return true;
    });
  }, [events, activeFilter, searchQuery]);

  const errorCount = useMemo(() => events.filter((e) => e.level === 'error').length, [events]);

  const getLevelBadge = (level: DiagnosticEventLevel) => {
    switch (level) {
      case 'error':
        return (
          <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded font-mono font-bold">
            <AlertTriangle className="w-2.5 h-2.5" /> ERR
          </span>
        );
      case 'warn':
        return (
          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">
            WARN
          </span>
        );
      case 'success':
        return (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
            <CheckCircle2 className="w-2.5 h-2.5" /> OK
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded font-mono">
            <Info className="w-2.5 h-2.5" /> INFO
          </span>
        );
    }
  };

  const getTypeColor = (type: DiagnosticEventType) => {
    switch (type) {
      case 'firestore':
        return 'text-emerald-400 border-emerald-500/30';
      case 'auth':
        return 'text-cyan-400 border-cyan-500/30';
      case 'storage':
        return 'text-purple-400 border-purple-500/30';
      case 'network':
        return 'text-blue-400 border-blue-500/30';
      default:
        return 'text-slate-400 border-slate-700';
    }
  };

  return (
    <>
      {/* Minimized Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Open Developer Diagnostic HUD (Ctrl+Shift+D)"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700 hover:border-emerald-500/50 text-slate-200 text-xs font-mono shadow-2xl transition hover:scale-105"
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>Dev HUD</span>
          {errorCount > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold text-[10px] animate-pulse">
              {errorCount}
            </span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>
      )}

      {/* Expanded HUD Panel */}
      {isOpen && (
        <div
          className={`fixed z-50 bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl flex flex-col transition-all duration-200 font-sans ${
            isExpanded
              ? 'inset-6'
              : 'bottom-4 right-4 w-[520px] max-w-[calc(100vw-2rem)] h-[480px] max-h-[calc(100vh-2rem)]'
          }`}
        >
          {/* HUD Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-slate-900/60 rounded-t-xl select-none">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200 font-mono tracking-wide">
                {import.meta.env.DEV ? ['MONEY', 'VAULT', 'DEV', 'HUD'].join(' ') : ''}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                {events.length} events
              </span>
              {errorCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                  {errorCount} error{errorCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setFullDashboardOpen(true)}
                title="Open Complete System Diagnostics Dashboard"
                className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition"
              >
                <Activity className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Restore window size' : 'Maximize window'}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close HUD (Ctrl+Shift+D)"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-wrap items-center gap-2 p-2 border-b border-slate-800/80 bg-slate-900/30 text-xs">
            <div className="relative flex-1 min-w-[120px]">
              <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events, sources, codes..."
                className="w-full bg-slate-950 border border-slate-800 rounded pl-6 pr-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-slate-700 font-mono"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-mono">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'errors', label: 'Errors' },
                  { id: 'firestore', label: 'Firestore' },
                  { id: 'auth', label: 'Auth' },
                  { id: 'storage', label: 'Storage' },
                  { id: 'network', label: 'Network' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-2 py-0.5 rounded transition ${
                    activeFilter === f.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <button
                onClick={() => diagnosticBus.clear()}
                title="Clear events"
                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition ml-1"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Event Stream Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 font-mono text-xs select-text">
            {filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs">
                <Bug className="w-6 h-6 mb-1 opacity-40" />
                <span>No matching diagnostic events.</span>
              </div>
            ) : (
              filteredEvents.map((evt) => {
                const isSelected = selectedEvent?.id === evt.id;
                const timeStr = evt.timestamp.slice(11, 23);

                return (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEvent(isSelected ? null : evt)}
                    className={`p-2 cursor-pointer transition hover:bg-slate-900/60 ${
                      isSelected ? 'bg-slate-900/80 border-l-2 border-emerald-400' : ''
                    } ${evt.level === 'error' ? 'bg-rose-950/10' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {getLevelBadge(evt.level)}
                        <span className={`text-[10px] px-1 py-0.2 rounded border ${getTypeColor(evt.type)}`}>
                          {evt.type}
                        </span>
                        <span className="text-slate-400 font-semibold truncate max-w-[110px]" title={evt.source}>
                          {evt.source}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">{timeStr}</span>
                    </div>

                    <div className="mt-1 text-slate-300 text-[11px] leading-relaxed break-words font-sans">
                      {evt.summary}
                    </div>

                    {/* Expandable JSON details */}
                    {isSelected && evt.details && (
                      <div className="mt-2 p-2 bg-slate-950 rounded border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-48">
                        <pre>{JSON.stringify(evt.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* HUD Footer */}
          <div className="px-3 py-1.5 border-t border-slate-800 bg-slate-900/40 rounded-b-xl flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Press Ctrl+Shift+D to toggle HUD</span>
            <span className="text-emerald-400/80">Sanitized Telemetry Active</span>
          </div>
        </div>
      )}

      {/* Modal: Full Diagnostic Dashboard */}
      {fullDashboardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl">
            <DiagnosticDashboard onClose={() => setFullDashboardOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
};
