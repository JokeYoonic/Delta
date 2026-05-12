import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Clock, Target, TrendingUp, AlertCircle, CheckCircle,
  Mic2, Calendar, Shield, Bell, BarChart3, Plus, Link, Send, MessageSquare, Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/api';

interface LinkedStudent {
  relation_id: string;
  student_id: string;
  name: string;
  grade: string;
  avatar: string;
  streak_days: number;
  relation_type: string;
  today_study_time: number;
  today_questions: number;
}

interface FamilyMessage {
  id: string;
  role: string;
  content: string;
  ai_summary: string;
  created_at: string;
}

export function ParentDashboard() {
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(true);
  const [restReminder, setRestReminder] = useState(true);
  const [contentFilter, setContentFilter] = useState(true);
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<LinkedStudent | null>(null);
  const [studentReport, setStudentReport] = useState<Record<string, unknown> | null>(null);
  const [familyMessages, setFamilyMessages] = useState<FamilyMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [linkEmail, setLinkEmail] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadStudents = useCallback(async () => {
    try {
      const data = await api.get<LinkedStudent[]>('/parent/students');
      setStudents(data);
      if (data.length > 0 && !selectedStudent) {
        setSelectedStudent(data[0]);
      }
    } catch {
      setStudents([]);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const loadStudentReport = useCallback(async () => {
    if (!selectedStudent) return;
    try {
      const data = await api.get<Record<string, unknown>>(`/parent/student/${selectedStudent.student_id}/report?days=7`);
      setStudentReport(data);
    } catch {
      setStudentReport(null);
    }
  }, [selectedStudent]);

  const loadFamilyChat = useCallback(async () => {
    if (!selectedStudent) return;
    try {
      const data = await api.get<FamilyMessage[]>(`/parent/family-chat/${selectedStudent.student_id}`);
      setFamilyMessages(data);
    } catch {
      setFamilyMessages([]);
    }
  }, [selectedStudent]);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentReport();
      loadFamilyChat();
    }
  }, [selectedStudent, loadStudentReport, loadFamilyChat]);

  const handleLinkStudent = async () => {
    if (!linkEmail.trim()) return;
    setIsLoading(true);
    try {
      await api.post('/parent/link', { student_email: linkEmail, relation_type: 'parent' });
      setLinkEmail('');
      setShowLinkForm(false);
      loadStudents();
    } catch (e) {
      alert('关联失败：' + (e instanceof Error ? e.message : '未知错误'));
    }
    setIsLoading(false);
  };

  const handleSendMessage = async () => {
    if (!selectedStudent || !newMessage.trim()) return;
    try {
      await api.post('/parent/family-chat', {
        student_id: selectedStudent.student_id,
        content: newMessage.trim(),
      });
      setNewMessage('');
      loadFamilyChat();
    } catch {}
  };

  const weeklyTrend = ((studentReport?.daily_logs || []) as Record<string, unknown>[]).map((log, i) => ({
    day: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i] || `Day${i}`,
    minutes: (log.study_time as number) || 0,
  }));

  const alerts = [
    { type: 'warning' as const, message: '数学韦达定理掌握度低于50%，建议加强练习', time: '2小时前' },
    { type: 'success' as const, message: '英语口语练习连续5天达标', time: '昨天' },
    { type: 'info' as const, message: '本周学习时长395分钟，较上周增加12%', time: '昨天' },
  ];

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
              <span className="text-2xl font-bold">{selectedStudent?.name?.[0] || '?'}</span>
            </div>
            <div>
              <h3 className="text-xl font-bold">{selectedStudent?.name || '未选择'}</h3>
              <p className="text-teal-100">{selectedStudent?.grade || ''} · 连续学习{selectedStudent?.streak_days || 0}天</p>
            </div>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{selectedStudent?.today_study_time || 0}<span className="text-sm">分钟</span></p>
              <p className="text-xs text-teal-100">今日学习</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{selectedStudent?.today_questions || 0}<span className="text-sm">道</span></p>
              <p className="text-xs text-teal-100">今日答题</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{studentReport ? Math.round((studentReport.avg_accuracy as number) || 0) : 0}<span className="text-sm">%</span></p>
              <p className="text-xs text-teal-100">正确率</p>
            </div>
          </div>
        </div>
        {students.length === 0 && (
          <div className="mt-4 pt-4 border-t border-white/20 text-center">
            <p className="text-teal-100 mb-2">还没有关联学生账号</p>
            <Button
              onClick={() => setShowLinkForm(true)}
              className="bg-white/20 hover:bg-white/30 text-white rounded-lg"
            >
              <Plus className="w-4 h-4 mr-1" /> 关联学生
            </Button>
          </div>
        )}
        {students.length > 1 && (
          <div className="mt-4 pt-4 border-t border-white/20 flex gap-2">
            {students.map(s => (
              <button
                key={s.student_id}
                onClick={() => setSelectedStudent(s)}
                className={`px-3 py-1 rounded-lg text-sm transition-all ${
                  selectedStudent?.student_id === s.student_id
                    ? 'bg-white/30 text-white'
                    : 'bg-white/10 text-teal-100 hover:bg-white/20'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {showLinkForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4"
        >
          <h3 className="font-medium text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <Link className="w-4 h-4 text-teal-500" /> 关联学生账号
          </h3>
          <div className="flex gap-2">
            <Input
              value={linkEmail}
              onChange={e => setLinkEmail(e.target.value)}
              placeholder="输入学生的注册邮箱"
              className="flex-1"
            />
            <Button
              onClick={handleLinkStudent}
              disabled={isLoading}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
            >
              关联
            </Button>
            <Button
              onClick={() => { setShowLinkForm(false); setLinkEmail(''); }}
              variant="outline"
              className="rounded-lg"
            >
              取消
            </Button>
          </div>
        </motion.div>
      )}

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

        {/* Family Chat */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
        >
          <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-500" />
            家校对话
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
            {familyMessages.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">暂无消息，发送第一条鼓励吧</p>
            )}
            {familyMessages.map(msg => (
              <div key={msg.id} className={`p-2.5 rounded-xl text-sm ${
                msg.role === 'parent'
                  ? 'bg-teal-50 dark:bg-teal-900/20 ml-4'
                  : 'bg-slate-50 dark:bg-slate-700/30 mr-4'
              }`}>
                <p className="text-slate-700 dark:text-slate-200">{msg.content}</p>
                {msg.ai_summary && (
                  <p className="text-xs text-violet-500 mt-1 flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> {msg.ai_summary}
                  </p>
                )}
              </div>
            ))}
          </div>
          {selectedStudent && (
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="发送消息给孩子..."
                className="flex-1 h-9"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                size="sm"
                className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
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
