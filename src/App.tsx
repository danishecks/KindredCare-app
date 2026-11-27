import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  FileSearch,
  FolderArchive,
  LayoutDashboard,
  Loader2,
  LogOut,
  Plus,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { AuthView } from './components/AuthView';
import { CaptureModal } from './components/CaptureModal';
import { CarePlanView } from './components/CarePlanView';
import { EobAuditorView } from './components/EobAuditorView';
import { OverviewView } from './components/OverviewView';
import { SplitLedgerView } from './components/SplitLedgerView';
import { TaxMedicaidVaultView } from './components/TaxMedicaidVaultView';
import { WebsiteLandingView, type WorkspaceEntryTab } from './components/WebsiteLandingView';
import type { AuthSessionResponse, AuthUser, MedicalClaim, WorkspaceSnapshot } from './types';
import { apiFetch, setAuthToken, setUnauthorizedHandler } from './utils/authClient';

type ActiveTab = WorkspaceEntryTab;
type ViewMode = 'website' | 'signin' | 'workspace';

const TAB_LABELS: Record<ActiveTab, string> = {
  overview: 'Overview',
  auditor: 'EOB & Bill Auditor',
  ledger: 'Family Split Ledger',
  vault: 'Tax & Medicaid Vault',
  plan: 'Care Plan & Compliance',
};

