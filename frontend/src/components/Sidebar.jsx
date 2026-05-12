import { LayoutDashboard, Upload, Table2, BarChart3, BrainCircuit, Lightbulb, MessageSquareText, FileText, LogOut, ChevronLeft, ChevronRight, Zap, Eraser, LayoutGrid, X, Moon, Sun, Link as LinkIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { cn } from '../lib/utils';
import DatasetSwitcher from './DatasetSwitcher';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'upload', label: 'Upload Data', icon: Upload },
  { key: 'cleaning', label: 'Data Cleaning', icon: Eraser },
  { key: 'preview', label: 'Data Preview', icon: Table2 },
  { key: 'eda', label: 'EDA Panel', icon: LayoutGrid },
  { key: 'charts', label: 'Visualizations', icon: BarChart3 },
  { key: 'ml', label: 'ML Engine', icon: BrainCircuit },
  { key: 'insights', label: 'AI Insights', icon: Lightbulb },
  { key: 'chat', label: 'RAG Chat', icon: MessageSquareText },
  { key: 'report', label: 'Reports', icon: FileText },
  { key: 'pins', label: 'Pins', icon: LinkIcon },
];

export default function Sidebar({ onNavigate, datasetLoaded, collapsed, setCollapsed, mobileMenuOpen, setMobileMenuOpen, theme, toggleTheme, onDatasetActivated }) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 flex flex-col border-r border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur-xl transition-transform duration-300",
        collapsed ? "w-[68px]" : "w-64",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
      {/* Logo */}
      <div className={cn("flex items-center justify-between px-4 py-5 border-b border-[var(--color-border)]", collapsed && "justify-center")}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary), var(--color-accent))' }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold gradient-text leading-tight">InsightForge</h1>
              <p className="text-[10px] text-[var(--color-muted-foreground)] tracking-wider uppercase">AI Analytics</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-1 text-[var(--color-muted-foreground)]">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <DatasetSwitcher collapsed={collapsed} datasetLoaded={datasetLoaded} onActivated={onDatasetActivated} />

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const disabled = key !== 'upload' && !datasetLoaded;

          return (
            <NavLink
              key={key}
              to={`/${key}`}
              onClick={(e) => {
                if (disabled) e.preventDefault();
                else onNavigate(key);
              }}
              title={collapsed ? label : undefined}
              className={({ isActive }) => cn(
                "w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                isActive
                  ? "bg-[color:var(--color-primary)]/12 text-[color:var(--color-primary)] border border-[color:var(--color-primary)]/20"
                  : disabled
                    ? "text-[var(--color-muted-foreground)] cursor-not-allowed opacity-60 pointer-events-none"
                    : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn("w-[18px] h-[18px] shrink-0 transition-transform", isActive && "text-[color:var(--color-primary)]", !isActive && !disabled && "group-hover:scale-110")} />
                  {!collapsed && <span>{label}</span>}
                  {!collapsed && isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[color:var(--color-accent)]" />}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-[var(--color-border)] p-3">
        {user && !collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}>
              {(user.username || user.email)[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--color-foreground)] truncate">{user.username}</p>
              <p className="text-[10px] text-[var(--color-muted-foreground)] truncate">{user.email}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button onClick={logout} title="Sign out"
            className={cn("flex items-center gap-2 rounded-lg text-xs text-[var(--color-muted-foreground)] hover:text-[color:var(--color-danger)] hover:bg-[var(--color-muted)] transition-all", collapsed ? "p-2 mx-auto" : "px-3 py-2 flex-1")}>
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Sign out</span>}
          </button>
          <button onClick={toggleTheme} title="Toggle theme"
            className="p-2 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-all hidden lg:flex">
            {theme === 'dark' ? <Sun className="w-4 h-4 text-[color:var(--color-accent)]" /> : <Moon className="w-4 h-4 text-[color:var(--color-primary)]" />}
          </button>
          <button onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Expand" : "Collapse"}
            className="p-2 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-all hidden lg:flex">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
