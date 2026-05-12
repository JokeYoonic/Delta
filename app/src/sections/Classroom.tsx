import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Play, Lock, CheckCircle, ChevronRight,
  Clock, Lightbulb, ArrowLeft, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { classroomApi } from '@/api';

type ClassroomView = 'list' | 'learning' | 'summary';

interface TeachingStep {
  key: string;
  label: string;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: number;
  knowledgePoints: string[];
  completed: boolean;
  locked: boolean;
  progress: number;
}

const subjectChapters: Record<string, { title: string; lessons: Lesson[] }> = {
  '数学': {
    title: '一元二次方程',
    lessons: [
      { id: 'l1', title: '一元二次方程的概念', description: '理解一元二次方程的定义和一般形式', duration: 15, knowledgePoints: ['一元二次方程定义', '一般形式'], completed: false, locked: false, progress: 0 },
      { id: 'l2', title: '直接开平方法', description: '利用平方根的定义解形如x²=p的方程', duration: 20, knowledgePoints: ['直接开平方法', '平方根'], completed: false, locked: false, progress: 0 },
      { id: 'l3', title: '配方法', description: '通过配方将方程化为完全平方形式', duration: 25, knowledgePoints: ['配方法', '完全平方公式'], completed: false, locked: false, progress: 0 },
      { id: 'l4', title: '公式法', description: '掌握万能求根公式的推导和应用', duration: 30, knowledgePoints: ['求根公式', '判别式'], completed: false, locked: true, progress: 0 },
      { id: 'l5', title: '因式分解法', description: '将方程左边分解为两个一次因式', duration: 25, knowledgePoints: ['因式分解', '十字相乘法'], completed: false, locked: true, progress: 0 },
      { id: 'l6', title: '根的判别式', description: '利用判别式判断方程根的情况', duration: 20, knowledgePoints: ['判别式', '根的情况'], completed: false, locked: true, progress: 0 },
    ],
  },
  '英语': {
    title: '时态与语态',
    lessons: [
      { id: 'e1', title: '一般现在时', description: '掌握一般现在时的构成和用法', duration: 20, knowledgePoints: ['一般现在时', '第三人称单数'], completed: false, locked: false, progress: 0 },
      { id: 'e2', title: '一般过去时', description: '掌握一般过去时的构成和用法', duration: 20, knowledgePoints: ['一般过去时', '规则/不规则动词'], completed: false, locked: false, progress: 0 },
      { id: 'e3', title: '现在进行时', description: '掌握现在进行时的构成和用法', duration: 20, knowledgePoints: ['现在进行时', 'be+doing'], completed: false, locked: false, progress: 0 },
    ],
  },
  '语文': {
    title: '古诗词鉴赏',
    lessons: [
      { id: 'c1', title: '唐诗鉴赏', description: '学习唐诗的鉴赏方法', duration: 25, knowledgePoints: ['意象分析', '情感把握'], completed: false, locked: false, progress: 0 },
      { id: 'c2', title: '宋词鉴赏', description: '学习宋词的鉴赏方法', duration: 25, knowledgePoints: ['豪放派', '婉约派'], completed: false, locked: false, progress: 0 },
    ],
  },
  '物理': {
    title: '力学基础',
    lessons: [
      { id: 'p1', title: '牛顿第一定律', description: '理解惯性和力的关系', duration: 20, knowledgePoints: ['惯性', '牛顿第一定律'], completed: false, locked: false, progress: 0 },
      { id: 'p2', title: '牛顿第二定律', description: '掌握F=ma的应用', duration: 25, knowledgePoints: ['加速度', '牛顿第二定律'], completed: false, locked: false, progress: 0 },
    ],
  },
  '化学': {
    title: '化学键',
    lessons: [
      { id: 'h1', title: '离子键', description: '理解离子键的形成和特征', duration: 20, knowledgePoints: ['离子键', '电子转移'], completed: false, locked: false, progress: 0 },
      { id: 'h2', title: '共价键', description: '理解共价键的形成和特征', duration: 20, knowledgePoints: ['共价键', '电子共用'], completed: false, locked: false, progress: 0 },
    ],
  },
};

