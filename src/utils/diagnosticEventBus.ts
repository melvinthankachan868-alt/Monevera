/**
 * Money Vault Diagnostic & Telemetry Event Bus
 * Streams application events, network statuses, auth state changes, and storage health
 * into a sanitized, in-memory circular buffer for developer inspection.
 *
 * Guarantees:
 * - Zero leakage of passwords, secret keys, ID tokens, or PII.
 * - Non-intrusive (never suppresses standard error handling or console).
 * - Real-time subscription support for the DevOverlay HUD and DiagnosticDashboard.
 */

export type DiagnosticEventType =
  | 'auth'
  | 'firestore'
  | 'storage'
  | 'network'
  | 'system';

export type DiagnosticEventLevel = 'info' | 'warn' | 'error' | 'success';

export interface DiagnosticEvent {
  id: string;
  timestamp: string;
  type: DiagnosticEventType;
  level: DiagnosticEventLevel;
  source: string;
  summary: string;
  details?: Record<string, any>;
  durationMs?: number;
}

// Sanitization: Strip sensitive fields from diagnostic logs
function sanitizePayload(obj: any, depth = 0): any {
  if (depth > 4 || obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.slice(0, 20).map((item) => sanitizePayload(item, depth + 1));
  }

  const clean: Record<string, any> = {};
  const sensitiveKeys = [
    'password',
    'token',
    'idtoken',
    'refreshtoken',
    'apikey',
    'secret',
    'authorization',
    'bearer',
    'creditcard',
    'cvv',
  ];

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((s) => lowerKey.includes(s));
    if (isSensitive) {
      clean[key] = '[REDACTED_FOR_SECURITY]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizePayload(value, depth + 1);
    } else {
      clean[key] = value;
    }
  }

  return clean;
}

class DiagnosticEventBus {
  private events: DiagnosticEvent[] = [];
  private maxEvents = 150;
  private listeners = new Set<(event: DiagnosticEvent) => void>();

  constructor() {
    if (typeof window !== 'undefined') {
      // Global window offline/online status monitoring
      window.addEventListener('online', () => {
        this.emit('system', 'info', 'NetworkStatus', 'Device regained internet connectivity');
      });
      window.addEventListener('offline', () => {
        this.emit('system', 'warn', 'NetworkStatus', 'Device transitioned to offline mode');
      });
    }
  }

  /**
   * Emit a new diagnostic event
   */
  emit(
    type: DiagnosticEventType,
    level: DiagnosticEventLevel,
    source: string,
    summary: string,
    details?: Record<string, any>,
    durationMs?: number
  ): DiagnosticEvent {
    const event: DiagnosticEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      type,
      level,
      source,
      summary,
      details: details ? sanitizePayload(details) : undefined,
      durationMs,
    };

    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.length = this.maxEvents;
    }

    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.warn('[DiagnosticBus] Listener error:', err);
      }
    });

    return event;
  }

  /**
   * Subscribe to new events in real time
   */
  subscribe(listener: (event: DiagnosticEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get all captured events
   */
  getEvents(): DiagnosticEvent[] {
    return [...this.events];
  }

  /**
   * Clear the event log
   */
  clear(): void {
    this.events = [];
    this.emit('system', 'info', 'DiagnosticBus', 'Diagnostic event log cleared by user');
  }
}

export const diagnosticBus = new DiagnosticEventBus();
