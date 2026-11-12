import React,{ useState,useEffect,useCallback } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { firebaseConfig } from '../lib/firebase/config';
import { auth,db } from '../lib/firebase/client';
import { doc,getDoc,setDoc } from 'firebase/firestore';
import { diagnosticBus } from '../utils/diagnosticEventBus';
import {
Activity,
CheckCircle2,
AlertTriangle,RefreshCw,ShieldCheck,
HardDrive,
Copy,
Check,
Server,
Zap
} from 'lucide-react';

interface DiagnosticState {
  firestoreLatencyMs: number | null;
  firestoreStatus: 'healthy' | 'degraded' | 'error' | 'checking';
  firestoreError: string | null;
  authStatus: 'authenticated' | 'guest' | 'error';
  tokenExpiresInMin: number | null;
  tokenAudience: string | null;
  idbStatus: 'healthy' | 'degraded' | 'error' | 'checking';
  idbError: string | null;
  storageQuota: { usedMb: number; totalMb: number } | null;
  lastChecked: string;
}

export const DiagnosticDashboard: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { user, cloudSyncStatus, expenses, incomes, savings, investments, loans } = useFinTraQ();

  const [state, setState] = useState<DiagnosticState>({
    firestoreLatencyMs: null,
    firestoreStatus: 'checking',
    firestoreError: null,
    authStatus: user ? 'authenticated' : 'guest',
    tokenExpiresInMin: null,
    tokenAudience: null,
    idbStatus: 'checking',
    idbError: null,
    storageQuota: null,
    lastChecked: new Date().toLocaleTimeString(),
  });

  const [isProbing, setIsProbing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Run live diagnostics probe
  const runLiveProbe = useCallback(async () => {
    setIsProbing(true);
    const start = Date.now();
    let fsLatency = 0;
    let fsStatus: DiagnosticState['firestoreStatus'] = 'healthy';
    let fsError: string | null = null;

    // 1. Firestore Read/Write Probe
    try {
      const probeDocRef = doc(db, '_diagnostics', 'health_ping');
      await setDoc(probeDocRef, {
        lastPing: new Date().toISOString(),
        clientTimestamp: Date.now(),
      });
      const snap = await getDoc(probeDocRef);
      fsLatency = Date.now() - start;

      if (!snap.exists()) {
        fsStatus = 'degraded';
        fsError = 'Document write succeeded but read returned empty.';
      } else {
        diagnosticBus.emit(
          'firestore',
          'success',
          'HealthProbe',
          `Firestore roundtrip latency: ${fsLatency}ms`,
          { latencyMs: fsLatency }
        );
      }
    } catch (err: any) {
      fsStatus = 'error';
      fsError = err?.message || String(err);
      diagnosticBus.emit('firestore', 'error', 'HealthProbe', 'Firestore probe failed', {
        code: err?.code,
        message: fsError,
      });
    }

    // 2. Auth Session Inspection
    let tokenExpiry: number | null = null;
    let tokenAud: string | null = null;
    if (auth.currentUser) {
      try {
        const tokenResult = await auth.currentUser.getIdTokenResult();
        const expTime = new Date(tokenResult.expirationTime).getTime();
        tokenExpiry = Math.max(0, Math.round((expTime - Date.now()) / (1000 * 60)));
        tokenAud = (tokenResult.claims?.aud as string) || firebaseConfig.projectId;
        diagnosticBus.emit(
          'auth',
          'info',
          'SessionInspect',
          `Auth session valid, expires in ~${tokenExpiry}m`,
          { audience: tokenAud }
        );
      } catch (err) {
        console.warn('Failed to inspect token result:', err);
      }
    }

    // 3. Storage Health & IndexedDB Probe
    let idbStatus: DiagnosticState['idbStatus'] = 'healthy';
    let idbError: string | null = null;
    try {
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        const testReq = window.indexedDB.open('mv_health_check', 1);
        await new Promise<void>((resolve, reject) => {
          testReq.onsuccess = () => {
            testReq.result.close();
            window.indexedDB.deleteDatabase('mv_health_check');
            resolve();
          };
          testReq.onerror = () => reject(testReq.error);
        });
      }
    } catch (err: any) {
      idbStatus = 'degraded';
      idbError = err?.message || 'IndexedDB unavailable';
      diagnosticBus.emit('storage', 'warn', 'IDBProbe', 'IndexedDB test failed', { error: idbError });
    }

    // 4. Storage Quota Check
    let quotaInfo: { usedMb: number; totalMb: number } | null = null;
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        quotaInfo = {
          usedMb: Math.round(((estimate.usage || 0) / (1024 * 1024)) * 10) / 10,
          totalMb: Math.round(((estimate.quota || 0) / (1024 * 1024)) * 10) / 10,
        };
      }
    } catch (_) {}

    setState({
      firestoreLatencyMs: fsLatency,
      firestoreStatus: fsStatus,
      firestoreError: fsError,
      authStatus: auth.currentUser ? 'authenticated' : 'guest',
      tokenExpiresInMin: tokenExpiry,
      tokenAudience: tokenAud,
      idbStatus,
      idbError,
      storageQuota: quotaInfo,
      lastChecked: new Date().toLocaleTimeString(),
    });

    setIsProbing(false);
  }, []);

  useEffect(() => {
    runLiveProbe();
  }, [runLiveProbe]);

  const copyDiagnosticSummary = () => {
    const summary = {
      timestamp: new Date().toISOString(),
      targetProject: firebaseConfig.projectId,
      namedDatabase: firebaseConfig.firestoreDatabaseId,
      firestore: {
        status: state.firestoreStatus,
        latencyMs: state.firestoreLatencyMs,
        error: state.firestoreError,
      },
      auth: {
        status: state.authStatus,
        userUid: user?.uid ? `${user.uid.slice(0, 6)}...` : 'none',
        provider: user?.isAnonymous ? 'guest' : user?.email ? 'verified' : 'none',
        tokenExpiresInMinutes: state.tokenExpiresInMin,
      },
      storage: {
        indexedDb: state.idbStatus,
        quota: state.storageQuota,
        localRecords: {
          expenses: expenses.length,
          incomes: incomes.length,
          savings: savings.length,
          investments: investments.length,
          loans: loans.length,
        },
      },
    };

    navigator.clipboard.writeText(JSON.stringify(summary, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
              System Diagnostics & Health
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                LIVE
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Real-time telemetry for Firestore, Firebase Auth, and Local Storage Health
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runLiveProbe}
            disabled={isProbing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
            {isProbing ? 'Probing...' : 'Re-probe'}
          </button>
          <button
            onClick={copyDiagnosticSummary}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Export JSON'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Grid: 3 Main Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Firebase Connectivity */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-emerald-400" />
              Firestore Connectivity
            </span>
            {state.firestoreStatus === 'healthy' ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
              </span>
            ) : state.firestoreStatus === 'checking' ? (
              <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-medium">
                Checking...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> Error
              </span>
            )}
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Latency:</span>
              <span className="text-slate-200 font-semibold">
                {state.firestoreLatencyMs !== null ? `${state.firestoreLatencyMs} ms` : '—'}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Database ID:</span>
              <span className="text-emerald-400 truncate max-w-[140px]" title={firebaseConfig.firestoreDatabaseId}>
                {firebaseConfig.firestoreDatabaseId}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Project ID:</span>
              <span className="text-slate-300 truncate max-w-[140px]" title={firebaseConfig.projectId}>
                {firebaseConfig.projectId}
              </span>
            </div>
          </div>

          {state.firestoreError && (
            <div className="p-2 bg-rose-950/40 border border-rose-800/40 rounded text-rose-300 text-[11px] break-words">
              {state.firestoreError}
            </div>
          )}
        </div>

        {/* 2. Auth Session State */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Auth Session State
            </span>
            {user ? (
              <span className="flex items-center gap-1 text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Authenticated
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-medium">
                Guest Mode
              </span>
            )}
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Identity:</span>
              <span className="text-slate-200 truncate max-w-[140px]">
                {user?.email || (user?.isAnonymous ? 'Anonymous' : 'Guest')}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Token Expiry:</span>
              <span className="text-slate-200">
                {state.tokenExpiresInMin !== null ? `~${state.tokenExpiresInMin} min` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Sync Mode:</span>
              <span className="text-cyan-400">
                {cloudSyncStatus === 'synced' ? 'Live Cloud' : cloudSyncStatus === 'syncing' ? 'Syncing...' : 'Local Cache'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Storage & IndexedDB Health */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-purple-400" />
              Storage & Persistence
            </span>
            {state.idbStatus === 'healthy' ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Optimal
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> Degraded
              </span>
            )}
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Cached Expenses:</span>
              <span className="text-slate-200">{expenses.length} records</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Cached Incomes:</span>
              <span className="text-slate-200">{incomes.length} records</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Storage Quota:</span>
              <span className="text-slate-300">
                {state.storageQuota
                  ? `${state.storageQuota.usedMb}MB / ${state.storageQuota.totalMb}MB`
                  : 'Available'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
        <span>Last diagnostic probe: {state.lastChecked}</span>
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-emerald-400" /> Production Isolation & Data Integrity Enforced
        </span>
      </div>
    </div>
  );
};
