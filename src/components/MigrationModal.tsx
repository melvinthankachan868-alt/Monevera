import React from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import { CloudUpload, AlertCircle, RefreshCw } from 'lucide-react';

export const MigrationModal: React.FC = () => {
  const {
    migrationPromptOpen,
    migrateLocalDataToCloud,
    dismissMigrationPrompt,
    cloudSyncStatus,
    incomes,
    expenses,
    moneyOwed,
  } = useFinTraQ();

  if (!migrationPromptOpen) return null;

  const totalRecords = incomes.length + expenses.length + moneyOwed.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#F45B16] flex items-center justify-center">
          <CloudUpload size={24} />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-extrabold text-slate-900">Existing Local Data Found</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            You have <b>{totalRecords} financial records</b> stored on this device. Would you like to securely upload and back them up to your Money Vault cloud account?
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <AlertCircle size={14} className="text-[#F45B16]" />
            <span>Cloud Sync Benefit</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Backing up allows you to recover all your financial records seamlessly if you switch devices or clear browser storage.
          </p>
        </div>
        <div className="space-y-2 pt-2">
          <button
            type="button"
            disabled={cloudSyncStatus === 'syncing'}
            onClick={migrateLocalDataToCloud}
            className="w-full py-3 px-4 rounded-2xl bg-[#F45B16] hover:bg-[#E44806] text-white text-xs font-bold transition-all shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
          >
            {cloudSyncStatus === 'syncing' ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Backing up to Cloud...</span>
              </>
            ) : (
              <span>Back up and Continue</span>
            )}
          </button>
          <button
            type="button"
            onClick={dismissMigrationPrompt}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all text-center"
          >
            Start Fresh (Keep Local Only)
          </button>
        </div>
      </div>
    </div>
  );
};
