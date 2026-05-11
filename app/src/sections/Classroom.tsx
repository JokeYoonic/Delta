import { useState } from 'react';
import { useStore } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Play, Lock, CheckCircle, ChevronRight,
  BookOpen, Target, Clock, Star, FileQuestion, Lightbulb,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type ClassroomView = 'list' | 'learning' | 'summary';

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: number;
  knowledgePoints: string[];
  completed: boolean;
  locked: boolean;
  progress: number;
  examples: Example[];
  exercises: Exercise[];
}

interface Example {
  id: string;
  question: string;
  solution: string;
  steps: string[];
}

interface Exercise {
  id: string;
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
}

const mockLessons: Lesson[] = [
  {
    id: 'l1', title: '一元二次方程的概念', description: '理解一元二次方程的定义和一般形式',
    duration: 15, knowledgePoints: ['一元二次方程定义', '一般形式'], completed: true, locked: false, progress: 100,
    examples: [
      { id: 'e1', question: '判断：x² + 3x - 4 = 0 是一元二次方程吗？',
        solution: '是的，因为它满足一元二次方程的三个条件：①只有一个未知数x；②未知数的最高次数是2；③是整式方程。',
        steps: ['确定未知数个数：只有x', '确定最高次数：2次', '确认是整式方程'] },
    ],
    exercises: [
      { id: 'ex1', question: '下列方程中，是一元二次方程的是（ ）',
        options: ['x + 2 = 0', 'x² - 3x + 2 = 0', 'x³ + x = 0', '1/x + x = 2'],
        answer: 'x² - 3x + 2 = 0', explanation: '一元二次方程必须满足：一个未知数、最高次数为2、整式方程' },
    ],
  },
  {
    id: 'l2', title: '直接开平方法', description: '利用平方根的定义解形如x²=p的方程',
    duration: 20, knowledgePoints: ['直接开平方法', '平方根'], completed: false, locked: false, progress: 50,
    examples: [
      { id: 'e2', question: '解方程：x² = 9',
        solution: 'x = ±√9 = ±3，所以 x₁ = 3, x₂ = -3',
        steps: ['写成 x² = p 的形式', '两边开平方：x = ±√p', '写出两个根'] },
    ],
    exercises: [
      { id: 'ex2', question: '方程 (x-2)² = 16 的解为（ ）',
        options: ['x=6', 'x=-2', 'x₁=6, x₂=-2', 'x₁=-6, x₂=2'],
        answer: 'x₁=6, x₂=-2', explanation: 'x-2=±4，所以x=2±4，即x₁=6, x₂=-2' },
    ],
  },
  {
    id: 'l3', title: '配方法', description: '通过配方将方程化为完全平方形式',
    duration: 25, knowledgePoints: ['配方法', '完全平方公式'], completed: false, locked: false, progress: 0,
    examples: [
      { id: 'e3', question: '用配方法解方程：x² + 6x + 5 = 0',
        solution: 'x² + 6x + 9 - 9 + 5 = 0 → (x+3)² = 4 → x+3 = ±2 → x₁=-1, x₂=-5',
        steps: ['移项：x² + 6x = -5', '配方：x² + 6x + 9 = -5 + 9', '写成完全平方：(x+3)² = 4', '开平方求解'] },
    ],
    exercises: [
      { id: 'ex3', question: '用配方法解方程 x² - 4x + 1 = 0，配方后得（ ）',
        options: ['(x-2)²=3', '(x+2)²=3', '(x-2)²=5', '(x+2)²=5'],
        answer: '(x-2)²=3', explanation: 'x²-4x+4-4+1=0 → (x-2)²=3' },
    ],
  },
  {
    id: 'l4', title: '公式法（求根公式）', description: '掌握万能求根公式的推导和应用',
    duration: 30, knowledgePoints: ['求根公式', '判别式'], completed: false, locked: true, progress: 0,
    examples: [], exercises: [],
  },
  {
    id: 'l5', title: '因式分解法', description: '将方程左边分解为两个一次因式',
    duration: 25, knowledgePoints: ['因式分解', '十字相乘法'], completed: false, locked: true, progress: 0,
    examples: [], exercises: [],
  },
  {
    id: 'l6', title: '根的判别式', description: '利用判别式判断方程根的情况',
    duration: 20, knowledgePoints: ['判别式', '根的情况'], completed: false, locked: true, progress: 0,
    examples: [], exercises: [],
  },
];