function parseRouteFromHash(): { mode: ViewMode; tab: ActiveTab } {
  const hash = window.location.hash;
  if (hash.startsWith('#/signin')) {
    return { mode: 'signin', tab: 'overview' };
  }
  if (!hash.startsWith('#/workspace')) {
    return { mode: 'website', tab: 'overview' };
  }
  const suffix = hash.replace('#/workspace', '').replace(/^\//, '');
  if (suffix === 'auditor' || suffix === 'ledger' || suffix === 'vault' || suffix === 'plan') {
    return { mode: 'workspace', tab: suffix };
  }
  return { mode: 'workspace', tab: 'overview' };
}

export default function App() {
  const initialRoute = parseRouteFromHash();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'register'>('signin');
  const [authNotice, setAuthNotice] = useState<string | null>(
    initialRoute.mode === 'workspace' ? 'Please sign in to access your family care workspace.' : null
  );
  const [pendingWorkspaceTab, setPendingWorkspaceTab] = useState<ActiveTab>(
    initialRoute.mode === 'workspace' ? initialRoute.tab : 'overview'
  );

  const [viewMode, setViewMode] = useState<ViewMode>(
    initialRoute.mode === 'workspace' ? 'signin' : initialRoute.mode
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialRoute.tab);

  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string>('maya');
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureInitialTab, setCaptureInitialTab] = useState<'bill' | 'receipt' | 'manual'>('bill');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchWorkspace = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/workspace');
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
    setUnauthorizedHandler(() => {
      setAuthToken(null);
      setAuthUser(null);
      setWorkspace(null);
      setAuthNotice('Your session expired or was signed out. Please sign in again.');
      if (window.location.hash !== '#/signin') {
        window.location.hash = '#/signin';
      }
      setViewMode('signin');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (authUser) {
      void fetchWorkspace();
    }
  }, [authUser, fetchWorkspace]);

  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseRouteFromHash();
      if (parsed.mode === 'workspace' && !authUser) {
        setPendingWorkspaceTab(parsed.tab);
        setAuthNotice('Please sign in to access your family care workspace.');
        setViewMode('signin');
        return;
      }
      setViewMode(parsed.mode);
      setActiveTab(parsed.tab);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [authUser]);

  const navigateToWebsite = () => {
    window.location.hash = '#/';
    setViewMode('website');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToSignIn = (mode: 'signin' | 'register' = 'signin', notice: string | null = null) => {
    setAuthInitialMode(mode);
    setAuthNotice(notice);
    if (window.location.hash !== '#/signin') {
      window.location.hash = '#/signin';
    }
    setViewMode('signin');
    window.scrollTo({ top: 0 });
  };

  const navigateToWorkspace = (tab: ActiveTab = 'overview') => {
    if (!authUser) {
      setPendingWorkspaceTab(tab);
      navigateToSignIn('signin', 'Sign in or use a demo sibling profile to open the workspace.');
      return;
    }
    const targetHash = tab === 'overview' ? '#/workspace' : `#/workspace/${tab}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    setActiveTab(tab);
    setViewMode('workspace');
    window.scrollTo({ top: 0 });
  };

  const handleAuthenticated = (session: AuthSessionResponse) => {
    setAuthToken(session.token);
    setAuthUser(session.user);
    setAuthNotice(null);
    setLoadError(null);
    if (session.user.memberId) {
      setActiveMemberId(session.user.memberId);
    }

    const destinationTab = pendingWorkspaceTab || 'overview';
    setPendingWorkspaceTab('overview');
    const targetHash = destinationTab === 'overview' ? '#/workspace' : `#/workspace/${destinationTab}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    setActiveTab(destinationTab);
    setViewMode('workspace');
    window.scrollTo({ top: 0 });
  };

  const handleSignOut = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors during logout cleanup
    } finally {
      setAuthToken(null);
      setAuthUser(null);
      setWorkspace(null);
      setSelectedClaimId(null);
      setCaptureOpen(false);
      setAuthNotice(null);
      window.location.hash = '#/';
      setViewMode('website');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (viewMode === 'website') {
    return (
      <WebsiteLandingView
        authUser={authUser}
        onLaunchWorkspace={(tab) => navigateToWorkspace(tab ?? 'overview')}
        onOpenSignIn={(mode) => navigateToSignIn(mode ?? 'signin')}
        onSignOut={() => void handleSignOut()}
      />
    );
  }

  if (viewMode === 'signin' || !authUser) {
    return (
      <AuthView
        initialMode={authInitialMode}
        noticeMessage={authNotice}
        onAuthenticated={handleAuthenticated}
        onBackToWebsite={navigateToWebsite}
      />
    );
  }

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
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={navigateToWebsite}
              className="rounded-lg border border-[#E5E2DC] px-4 py-2 text-xs font-medium text-[#1C2421] hover:bg-[#F1EFEA]"
            >
              Back to Website
            </button>
            <button
              type="button"
              onClick={() => void fetchWorkspace()}
              className="rounded-lg bg-[#2D5A4C] px-4 py-2 text-xs font-medium text-white hover:bg-[#23473C]"
            >
              Retry Connection
            </button>
          </div>
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
    navigateToWorkspace('auditor');
  };

  const handleExpenseCreated = () => {
    navigateToWorkspace('ledger');
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
            <button
              type="button"
              onClick={navigateToWebsite}
              className="text-left text-lg font-bold tracking-tight text-[#1C2421] whitespace-nowrap hover:text-[#2D5A4C]"
            >
              KindredCare
            </button>
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
                  onClick={() => navigateToWorkspace(item.id)}
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

          <div className="px-3 pt-1">
            <button
              type="button"
              onClick={navigateToWebsite}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#5A6662] transition-colors hover:bg-[#F8F7F4] hover:text-[#1C2421]"
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
              <span>Back to Website</span>
            </button>
          </div>
        </div>

        {/* Bottom Switcher + Account Session */}
        <div className="border-t border-[#E5E2DC]">
          <div className="p-4">
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

          {/* Signed-In Account & Sign Out */}
          <div className="border-t border-[#E5E2DC] bg-[#F8F7F4] px-4 py-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-[#1C2421]">{authUser.name}</div>
                <div className="truncate text-[11px] text-[#5A6662]">{authUser.email}</div>
              </div>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                aria-label="Sign Out"
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#E5E2DC] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#1C2421] transition-colors hover:bg-[#F1EFEA]"
              >
                <LogOut className="h-3 w-3 text-[#5A6662]" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar adhering to 3-zone contract */}
        <header className="no-print flex items-center justify-between gap-6 border-b border-[#E5E2DC] bg-white px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-[#5A6662] whitespace-nowrap">
            <button
              type="button"
              onClick={navigateToWebsite}
              className="font-semibold text-[#1C2421] hover:text-[#2D5A4C] lg:hidden"
            >
              KindredCare
            </button>
            <span className="lg:hidden" aria-hidden="true">/</span>
            <span className="hidden lg:inline">{workspace.settings.careRecipient} Family Care</span>
            <span className="hidden lg:inline" aria-hidden="true">/</span>
            <span className="font-medium text-[#1C2421]">{TAB_LABELS[activeTab]}</span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
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

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[#E5E2DC] bg-white px-3 py-2 text-xs font-medium text-[#1C2421] transition-colors hover:bg-[#F1EFEA]"
            >
              <LogOut className="h-3.5 w-3.5 text-[#5A6662]" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Mobile Navigation Strip */}
        <div className="no-print flex overflow-x-auto border-b border-[#E5E2DC] bg-white px-4 py-2 lg:hidden">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={navigateToWebsite}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-[#5A6662]"
            >
              ← Website
            </button>
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateToWorkspace(item.id)}
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
              onNavigate={(tab) => navigateToWorkspace(tab)}
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
