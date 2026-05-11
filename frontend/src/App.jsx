/**
 * InsightForge AI — Main Application (v2)
 * Auth-gated, sidebar navigation, Sonner toasts.
 */

import { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { useAuth } from './context/useAuth';
import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import FileUpload from './components/FileUpload';
import DataPreview from './pages/DataPreview';
import Charts from './pages/Charts';
import ChatBox from './components/ChatBox';
import MLPanel from './pages/MLPanel';
import InsightsPanel from './pages/InsightsPanel';
import ReportPanel from './pages/ReportPanel';
import DataCleaning from './pages/DataCleaning';
import EDAPanel from './pages/EDAPanel';
import Pins from './pages/Pins';
import PublicPin from './pages/PublicPin';
import { Loader2, Menu, Moon, Sun } from 'lucide-react';
import { useEffect } from 'react';
import { getUploadStatus } from './services/api';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [activePage, setActivePage] = useState('upload');
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  // Handle theme switching
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  // Restore session on mount
  useEffect(() => {
    if (user && !datasetInfo) {
      getUploadStatus()
        .then((status) => {
          if (status) {
            setDatasetInfo(status);
            // Optional: if status exists, jump to dashboard
            setActivePage('dashboard');
          }
        })
        .catch(() => {});
    }
  }, [user, datasetInfo]);

  // Minimal onboarding tour (first login only)
  useEffect(() => {
    if (!user) return;
    const done = localStorage.getItem("onboarding_done");
    if (done) return;
    localStorage.setItem("onboarding_done", "1");
    // Keep it lightweight: a couple of toasts as guidance
    setTimeout(() => toast.message("Start by uploading a CSV (or use the sample dataset)."), 500);
    setTimeout(() => toast.message("Then explore Dashboard → Charts → ML → Chat."), 2200);
  }, [user]);

  const handleUploadSuccess = (info) => {
    setDatasetInfo(info);
    setSummaryData(null);
    setActivePage('dashboard');
  };

  const handleDatasetActivated = (info) => {
    setDatasetInfo(info);
    setSummaryData(null);
    if (info) setActivePage('dashboard');
  };

  // Auth loading spinner
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <Loader2 className="w-8 h-8 text-[color:var(--color-primary)] animate-spin" />
      </div>
    );
  }

  const pinId = new URLSearchParams(window.location.search).get('pin');
  if (pinId) {
    return (
      <>
        <Toaster theme="dark" position="top-right" richColors closeButton />
        <PublicPin pinId={pinId} onBack={() => { window.history.pushState({}, '', '/'); window.location.reload(); }} />
      </>
    );
  }

  // Not authenticated — show auth page
  if (!user) {
    return (
      <>
        <Toaster theme="dark" position="top-right" richColors closeButton />
        <LandingPage />
      </>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard datasetInfo={datasetInfo} summaryData={summaryData} setSummaryData={setSummaryData} />;
      case 'upload': return <FileUpload onSuccess={handleUploadSuccess} />;
      case 'preview': return <DataPreview datasetInfo={datasetInfo} />;
      case 'charts': return <Charts summaryData={summaryData} setSummaryData={setSummaryData} />;
      case 'ml': return <MLPanel datasetInfo={datasetInfo} />;
      case 'insights': return <InsightsPanel />;
      case 'cleaning': return <DataCleaning onCleanSuccess={() => setDatasetInfo(prev => ({ ...prev }))} />;
      case 'eda': return <EDAPanel />;
      case 'chat': return <ChatBox />;
      case 'report': return <ReportPanel />;
      case 'pins': return <Pins />;
      default: return <FileUpload onSuccess={handleUploadSuccess} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      <Toaster theme="dark" position="top-right" richColors closeButton />
      <Sidebar
        activePage={activePage}
        onNavigate={(page) => { setActivePage(page); setMobileMenuOpen(false); }}
        datasetLoaded={!!datasetInfo}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        theme={theme}
        toggleTheme={toggleTheme}
        onDatasetActivated={handleDatasetActivated}
      />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold gradient-text leading-tight">InsightForge</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 text-[var(--color-muted-foreground)]">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 -mr-2 text-[var(--color-foreground)]">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderPage()}
          </div>
        </div>
      </main>
    </div>
  );
}
