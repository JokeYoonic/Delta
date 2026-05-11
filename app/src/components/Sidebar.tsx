import { useStore } from '@/store';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, MessageSquare, GraduationCap, ClipboardCheck,
  Mic2, Network, BarChart3, Users, UserCircle, ChevronLeft, ChevronRight,
  Sparkles
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: '学习主页', icon: LayoutDashboard, color: 'text-blue-600' },
  { id: 'chat', label: 'AI答疑', icon: MessageSquare, color: 'text-violet-600' },
  { id: 'classroom', label: 'AI课堂', icon: GraduationCap, color: 'text-emerald-600' },
  { id: 'exam', label: '考试中心', icon: ClipboardCheck, color: 'text-orange-600' },
  { id: 'speaking', label: '口语训练', icon: Mic2, color: 'text-pink-600' },
  { id: 'knowledge', label: '知识图谱', icon: Network, color: 'text-cyan-600' },
  { id: 'report', label: '学情报告', icon: BarChart3, color: 'text-amber-600' },
  { id: 'parent', label: '家长监管', icon: Users, color: 'text-teal-600' },
  { id: 'profile', label: '个人中心', icon: UserCircle, color: 'text-slate-600' },
];

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, currentPage, setCurrentPage, user } = useStore();

  return (
    <motion.aside
      className="fixed left-0 top-0 h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-50 flex flex-col shadow-sm"
      animate={{ width: sidebarOpen ? 256 : 64 }}
      transition={{ duration: 0.3 }}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-bold text-lg bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent truncate"
            >
              智学伴
            </motion.span>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="ml-auto p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? item.color : ''}`} />
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm font-medium truncate"
                >
                  {item.label}
                </motion.span>
              )}
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-violet-600 rounded-r-full"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Mini Profile */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{user?.name?.[0]}</span>
          </div>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="min-w-0"
            >
              <p className="text-sm font-medium truncate dark:text-white">{user?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user?.grade}</p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