export function Classroom() {
  const [view, setView] = useState<ClassroomView>('list');
  const [selectedSubject, setSelectedSubject] = useState('数学');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [stepContent, setStepContent] = useState<string>('');
  const [isLoadingStep, setIsLoadingStep] = useState(false);
  const [teachingSteps, setTeachingSteps] = useState<TeachingStep[]>([
    { key: 'objectives', label: '学习目标' },
    { key: 'explain', label: '概念讲解' },
    { key: 'examples', label: '典型例题' },
    { key: 'practice', label: '随堂练习' },
    { key: 'summary', label: '课堂总结' },
  ]);
  const [askInput, setAskInput] = useState('');
  const [askResponse, setAskResponse] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingContentRef = useRef<string>('');
  const { setCurrentPage } = useStore();

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const connectClassroomWs = useCallback((): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      try {
        const ws = classroomApi.createWebSocket();
        ws.onopen = () => resolve(ws);
        ws.onerror = () => reject(new Error('WebSocket connection failed'));
        wsRef.current = ws;
      } catch (e) {
        reject(e);
      }
    });
  }, []);

  const startLesson = useCallback(async (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setCurrentStepIdx(0);
    setStepContent('');
    setAskResponse('');
    setView('learning');

    try {
      const ws = await connectClassroomWs();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'step_start') {
          setIsLoadingStep(true);
          setCurrentStepIdx(data.data.step_index);
          if (data.data.teaching_steps) {
            setTeachingSteps(data.data.teaching_steps);
          }
          pendingContentRef.current = '';
          setStepContent('');
        }

        if (data.type === 'chunk') {
          setIsLoadingStep(false);
          pendingContentRef.current += data.content;
          setStepContent(pendingContentRef.current);
        }

        if (data.type === 'step_done') {
          setIsLoadingStep(false);
          setStepContent(data.content || pendingContentRef.current);
          if (data.data?.teaching_steps) {
            setTeachingSteps(data.data.teaching_steps);
          }
          setCurrentStepIdx(data.data?.step_index ?? 0);
        }

        if (data.type === 'done') {
          setIsAsking(false);
          setAskResponse(pendingContentRef.current);
        }

        if (data.type === 'classroom_complete') {
          setView('summary');
        }

        if (data.type === 'error') {
          setIsLoadingStep(false);
          setIsAsking(false);
        }
      };

      ws.send(JSON.stringify({
        type: 'init',
        subject: selectedSubject,
        topic: lesson.title,
      }));
    } catch {
      setStepContent(`# ${lesson.title}\n\n${lesson.description}\n\n**学习目标：**\n${lesson.knowledgePoints.map(kp => `- 掌握${kp}`).join('\n')}\n\n无法连接AI课堂服务，请检查后端是否启动。`);
    }
  }, [selectedSubject, connectClassroomWs]);

  const goToStep = useCallback((direction: 'next' | 'prev' | number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    if (typeof direction === 'number') {
      wsRef.current.send(JSON.stringify({ type: 'goto_step', step: teachingSteps[direction]?.key }));
    } else if (direction === 'next') {
      wsRef.current.send(JSON.stringify({ type: 'next_step' }));
    } else {
      wsRef.current.send(JSON.stringify({ type: 'prev_step' }));
    }
    setAskResponse('');
    setAskInput('');
  }, [teachingSteps]);

  const handleAsk = useCallback(() => {
    if (!askInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setIsAsking(true);
    setAskResponse('');
    pendingContentRef.current = '';
    wsRef.current.send(JSON.stringify({ type: 'ask', content: askInput.trim() }));
    setAskInput('');
  }, [askInput]);

  const currentChapter = subjectChapters[selectedSubject];

  if (view === 'learning' && selectedLesson) {
    const currentStep = teachingSteps[currentStepIdx];
    const progress = ((currentStepIdx + 1) / teachingSteps.length) * 100;

    return (
      <div className="h-[calc(100vh-7rem)] flex flex-col max-w-4xl mx-auto">
        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 rounded-t-2xl">
          <button onClick={() => setView('list')} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">返回课程列表</span>
          </button>
          <div className="flex-1 mx-6">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">{currentStep?.label || '加载中...'}</span>
              <span className="text-violet-600 font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <span className="text-sm text-slate-500 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {selectedLesson.duration}分钟
          </span>
        </div>

        <ScrollArea className="flex-1 p-6">
          <AnimatePresence mode="wait">
            <motion.div key={currentStepIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Badge className="mb-4 bg-violet-100 text-violet-700">{currentStep?.label || '加载中'}</Badge>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">{selectedLesson.title}</h2>

              {isLoadingStep ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                  <span className="ml-3 text-slate-500">AI老师正在准备课程内容...</span>
                </div>
              ) : (
                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                  {stepContent}
                </div>
              )}

              {askResponse && (
                <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    AI老师回答
                  </h4>
                  <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap">{askResponse}</div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </ScrollArea>

        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 rounded-b-2xl space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={askInput}
              onChange={e => setAskInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
              placeholder="有问题？向AI老师提问..."
              className="flex-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <Button
              onClick={handleAsk}
              disabled={isAsking || !askInput.trim()}
              size="sm"
              className="rounded-xl bg-violet-600 hover:bg-violet-700"
            >
              {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : '提问'}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => goToStep('prev')}
              disabled={currentStepIdx === 0}
              className="rounded-xl"
            >
              上一步
            </Button>
            <div className="flex gap-1">
              {teachingSteps.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => goToStep(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentStepIdx ? 'bg-violet-500' : i < currentStepIdx ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <Button
              onClick={() => {
                if (currentStepIdx >= teachingSteps.length - 1) {
                  if (wsRef.current) wsRef.current.close();
                  setView('summary');
                } else {
                  goToStep('next');
                }
              }}
              className="rounded-xl bg-violet-600 hover:bg-violet-700"
            >
              {currentStepIdx >= teachingSteps.length - 1 ? '完成' : '下一步'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'summary') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 p-8 text-white text-center"
        >
          <GraduationCap className="w-12 h-12 mx-auto mb-4 text-amber-300" />
          <h2 className="text-2xl font-bold mb-2">课堂完成！</h2>
          <p className="text-violet-100 mb-4">{selectedLesson?.title}</p>
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="bg-white/15 rounded-xl p-3">
              <p className="text-2xl font-bold">{teachingSteps.length}</p>
              <p className="text-xs text-violet-200">学习步骤</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3">
              <p className="text-2xl font-bold">{selectedLesson?.duration || 0}</p>
              <p className="text-xs text-violet-200">预计时长(分)</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3">
              <p className="text-2xl font-bold">{selectedLesson?.knowledgePoints.length || 0}</p>
              <p className="text-xs text-violet-200">知识点</p>
            </div>
          </div>
        </motion.div>

        <div className="flex gap-3 justify-center pb-6">
          <Button onClick={() => setView('list')} variant="outline" className="rounded-xl">
            返回课程列表
          </Button>
          <Button onClick={() => setCurrentPage('chat')} className="rounded-xl bg-violet-600 hover:bg-violet-700">
            向AI老师提问
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 flex items-center justify-center gap-2">
          <GraduationCap className="w-6 h-6 text-violet-500" />
          AI课堂
        </h2>
        <p className="text-slate-500 dark:text-slate-400">结构化教学 · 循序渐进 · 即时练习 · 智能适配</p>
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
        {Object.keys(subjectChapters).map((s) => (
          <Button
            key={s}
            variant={selectedSubject === s ? 'default' : 'outline'}
            onClick={() => setSelectedSubject(s)}
            className={`rounded-xl ${selectedSubject === s ? 'bg-violet-600' : ''}`}
          >
            {s}
          </Button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">{currentChapter.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{currentChapter.lessons.length}节课 · AI智能教学</p>
          </div>
        </div>

        <div className="space-y-3">
          {currentChapter.lessons.map((lesson, i) => (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                lesson.locked
                  ? 'opacity-60 bg-slate-50 dark:bg-slate-800/50'
                  : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 cursor-pointer'
              }`}
              onClick={() => !lesson.locked && startLesson(lesson)}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                lesson.completed ? 'bg-green-500' : lesson.locked ? 'bg-slate-300 dark:bg-slate-600' : 'bg-violet-500'
              }`}>
                {lesson.completed ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : lesson.locked ? (
                  <Lock className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800 dark:text-white">{lesson.title}</span>
                  {lesson.completed && <Badge variant="outline" className="text-green-600 border-green-300">已完成</Badge>}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{lesson.description} · {lesson.duration}分钟</p>
              </div>
              {!lesson.locked && <ChevronRight className="w-4 h-4 text-slate-400" />}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
