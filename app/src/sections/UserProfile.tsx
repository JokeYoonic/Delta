import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store';
import { motion } from 'framer-motion';
import {
  UserCircle, Award, BookOpen, Target, TrendingUp,
  Flame, Star, Settings, Bell, Moon, Sun,
  Edit3, Save, Calculator, Atom, Scroll, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { tutorApi, authApi } from '@/api';

const achievements = [
  { id: '1', title: '初出茅庐', desc: '完成首次AI答疑', icon: Star, unlocked: true, color: 'text-amber-500' },
  { id: '2', title: '学习达人', desc: '连续学习7天', icon: Flame, unlocked: true, color: 'text-orange-500' },
  { id: '3', title: '满分王者', desc: '考试获得100分', icon: Award, unlocked: false, color: 'text-slate-400' },
  { id: '4', title: '口语之星', desc: '口语评分达到90分', icon: Target, unlocked: false, color: 'text-slate-400' },
  { id: '5', title: '知识图谱', desc: '掌握100个知识点', icon: BookOpen, unlocked: false, color: 'text-slate-400' },
  { id: '6', title: '学霸之路', desc: '累计学习100小时', icon: TrendingUp, unlocked: false, color: 'text-slate-400' },
];

const subjectIcons: Record<string, React.ElementType> = {
  math: Calculator,
  english: BookOpen,
  chinese: Scroll,
  physics: Atom,
  chemistry: BookOpen,
};

export function UserProfile() {
  const { user, theme, toggleTheme, setUser, subjects } = useStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [grade, setGrade] = useState(user?.grade || '');
  const [school, setSchool] = useState(user?.school || '');
  const [notifications, setNotifications] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tutorConfig, setTutorConfig] = useState<{
    depth: number;
    learningStyle: string;
    communicationStyle: string;
    toneStyle: string;
    reasoningFramework: string;
    useEmojis: boolean;
  } | null>(null);

  const fetchTutorConfig = useCallback(async () => {
    try {
      const config = await tutorApi.getConfig();
      setTutorConfig({
        depth: config.depth,
        learningStyle: config.learning_style,
        communicationStyle: config.communication_style,
        toneStyle: config.tone_style,
        reasoningFramework: config.reasoning_framework,
        useEmojis: config.use_emojis,
      });
    } catch {
      // use defaults from store
    }
  }, []);

  useEffect(() => {
    fetchTutorConfig();
  }, [fetchTutorConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await authApi.updateMe({ name, grade, school });
    } catch {
      // fallback to local update
    }
    if (user) {
      setUser({ ...user, name, grade, school });
    }
    setEditing(false);
    setIsSaving(false);
  };

  const handleTutorConfigChange = useCallback(async (key: string, value: unknown) => {
    const newConfig = { ...tutorConfig, [key]: value };
    setTutorConfig(newConfig as typeof tutorConfig);
    try {
      await tutorApi.updateConfig({
        [key]: value,
      });
    } catch {
      // silently fail
    }
  }, [tutorConfig]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center py-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 flex items-center justify-center gap-2">
          <UserCircle className="w-6 h-6 text-slate-500" />
          个人中心
        </h2>
        <p className="text-slate-500 dark:text-slate-400">管理个人信息 · 查看成就 · 设置偏好</p>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 p-6 text-white"
      >
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold">
            {user?.name?.[0]}
          </div>
          <div className="flex-1">
            {!editing ? (
              <>
                <h3 className="text-2xl font-bold mb-1">{user?.name}</h3>
                <p className="text-violet-100">{user?.school} · {user?.grade}</p>
                <div className="flex gap-3 mt-3">
                  <div className="bg-white/15 rounded-lg px-3 py-1 text-sm">
                    <Flame className="w-4 h-4 inline mr-1 text-amber-300" />
                    连续 {user?.streakDays} 天
                  </div>
                  <div className="bg-white/15 rounded-lg px-3 py-1 text-sm">
                    <Star className="w-4 h-4 inline mr-1 text-amber-300" />
                    {user?.points} 积分
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3 max-w-md">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="姓名" className="bg-white/20 border-white/30 text-white placeholder:text-violet-200" />
                <Input value={school} onChange={e => setSchool(e.target.value)} placeholder="学校" className="bg-white/20 border-white/30 text-white placeholder:text-violet-200" />
                <Input value={grade} onChange={e => setGrade(e.target.value)} placeholder="年级" className="bg-white/20 border-white/30 text-white placeholder:text-violet-200" />
              </div>
            )}
          </div>
          <Button
            onClick={() => editing ? handleSave() : setEditing(true)}
            variant="outline"
            className="rounded-xl border-white/30 text-white hover:bg-white/10 flex-shrink-0"
          >
            {editing ? <Save className="w-4 h-4 mr-2" /> : <Edit3 className="w-4 h-4 mr-2" />}
            {editing ? '保存' : '编辑'}
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subject Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
        >
          <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            学科进度
          </h3>
          <div className="space-y-4">
            {subjects.map(subject => {
              const Icon = subjectIcons[subject.id] || BookOpen;
              const avgProgress = Math.round(subject.chapters.reduce((a, ch) => a + ch.progress, 0) / subject.chapters.length);
              return (
                <div key={subject.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" style={{ color: subject.color }} />
                      <span className="text-sm text-slate-700 dark:text-slate-200">{subject.name}</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: subject.color }}>{avgProgress}%</span>
                  </div>
                  <Progress value={avgProgress} className="h-2" />
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
        >
          <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            成就徽章
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {achievements.map(achievement => {
              const Icon = achievement.icon;
              return (
                <div
                  key={achievement.id}
                  className={`p-3 rounded-xl text-center ${
                    achievement.unlocked
                      ? 'bg-amber-50 dark:bg-amber-900/20'
                      : 'bg-slate-50 dark:bg-slate-700/30 opacity-60'
                  }`}
                >
                  <Icon className={`w-8 h-8 mx-auto mb-2 ${achievement.unlocked ? achievement.color : 'text-slate-300'}`} />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{achievement.title}</p>
                  <p className="text-xs text-slate-500">{achievement.desc}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
      >
        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-500" />
          偏好设置
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              {theme === 'light' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-400" />}
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">深色模式</p>
                <p className="text-xs text-slate-500">切换明暗主题</p>
              </div>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">消息通知</p>
                <p className="text-xs text-slate-500">接收学习提醒和通知</p>
              </div>
            </div>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
