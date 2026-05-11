import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Clock, Target, TrendingUp, AlertCircle, CheckCircle,
  Mic2, Calendar,
  Shield, Bell, BarChart3
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const weeklyTrend = [
  { day: '周一', minutes: 45 },
  { day: '周二', minutes: 60 },
  { day: '周三', minutes: 30 },
  { day: '周四', minutes: 75 },
  { day: '周五', minutes: 50 },
  { day: '周六', minutes: 90 },
  { day: '周日', minutes: 45 },
];

const alerts = [
  { type: 'warning' as const, message: '数学韦达定理掌握度低于50%，建议加强练习', time: '2小时前' },
  { type: 'success' as const, message: '英语口语练习连续5天达标', time: '昨天' },
  { type: 'info' as const, message: '本周学习时长395分钟，较上周增加12%', time: '昨天' },
  { type: 'warning' as const, message: '物理欧姆定律课程未完成', time: '3天前' },
];

const studyPlan = [
  { id: '1', title: '完成一元二次方程练习题', subject: '数学', deadline: '2026-05-13', completed: false, priority: 'high' as const },
  { id: '2', title: '背诵Unit 2单词', subject: '英语', deadline: '2026-05-13', completed: true, priority: 'medium' as const },
  { id: '3', title: '物理实验报告', subject: '物理', deadline: '2026-05-14', completed: false, priority: 'high' as const },
  { id: '4', title: '古诗词默写', subject: '语文', deadline: '2026-05-15', completed: false, priority: 'medium' as const },
];

export function ParentDashboard() {
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(true);
  const [restReminder, setRestReminder] = useState(true);
  const [contentFilter, setContentFilter] = useState(true);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center py-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 flex items-center justify-center gap-2">
          <Users className="w-6 h-6 text-teal-500" />
          家长监管中心
        </h2>
        <p className="text-slate-500 dark:text-slate-400">实时掌握学习动态 · 科学管控使用时间 · 共同成长</p>
      </div>

      {/* Child Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-600 p-6 text-white"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-2xl font-bold">张</span>
            </div>
            <div>
              <h3 className="text-xl font-bold">张小明</h3>
              <p className="text-teal-100">实验中学 · 九年级 · 连续学习7天</p>
            </div>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">45<span className="text-sm">分钟</span></p>
              <p className="text-xs text-teal-100">今日学习</p>
            </div>
            <div>
              <p className="text-2xl font-bold">28<span className="text-sm">道</span></p>
              <p className="text-xs text-teal-100">今日答题</p>
            </div>
            <div>
              <p className="text-2xl font-bold">85<span className="text-sm">%</span></p>
              <p className="text-xs text-teal-100">正确率</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Weekly Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
        >
          <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            本周学习趋势
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="minutes" fill="#0D9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Right: Today's Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              今日活动
            </h3>
            <div className="space-y-3">
              {[
                { icon: Target, label: 'AI答疑', count: 3, time: '15分钟', color: 'text-violet-500' },
                { icon: Target, label: '做题练习', count: 28, time: '20分钟', color: 'text-orange-500' },
                { icon: Mic2, label: '口语训练', count: 1, time: '10分钟', color: 'text-pink-500' },
              ].map((activity, i) => {
                const Icon = activity.icon;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-700">
                      <Icon className={`w-5 h-5 ${activity.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{activity.label}</p>
                      <p className="text-xs text-slate-500">{activity.count}次 · {activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
        >
          <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-500" />
            学习提醒
          </h3>
          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-xl ${
                  alert.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' :
                  alert.type === 'success' ? 'bg-green-50 dark:bg-green-900/20' :
                  'bg-blue-50 dark:bg-blue-900/20'
                }`}
              >
                {alert.type === 'warning' ? <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" /> :
                 alert.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" /> :
                 <TrendingUp className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <p className="text-sm text-slate-700 dark:text-slate-200">{alert.message}</p>
                  <p className="text-xs text-slate-400 mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Study Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
        >
          <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            学习任务
          </h3>
          <div className="space-y-3">
            {studyPlan.map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  task.completed ? 'bg-green-50 dark:bg-green-900/20' : 'bg-slate-50 dark:bg-slate-700/30'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  task.completed ? 'border-green-500 bg-green-500' : 'border-slate-300'
                }`}>
                  {task.completed && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${task.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{task.subject}</Badge>
                    <span className="text-xs text-slate-400">截止 {task.deadline}</span>
                  </div>
                </div>
                <Badge className={`${
                  task.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {task.priority === 'high' ? '高' : '中'}
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
      >
        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-violet-500" />
          管控设置
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
            <div>
              <p className="font-medium text-slate-800 dark:text-white text-sm">每日使用时长限制</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">超过限制后将提醒休息</p>
            </div>
            <Switch checked={timeLimitEnabled} onCheckedChange={setTimeLimitEnabled} />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
            <div>
              <p className="font-medium text-slate-800 dark:text-white text-sm">40分钟休息提醒</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">保护视力，科学用眼</p>
            </div>
            <Switch checked={restReminder} onCheckedChange={setRestReminder} />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
            <div>
              <p className="font-medium text-slate-800 dark:text-white text-sm">内容安全过滤</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">屏蔽不良信息</p>
            </div>
            <Switch checked={contentFilter} onCheckedChange={setContentFilter} />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
            <div>
              <p className="font-medium text-slate-800 dark:text-white text-sm">夜间模式限制</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">22:00-6:00限制使用</p>
            </div>
            <Switch checked={true} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
