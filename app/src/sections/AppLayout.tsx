import { useStore } from '@/store';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { motion, AnimatePresence } from 'framer-motion';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const theme = useStore((s) => s.theme);
  const isSuperAdmin = useStore((s) => s.isSuperAdmin);

  return (
    <div className={`flex h-screen w-screen overflow-hidden transition-colors ${theme === 'dark' ? 'dark bg-slate-900' : 'bg-slate-50'}`}>
      <Sidebar />
      <div className={`flex flex-col flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <TopBar />
        {isSuperAdmin && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center py-1 text-sm font-medium" data-testid="admin-badge">
            👑 77号超级管理员模式 — 全权限已激活
          </div>
        )}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={useStore((s) => s.currentPage)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
