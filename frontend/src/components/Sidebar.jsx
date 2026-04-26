import { LayoutDashboard, Upload, Table2, BarChart3, BrainCircuit, Lightbulb, MessageSquareText, FileText, LogOut, ChevronLeft, ChevronRight, Zap, Eraser, LayoutGrid, X, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

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
];

export default function Sidebar({ activePage, onNavigate, datasetLoaded, collapsed, setCollapsed, mobileMenuOpen, setMobileMenuOpen, theme, toggleTheme }) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-zinc-950/50 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/90 backdrop-blur-xl transition-transform duration-300",
        collapsed ? "w-[68px]" : "w-64",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
      {/* Logo */}
      <div className={cn("flex items-center justify-between px-4 py-5 border-b border-zinc-200 dark:border-zinc-800", collapsed && "justify-center")}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center shrink-0 shadow-lg shadow-orange-600/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold gradient-text leading-tight">InsightForge</h1>
              <p className="text-[10px] text-zinc-600 tracking-wider uppercase">AI Analytics</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-1 text-zinc-500">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = activePage === key;
          const disabled = key !== 'upload' && !datasetLoaded;

          return (
            <button
              key={key}
              onClick={() => !disabled && onNavigate(key)}
              disabled={disabled}
              title={collapsed ? label : undefined}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                active
                  ? "bg-orange-600/15 text-orange-300 border border-orange-600/20"
                  : disabled
                    ? "text-zinc-700 cursor-not-allowed"
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-800 dark:text-zinc-200"
              )}
            >
              <Icon className={cn("w-[18px] h-[18px] shrink-0 transition-transform", active && "text-orange-400", !active && !disabled && "group-hover:scale-110")} />
              {!collapsed && <span>{label}</span>}
              {!collapsed && active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500" />}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 p-3">
        {user && !collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {(user.username || user.email)[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-200 truncate">{user.username}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button onClick={logout} title="Sign out"
            className={cn("flex items-center gap-2 rounded-lg text-xs text-zinc-500 hover:text-red-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all", collapsed ? "p-2 mx-auto" : "px-3 py-2 flex-1")}>
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Sign out</span>}
          </button>
          <button onClick={toggleTheme} title="Toggle theme"
            className="p-2 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 transition-all hidden lg:flex">
            {theme === 'dark' ? <Sun className="w-4 h-4 text-orange-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>
          <button onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Expand" : "Collapse"}
            className="p-2 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 transition-all hidden lg:flex">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
