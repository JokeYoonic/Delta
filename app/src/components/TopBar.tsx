import { useStore } from '@/store';
import { motion } from 'framer-motion';
import {
  Search, Bell, Flame, Coins, Sun, Moon
} from 'lucide-react';
import { useState } from 'react';

export function TopBar() {
  const { theme, toggleTheme, user } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const currentPage = useStore.getState().currentPage;

  const getPageTitle = (page: string): string => {
    const titles: Record<string, string> = {
      dashboard: '学习主页',
      chat: 'AI智能答疑',
      classroom: 'AI课堂',
      exam: '考试中心',
      speaking: '口语训练室',
      knowledge: '知识图谱',
      report: '学情报告',
      parent: '家长监管',
      profile: '个人中心',
    };
    return titles[page] || '智学伴AI家教';
  };

  return (
    <header className="h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
      {/* Left: Title & Search */}
      <div className="flex items-center gap-4 flex-1">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-white hidden lg:block">
          {getPageTitle(currentPage)}
        </h1>
        <motion.div
          className="relative"
          animate={{ width: searchOpen ? 320 : 40 }}
          transition={{ duration: 0.3 }}
        >
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <Search className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute left-12 top-0 w-64"
            >
              <input
                type="text"
                placeholder="搜索知识点、题目、教材..."
                autoFocus
                className="w-full h-10 px-4 rounded-xl bg-slate-100 dark:bg-slate-700 border-0 focus:ring-2 focus:ring-violet-500 text-sm dark:text-white placeholder:text-slate-400"
              />
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Right: Stats & Actions */}
      <div className="flex items-center gap-2">
        {/* Points */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20">
          <Coins className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">{user?.points}</span>
        </div>

        {/* Streak */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-900/20">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">{user?.streakDays}天</span>
        </div>

        {/* Notifications */}
        <button className="relative w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
          <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 text-slate-600" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>
      </div>
    </header>
  );
}
