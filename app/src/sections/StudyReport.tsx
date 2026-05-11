import { useState } from 'react';
import { useStore } from '@/store';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Clock, Target, Award, BookOpen,
  Flame, Zap, Star, Calendar, Calculator,
  Atom
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const trendData = [
  { date: '5/6', score: 72, time: 30 },
  { date: '5/7', score: 75, time: 45 },
  { date: '5/8', score: 78, time: 60 },
  { date: '5/9', score: 82, time: 40 },
  { date: '5/10', score: 80, time: 55 },
  { date: '5/11', score: 85, time: 50 },
  { date: '5/12', score: 88, time: 45 },
];

const radarData = [
  { subject: '数学', mastery: 75 },
  { subject: '英语', mastery: 82 },
  { subject: '语文', mastery: 70 },
  { subject: '物理', mastery: 55 },
  { subject: '化学', mastery: 45 },
];

const weeklyData = [
  { day: '周一', minutes: 45 },
  { day: '周二', minutes: 60 },
  { day: '周三', minutes: 30 },
  { day: '周四', minutes: 75 },
  { day: '周五', minutes: 50 },
  { day: '周六', minutes: 90 },
  { day: '周日', minutes: 45 },
];

type Period = 'day' | 'week' | 'month';

export function StudyReport() {
  const [period, setPeriod] = useState<Period>('week');
  const { setCurrentPage } = useStore();

  const stats = {
    day: { time: 45, questions: 28, correct: 85, conversations: 3, exams: 1, avgScore: 85 },
    week: { time: 395, questions: 186, correct: 82, conversations: 15, exams: 4, avgScore: 82 },
    month: { time: 1580, questions: 720, correct: 79, conversations: 52, exams: 12, avgScore: 80 },
  }[period];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center py-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 flex items-center justify-center gap-2">
          <BarChart3 className="w-6 h-6 text-amber-500" />
          学情报告
        </h2>
        <p className="text-slate-500 dark:text-slate-400">全面分析学习数据 · 精准定位薄弱环节 · 科学制定提升计划</p>
      </div>

      {/* Period Selector */}
      <div className="flex justify-center gap-2">
        {([
          { id: 'day' as Period, label: '今日' },
          { id: 'week' as Period, label: '本周' },
          { id: 'month' as Period, label: '本月' },
        ]).map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
              period === p.id
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '学习时长', value: `${stats.time}`, unit: '分钟', icon: Clock, color: 'bg-blue-500', change: '+12%' },
          { label: '答题数', value: `${stats.questions}`, unit: '道', icon: Target, color: 'bg-orange-500', change: '+8%' },
          { label: '正确率', value: `${stats.correct}`, unit: '%', icon: Award, color: 'bg-green-500', change: '+5%' },
          { label: '平均得分', value: `${stats.avgScore}`, unit: '分', icon: Star, color: 'bg-violet-500', change: '+10%' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">{stat.change}</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}<span className="text-sm font-normal text-slate-500">{stat.unit}</span></p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
        >
          <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            成绩趋势
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis domain={[60, 100]} stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={3} dot={{ fill: '#4F46E5', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Subject Radar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
        >
          <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-violet-500" />
            学科能力分布
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#64748b' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Radar name="掌握度" dataKey="mastery" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Weekly Study Time */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
      >
        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-500" />
          本周学习时长
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                formatter={(value: number) => [`${value} 分钟`, '学习时长']}
              />
              <Bar dataKey="minutes" fill="#4F46E5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Knowledge Gaps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
      >
        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-red-500" />
          薄弱知识点
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { subject: '数学', topic: '韦达定理', mastery: 40, color: 'bg-red-500' },
            { subject: '物理', topic: '串联电路', mastery: 30, color: 'bg-red-500' },
            { subject: '化学', topic: '中和反应', mastery: 40, color: 'bg-red-500' },
            { subject: '数学', topic: '根的判别式', mastery: 45, color: 'bg-amber-500' },
          ].map((gap, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{gap.topic}</span>
                  <span className="text-xs text-slate-500">{gap.subject}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${gap.mastery}%` }}
                    transition={{ duration: 1 }}
                    className={`h-full rounded-full ${gap.color}`}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">掌握度 {gap.mastery}% · 建议加强练习</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage('exam')}
                className="rounded-lg text-xs flex-shrink-0"
              >
                练习
              </Button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Study Plan */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 p-6 text-white"
      >
        <div className="flex items-center gap-3 mb-4">
          <Flame className="w-6 h-6 text-amber-300" />
          <h3 className="font-bold text-lg">明日学习计划</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { subject: '数学', task: '练习韦达定理相关题目 10 道', duration: '30分钟', icon: Calculator },
            { subject: '英语', task: '口语练习 - 日常对话', duration: '20分钟', icon: BookOpen },
            { subject: '物理', task: '学习欧姆定律课程', duration: '25分钟', icon: Atom },
          ].map((plan, i) => {
            const Icon = plan.icon;
            return (
              <div key={i} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-violet-200" />
                  <span className="text-sm font-medium">{plan.subject}</span>
                </div>
                <p className="text-sm text-violet-100 mb-1">{plan.task}</p>
                <p className="text-xs text-violet-200">{plan.duration}</p>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
