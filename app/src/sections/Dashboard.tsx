import { useStore } from '@/store';
import { motion } from 'framer-motion';
import {
  MessageSquare, ClipboardCheck, Mic2, BookOpen, Clock,
  TrendingUp, Target, Award, Zap, ChevronRight, Play, Star,
  Calculator, Atom, FlaskConical, Scroll
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const quickActions = [
  { id: 'chat', label: 'AI答疑', icon: MessageSquare, color: 'bg-violet-500', desc: '随时提问，即时解答' },
  { id: 'exam', label: '智能组卷', icon: ClipboardCheck, color: 'bg-orange-500', desc: '针对性练习，高效提分' },
  { id: 'speaking', label: '口语练习', icon: Mic2, color: 'bg-pink-500', desc: 'AI纠音，敢说会说' },
  { id: 'classroom', label: 'AI课堂', icon: BookOpen, color: 'bg-emerald-500', desc: '结构化学习，循序渐进' },
];

const subjectIcons: Record<string, React.ElementType> = {
  math: Calculator,
  english: BookOpen,
  chinese: Scroll,
  physics: Atom,
  chemistry: FlaskConical,
};

const recentActivities = [
  { type: 'chat', subject: '数学', content: '解答了一元二次方程应用题', time: '10分钟前', icon: MessageSquare },
  { type: 'exam', subject: '英语', content: '完成Unit 1单元测试，得分85', time: '1小时前', icon: ClipboardCheck },
  { type: 'speaking', subject: '英语', content: '口语练习15分钟，发音评分82', time: '2小时前', icon: Mic2 },
  { type: 'classroom', subject: '物理', content: '学习欧姆定律课程', time: '昨天', icon: BookOpen },
];

export function Dashboard() {
  const { setCurrentPage, subjects, user } = useStore();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 p-6 lg:p-8 text-white"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-amber-300" />
            <span className="text-sm font-medium text-violet-100">连续学习 {user?.streakDays} 天</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold mb-2">欢迎回来，{user?.name}！</h2>
          <p className="text-violet-100 mb-4 max-w-xl">今天也要坚持学习哦~ 你的数学一元二次方程进度已达65%，继续加油！</p>
          <div className="flex gap-3">
            <Button
              onClick={() => setCurrentPage('chat')}
              className="bg-white text-violet-700 hover:bg-violet-50 rounded-xl px-6"
            >
              <Play className="w-4 h-4 mr-2" />
              继续学习
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentPage('exam')}
              className="border-white/30 text-white hover:bg-white/10 rounded-xl px-6"
            >
              <Target className="w-4 h-4 mr-2" />
              做套题
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, i) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setCurrentPage(action.id)}
              className="group p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-violet-300 dark:hover:border-violet-700 transition-all text-left"
            >
              <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-white mb-1">{action.label}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{action.desc}</p>
            </motion.button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-violet-500" />
              学科进度
            </h3>
            <button onClick={() => setCurrentPage('knowledge')} className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1">
              查看全部 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            {subjects.map((subject) => {
              const Icon = subjectIcons[subject.id] || BookOpen;
              const avgProgress = subject.chapters.reduce((acc, ch) => acc + ch.progress, 0) / subject.chapters.length;
              return (
                <div key={subject.id} className="group cursor-pointer" onClick={() => setCurrentPage('knowledge')}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: subject.color + '15' }}>
                        <Icon className="w-5 h-5" style={{ color: subject.color }} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white text-sm">{subject.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{subject.chapters.length} 个章节</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: subject.color }}>{Math.round(avgProgress)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${avgProgress}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: subject.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Today's Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
          >
            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              今日学习
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-slate-800 dark:text-white">45<span className="text-xs font-normal text-slate-500">分钟</span></p>
                <p className="text-xs text-slate-500 dark:text-slate-400">学习时长</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <Target className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-slate-800 dark:text-white">28<span className="text-xs font-normal text-slate-500">道</span></p>
                <p className="text-xs text-slate-500 dark:text-slate-400">答题数</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <Award className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-slate-800 dark:text-white">85<span className="text-xs font-normal text-slate-500">%</span></p>
                <p className="text-xs text-slate-500 dark:text-slate-400">正确率</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <Star className="w-5 h-5 text-violet-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-slate-800 dark:text-white">+50<span className="text-xs font-normal text-slate-500">分</span></p>
                <p className="text-xs text-slate-500 dark:text-slate-400">获得积分</p>
              </div>
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
          >
            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              最近动态
            </h3>
            <div className="space-y-3">
              {recentActivities.map((activity, i) => {
                const Icon = activity.icon;
                return (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{activity.content}</p>
                      <p className="text-xs text-slate-400">{activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
