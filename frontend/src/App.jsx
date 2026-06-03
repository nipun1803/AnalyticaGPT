/**
 * InsightForge AI — Main Application (v2)
 * Auth-gated, sidebar navigation, Sonner toasts.
 */

import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { useAuth } from './context/useAuth';
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
import { getUploadStatus } from './services/api';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activePage = location.pathname.substring(1) || 'upload';

  const [datasetInfo, setDatasetInfo] = useState(() => {
    const saved = localStorage.getItem('insightforge_dataset');
    return saved ? JSON.parse(saved) : null;
  });
  const [summaryData, setSummaryData] = useState(() => {
    const saved = localStorage.getItem('insightforge_summary');
    return saved ? JSON.parse(saved) : null;
  });
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

  // Sync to localStorage
  useEffect(() => {
    if (datasetInfo) {
      localStorage.setItem('insightforge_dataset', JSON.stringify(datasetInfo));
    } else {
      localStorage.removeItem('insightforge_dataset');
    }
  }, [datasetInfo]);

  useEffect(() => {
    if (summaryData) {
      localStorage.setItem('insightforge_summary', JSON.stringify(summaryData));
    } else {
      localStorage.removeItem('insightforge_summary');
    }
  }, [summaryData]);

  // Restore session on mount
  useEffect(() => {
    if (user) {
      getUploadStatus()
        .then((status) => {
          if (status) {
            setDatasetInfo(status);
            // Only redirect if they don't have a dataset loaded AND are on upload page
            if (!datasetInfo && (location.pathname === '/' || location.pathname === '/upload')) {
              navigate('/dashboard', { replace: true });
            }
          } else {
            setDatasetInfo(null);
            setSummaryData(null);
          }
        })
        .catch(() => {});
    }
  }, [user, navigate, location.pathname]);

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
    navigate('/dashboard');
  };

  const handleDatasetActivated = (info) => {
    setDatasetInfo(info);
    setSummaryData(null);
    if (info) navigate('/dashboard');
  };

  const handleDatasetUpdated = (updatedInfo) => {
    // Merge updated dataset info (from clean/engineer operations) into top-level state
    // This triggers re-renders in DataPreview, Dashboard, etc.
    setDatasetInfo((prev) => ({
      ...prev,
      rows: updatedInfo.rows,
      columns: updatedInfo.columns,
      column_types: updatedInfo.column_types || prev?.column_types,
      missing_values: updatedInfo.missing_values || prev?.missing_values,
      preview: updatedInfo.preview || prev?.preview,
    }));
    // Invalidate cached summary data since the dataset changed
    setSummaryData(null);
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
        <PublicPin pinId={pinId} onBack={() => navigate('/')} />
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

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      <Toaster theme="dark" position="top-right" richColors closeButton />
      <Sidebar
        activePage={activePage}
        onNavigate={(page) => { navigate(`/${page}`); setMobileMenuOpen(false); }}
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
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <Routes location={location}>
                  <Route path="/" element={<Navigate to="/upload" replace />} />
                  <Route path="/dashboard" element={<Dashboard datasetInfo={datasetInfo} summaryData={summaryData} setSummaryData={setSummaryData} />} />
                  <Route path="/upload" element={<FileUpload onSuccess={handleUploadSuccess} />} />
                  <Route path="/preview" element={<DataPreview datasetInfo={datasetInfo} />} />
                  <Route path="/charts" element={<Charts summaryData={summaryData} setSummaryData={setSummaryData} />} />
                  <Route path="/ml" element={<MLPanel datasetInfo={datasetInfo} />} />
                  <Route path="/insights" element={<InsightsPanel />} />
                  <Route path="/cleaning" element={<DataCleaning datasetInfo={datasetInfo} onDatasetUpdated={handleDatasetUpdated} />} />
                  <Route path="/eda" element={<EDAPanel />} />
                  <Route path="/chat" element={<ChatBox />} />
                  <Route path="/report" element={<ReportPanel />} />
                  <Route path="/pins" element={<Pins />} />
                  <Route path="*" element={<Navigate to="/upload" replace />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