export function Classroom() {
  const [view, setView] = useState<ClassroomView>('list');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showExample, setShowExample] = useState(false);
  const [exerciseAnswer, setExerciseAnswer] = useState('');
  const [showExerciseResult, setShowExerciseResult] = useState(false);
  const { setCurrentPage } = useStore();

  const startLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setCurrentStep(0);
    setShowExample(false);
    setExerciseAnswer('');
    setShowExerciseResult(false);
    setView('learning');
  };

  if (view === 'learning' && selectedLesson) {
    const step = currentStep;
    const totalSteps = 4 + selectedLesson.examples.length + selectedLesson.exercises.length;

    return (
      <div className="h-[calc(100vh-7rem)] flex flex-col max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 rounded-t-2xl">
          <button onClick={() => setView('list')} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">返回课程列表</span>
          </button>
          <div className="flex-1 mx-6">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">课程进度</span>
              <span className="text-violet-600 font-medium">{Math.round((step / totalSteps) * 100)}%</span>
            </div>
            <Progress value={(step / totalSteps) * 100} className="h-2" />
          </div>
          <span className="text-sm text-slate-500 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {selectedLesson.duration}分钟
          </span>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          <AnimatePresence mode="wait">
            {/* Step 0: Learning Objectives */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Badge className="mb-4 bg-violet-100 text-violet-700">学习目标</Badge>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">{selectedLesson.title}</h2>
                <p className="text-slate-600 dark:text-slate-300 mb-6">{selectedLesson.description}</p>
                <div className="space-y-3 mb-6">
                  {selectedLesson.knowledgePoints.map((kp, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20">
                      <Target className="w-5 h-5 text-violet-500" />
                      <span className="text-slate-700 dark:text-slate-200">掌握{kp}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">本节课约{selectedLesson.duration}分钟，包含例题精讲和即时练习。</p>
              </motion.div>
            )}

            {/* Step 1: Knowledge Explanation */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Badge className="mb-4 bg-blue-100 text-blue-700">知识讲解</Badge>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">{selectedLesson.title}</h2>
                <div className="prose dark:prose-invert max-w-none mb-6">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 mb-4">
                    <h4 className="font-semibold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-500" />
                      定义
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                      {selectedLesson.title}是指：{selectedLesson.description}。这是解决一元二次方程的重要方法之一。
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 mb-4">
                    <h4 className="font-semibold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      核心思路
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                      通过{selectedLesson.knowledgePoints[0]}，将复杂的一元二次方程转化为可以直接求解的形式。
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      注意事项
                    </h4>
                    <ul className="text-sm text-amber-700 dark:text-amber-200 space-y-1">
                      <li>确保方程是一元二次方程的标准形式 ax²+bx+c=0</li>
                      <li>注意计算过程中的符号变化</li>
                      <li>最后要检验答案是否正确</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Example */}
            {step === 2 && selectedLesson.examples[0] && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Badge className="mb-4 bg-emerald-100 text-emerald-700">例题精讲</Badge>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{selectedLesson.examples[0].question}</h2>
                
                {!showExample ? (
                  <Button onClick={() => setShowExample(true)} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                    <Play className="w-4 h-4 mr-2" />
                    查看解析
                  </Button>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="space-y-3 mb-4">
                      {selectedLesson.examples[0].steps.map((s, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                          <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                          <span className="text-slate-700 dark:text-slate-200 text-sm">{s}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 rounded-xl bg-slate-800 text-white">
                      <p className="font-medium mb-1">最终答案</p>
                      <p className="text-sm text-slate-300">{selectedLesson.examples[0].solution}</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step 3: Exercise */}
            {step === 3 && selectedLesson.exercises[0] && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Badge className="mb-4 bg-orange-100 text-orange-700">即时练习</Badge>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{selectedLesson.exercises[0].question}</h2>
                
                {selectedLesson.exercises[0].options && (
                  <div className="space-y-3 mb-4">
                    {selectedLesson.exercises[0].options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => { setExerciseAnswer(opt); setShowExerciseResult(false); }}
                        disabled={showExerciseResult}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          exerciseAnswer === opt
                            ? showExerciseResult
                              ? opt === selectedLesson.exercises[0].answer
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                              : 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="font-medium mr-2 text-slate-500">{String.fromCharCode(65 + i)}.</span>
                        <span className="text-slate-700 dark:text-slate-200">{opt}</span>
                      </button>
                    ))}
                  </div>
                )}

                {exerciseAnswer && !showExerciseResult && (
                  <Button onClick={() => setShowExerciseResult(true)} className="rounded-xl bg-violet-600 hover:bg-violet-700">
                    提交答案
                  </Button>
                )}

                {showExerciseResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl ${
                      exerciseAnswer === selectedLesson.exercises[0].answer
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {exerciseAnswer === selectedLesson.exercises[0].answer ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <FileQuestion className="w-5 h-5 text-red-600" />
                      )}
                      <span className={`font-semibold ${exerciseAnswer === selectedLesson.exercises[0].answer ? 'text-green-700' : 'text-red-700'}`}>
                        {exerciseAnswer === selectedLesson.exercises[0].answer ? '回答正确！' : '再想想看~'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{selectedLesson.exercises[0].explanation}</p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step 4: Summary */}
            {step >= 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Badge className="mb-4 bg-amber-100 text-amber-700">课堂小结</Badge>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">本节课总结</h2>
                <div className="space-y-4 mb-6">
                  <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20">
                    <h4 className="font-semibold text-violet-800 dark:text-violet-300 mb-2">核心知识</h4>
                    <p className="text-sm text-violet-700 dark:text-violet-200">掌握了{selectedLesson.title}的基本概念和应用方法</p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                    <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-2">学习成果</h4>
                    <div className="flex gap-2 flex-wrap">
                      {selectedLesson.knowledgePoints.map((kp, i) => (
                        <Badge key={i} variant="outline" className="border-emerald-300 text-emerald-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {kp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">课后推荐</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-200 mb-3">建议完成以下练习巩固所学知识：</p>
                    <div className="space-y-2">
                      <button onClick={() => setCurrentPage('exam')} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                        <ChevronRight className="w-4 h-4" />
                        做3道{selectedLesson.title}相关练习题
                      </button>
                      <button onClick={() => setCurrentPage('chat')} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                        <ChevronRight className="w-4 h-4" />
                        向AI老师提问，深入理解疑难
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Footer Controls */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 rounded-b-2xl">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="rounded-xl"
          >
            上一步
          </Button>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${i === currentStep ? 'bg-violet-500' : i < currentStep ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`}
              />
            ))}
          </div>
          <Button
            onClick={() => {
              if (currentStep >= totalSteps - 1) {
                setView('list');
              } else {
                setCurrentStep(currentStep + 1);
              }
            }}
            className="rounded-xl bg-violet-600 hover:bg-violet-700"
          >
            {currentStep >= totalSteps - 1 ? '完成' : '下一步'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 flex items-center justify-center gap-2">
          <GraduationCap className="w-6 h-6 text-violet-500" />
          AI课堂
        </h2>
        <p className="text-slate-500 dark:text-slate-400">结构化教学 · 循序渐进 · 即时练习 · 智能适配</p>
      </div>

      {/* Subject Selector */}
      <div className="flex gap-3 justify-center flex-wrap">
        {['数学', '英语', '语文', '物理', '化学'].map((s, i) => (
          <Button
            key={s}
            variant={i === 0 ? 'default' : 'outline'}
            className={`rounded-xl ${i === 0 ? 'bg-violet-600' : ''}`}
          >
            {s}
          </Button>
        ))}
      </div>

      {/* Chapter: Quadratic Equations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">第九章：一元二次方程</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">6节课 · 约2.5小时 · 进度 25%</p>
          </div>
          <div className="text-right">
            <Progress value={25} className="w-32 h-2" />
            <span className="text-xs text-slate-500 mt-1">2/6 已完成</span>
          </div>
        </div>

        <div className="space-y-3">
          {mockLessons.map((lesson, i) => (
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
              <div className="flex items-center gap-2">
                {lesson.progress > 0 && lesson.progress < 100 && (
                  <Progress value={lesson.progress} className="w-20 h-1.5" />
                )}
                {!lesson.locked && <ChevronRight className="w-4 h-4 text-slate-400" />}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
