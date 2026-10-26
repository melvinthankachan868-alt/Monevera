import React from 'react';
import { FinTraQProvider } from './context/FinTraQContext';
import { ResearchProvider } from './context/ResearchContext';
import { AppShell } from './components/AppShell';
import { DevOverlay } from './components/DevOverlay';

export default function App() {
  return (
    <FinTraQProvider>
      <ResearchProvider>
        <AppShell />
        {import.meta.env.DEV && <DevOverlay />}
      </ResearchProvider>
    </FinTraQProvider>
  );
}
