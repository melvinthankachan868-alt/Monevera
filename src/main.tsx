import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { verifyFirebaseConfig } from './utils/firebaseDiagnostic';
import { diagnosticBus } from './utils/diagnosticEventBus';

// Capture runtime errors and unhandled promise rejections into the Diagnostic Event Bus
// WITHOUT hiding or suppressing them from browser console or error monitoring tools
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = (reason && (reason.message || String(reason))) || 'Unknown promise rejection';
    diagnosticBus.emit('system', 'error', 'UnhandledRejection', message, {
      stack: reason?.stack?.slice(0, 500),
    });
  });

  window.addEventListener('error', (event) => {
    // Exclude harmless script-level 0-line cross-origin messages
    if (!event.message) return;
    diagnosticBus.emit('system', 'error', 'WindowError', event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
}

// Run initial configuration diagnostic probe non-blockingly
verifyFirebaseConfig()
  .then((report) => {
    diagnosticBus.emit(
      'auth',
      'info',
      'FirebaseInit',
      `Target DB: ${report.firestoreDatabaseId} (Project: ${report.projectId})`,
      {
        authDomain: report.authDomain,
        currentUser: report.authInstance.currentUser?.uid || 'guest',
        providerStatus: report.passwordProviderProbe.statusSummary,
      }
    );
  })
  .catch((e) => {
    diagnosticBus.emit('system', 'warn', 'FirebaseInit', 'Initial diagnostic probe notice', {
      error: String(e?.message || e),
    });
  });

createRoot(document.getElementById('root')!).render(<App />);
