import React, { useCallback, useEffect, useState } from 'react';
import {
  FileSearch,
  FolderArchive,
  LayoutDashboard,
  Loader2,
  Plus,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { CaptureModal } from './components/CaptureModal';
import { CarePlanView } from './components/CarePlanView';
import { EobAuditorView } from './components/EobAuditorView';
import { OverviewView } from './components/OverviewView';
import { SplitLedgerView } from './components/SplitLedgerView';
import { TaxMedicaidVaultView } from './components/TaxMedicaidVaultView';
import type { MedicalClaim, WorkspaceSnapshot } from './types';

type ActiveTab = 'overview' | 'auditor' | 'ledger' | 'vault' | 'plan';

const TAB_LABELS: Record<ActiveTab, string> = {
  overview: 'Overview',
  auditor: 'EOB & Bill Auditor',
  ledger: 'Family Split Ledger',
  vault: 'Tax & Medicaid Vault',
  plan: 'Care Plan & Compliance',
};

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [activeMemberId, setActiveMemberId] = useState<string>('maya');
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureInitialTab, setCaptureInitialTab] = useState<'bill' | 'receipt' | 'manual'>('bill');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchWorkspace = useCallback(async () => {
    try {
      const res = await fetch('/api/workspace');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load family care workspace');
      }
      setWorkspace(data as WorkspaceSnapshot);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to reach workspace server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWorkspace();
  }, [fetchWorkspace]);

  if (isLoading && !workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F7F4] text-[#1C2421]">
        <div className="flex items-center gap-3 text-sm font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-[#2D5A4C]" />
          <span>Loading Vance Family Care Workspace...</span>
        </div>
      </div>
    );
  }

  if (loadError && !workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F7F4] p-6">
        <div className="max-w-md rounded-xl border border-[#E5E2DC] bg-white p-6 text-center">
          <h1 className="text-base font-semibold text-[#1C2421]">Workspace Unavailable</h1>
          <p className="mt-2 text-xs text-[#5A6662]">{loadError}</p>
          <button
            type="button"
            onClick={() => void fetchWorkspace()}
            className="mt-4 rounded-lg bg-[#2D5A4C] px-4 py-2 text-xs font-medium text-white hover:bg-[#23473C]"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!workspace) return null;

  const activeMember =
    workspace.members.find((m) => m.id === activeMemberId) ?? workspace.members[0];

  const handleOpenCapture = (mode: 'bill' | 'receipt' | 'manual') => {
    setCaptureInitialTab(mode);
    setCaptureOpen(true);
  };

  const handleClaimAudited = (claim: MedicalClaim) => {
    setSelectedClaimId(claim.id);
    setActiveTab('auditor');
  };

  const handleExpenseCreated = () => {
    setActiveTab('ledger');
  };

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'auditor', label: 'EOB & Bill Auditor', icon: FileSearch },
    { id: 'ledger', label: 'Family Split Ledger', icon: Scale },
    { id: 'vault', label: 'Tax & Medicaid Vault', icon: FolderArchive },
    { id: 'plan', label: 'Care Plan & Rules', icon: ShieldCheck },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8F7F4] text-[#1C2421]">
      {/* Persistent 256px Workspace Sidebar */}
      <aside className="no-print hidden w-64 shrink-0 flex-col justify-between border-r border-[#E5E2DC] bg-white lg:flex">
        <div>
          {/* Brand Wordmark */}
          <div className="border-b border-[#E5E2DC] px-6 py-5">
            <div className="text-lg font-bold tracking-tight text-[#1C2421] whitespace-nowrap">
              KindredCare
            </div>
            <div className="mt-0.5 text-xs text-[#5A6662]">
              {workspace.settings.careRecipient} · Care Hub
            </div>
          </div>

          {/* Primary Navigation */}
          <nav className="space-y-1 px-3 py-4" aria-label="Primary">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#EEF4F1] text-[#2D5A4C]'
                      : 'text-[#5A6662] hover:bg-[#F8F7F4] hover:text-[#1C2421]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Instant Sibling Role Switcher */}
        <div className="border-t border-[#E5E2DC] p-4">
          <div className="mb-2 text-[11px] font-semibold text-[#5A6662]">
            Switch Sibling Perspective
          </div>
          <div className="space-y-1.5">
            {workspace.members.map((member) => {
              const isCurrent = member.id === activeMember.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setActiveMemberId(member.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                    isCurrent
                      ? 'border-[#2D5A4C]/40 bg-[#EEF4F1]'
                      : 'border-transparent hover:bg-[#F8F7F4]'
                  }`}
                >
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    referrerPolicy="no-referrer"
                    className="h-7 w-7 shrink-0 rounded-full border border-[#E5E2DC] object-cover"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-[#1C2421]">{member.name}</div>
                    <div className="truncate text-[11px] text-[#5A6662]">
                      {member.roleLabel} · {member.splitPercentage}%
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar adhering to 3-zone contract */}
        <header className="no-print flex items-center justify-between gap-8 border-b border-[#E5E2DC] bg-white px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-[#5A6662] whitespace-nowrap">
            <span className="font-semibold text-[#1C2421] lg:hidden">KindredCare</span>
            <span className="lg:hidden" aria-hidden="true">/</span>
            <span className="hidden lg:inline">{workspace.settings.careRecipient} Family Care</span>
            <span className="hidden lg:inline" aria-hidden="true">/</span>
            <span className="font-medium text-[#1C2421]">{TAB_LABELS[activeTab]}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Mobile Sibling Switcher */}
            <select
              aria-label="Active sibling perspective"
              value={activeMember.id}
              onChange={(e) => setActiveMemberId(e.target.value)}
              className="rounded-lg border border-[#E5E2DC] bg-white px-2.5 py-1.5 text-xs text-[#1C2421] lg:hidden"
            >
              {workspace.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.splitPercentage}%)
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleOpenCapture(activeTab === 'ledger' ? 'receipt' : 'bill')}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[#2D5A4C] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#23473C]"
            >
              <Plus className="h-3.5 w-3.5" />
              Scan Bill or Receipt
            </button>
          </div>
        </header>

        {/* Mobile Navigation Strip */}
        <div className="no-print flex overflow-x-auto border-b border-[#E5E2DC] bg-white px-4 py-2 lg:hidden">
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ${
                  activeTab === item.id
                    ? 'bg-[#EEF4F1] text-[#2D5A4C]'
                    : 'text-[#5A6662]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Viewport Container */}
        <main className="mx-auto w-full max-w-7xl flex-1 p-6 lg:p-8">
          {activeTab === 'overview' && (
            <OverviewView
              workspace={workspace}
              activeMember={activeMember}
              onNavigate={(tab) => setActiveTab(tab)}
              onSelectClaim={(claim) => setSelectedClaimId(claim.id)}
              onOpenCapture={(mode) => handleOpenCapture(mode)}
            />
          )}

          {activeTab === 'auditor' && (
            <EobAuditorView
              claims={workspace.claims}
              selectedClaimId={selectedClaimId}
              activeMember={activeMember}
              onSelectClaimId={(id) => setSelectedClaimId(id)}
              onOpenAuditModal={() => handleOpenCapture('bill')}
              onRefreshWorkspace={fetchWorkspace}
            />
          )}

          {activeTab === 'ledger' && (
            <SplitLedgerView
              workspace={workspace}
              activeMember={activeMember}
              onOpenReceiptModal={() => handleOpenCapture('receipt')}
              onRefreshWorkspace={fetchWorkspace}
            />
          )}

          {activeTab === 'vault' && (
            <TaxMedicaidVaultView
              workspace={workspace}
              onRefreshWorkspace={fetchWorkspace}
            />
          )}

          {activeTab === 'plan' && (
            <CarePlanView
              workspace={workspace}
              onRefreshWorkspace={fetchWorkspace}
            />
          )}
        </main>
      </div>

      {/* Unified Multimodal AI Capture & Entry Modal */}
      <CaptureModal
        isOpen={captureOpen}
        initialTab={captureInitialTab}
        members={workspace.members}
        activeMemberId={activeMember.id}
        onClose={() => setCaptureOpen(false)}
        onClaimAudited={handleClaimAudited}
        onExpenseCreated={handleExpenseCreated}
        onRefreshWorkspace={fetchWorkspace}
      />
    </div>
  );
}
