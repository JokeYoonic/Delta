import { useState, useCallback } from 'react';
import { useStore } from '@/store';
import { motion } from 'framer-motion';
import {
  ClipboardCheck, Play, Clock, CheckCircle, XCircle, AlertCircle,
  ChevronRight, RotateCcw, BarChart3, BookOpen, Calculator,
  Target, Award, TrendingUp, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { examApi } from '@/api';
import type { Question, Exam, ExamType, ExamResult } from '@/types';

const mockQuestions: Question[] = [
  {
    id: 'q1', type: 'single', content: '一元二次方程 x² - 5x + 6 = 0 的根是（ ）',
    options: ['x₁=2, x₂=3', 'x₁=-2, x₂=-3', 'x₁=1, x₂=6', 'x₁=-1, x₂=-6'],
    correctAnswer: 'x₁=2, x₂=3', explanation: '因式分解得 (x-2)(x-3)=0，所以 x₁=2, x₂=3',
    knowledgePoint: '因式分解法', difficulty: 'easy', score: 5, userAnswer: '',
  },
  {
    id: 'q2', type: 'single', content: '用配方法解方程 x² + 6x + 5 = 0，配方后得（ ）',
    options: ['(x+3)²=4', '(x+3)²=14', '(x+6)²=4', '(x+6)²=31'],
    correctAnswer: '(x+3)²=4', explanation: 'x²+6x+9-9+5=0 → (x+3)²-4=0 → (x+3)²=4',
    knowledgePoint: '配方法', difficulty: 'medium', score: 5, userAnswer: '',
  },
  {
    id: 'q3', type: 'fill', content: '一元二次方程 ax² + bx + c = 0 的求根公式是 _______________',
    options: [], correctAnswer: 'x=(-b±√(b²-4ac))/2a',
    explanation: '求根公式：x = (-b ± √(b²-4ac)) / 2a',
    knowledgePoint: '公式法', difficulty: 'medium', score: 5, userAnswer: '',
  },
  {
    id: 'q4', type: 'single', content: '若方程 x² - 3x + m = 0 有两个不相等的实数根，则m的取值范围是（ ）',
    options: ['m < 9/4', 'm > 9/4', 'm ≤ 9/4', 'm ≥ 9/4'],
    correctAnswer: 'm < 9/4', explanation: 'Δ = 9 - 4m > 0 → m < 9/4',
    knowledgePoint: '根的判别式', difficulty: 'hard', score: 5, userAnswer: '',
  },
  {
    id: 'q5', type: 'judge', content: '若一元二次方程的两根之和为5，两根之积为6，则该方程为 x² - 5x + 6 = 0',
    options: ['正确', '错误'], correctAnswer: '正确',
    explanation: '根据韦达定理，x₁+x₂=-b/a=5，x₁x₂=c/a=6，所以方程为x²-5x+6=0',
    knowledgePoint: '韦达定理', difficulty: 'medium', score: 5, userAnswer: '',
  },
  {
    id: 'q6', type: 'calculation', content: '解方程：2x² - 4x - 6 = 0（用公式法）',
    options: [], correctAnswer: 'x₁=3, x₂=-1',
    explanation: 'a=2, b=-4, c=-6。Δ=16+48=64。x=(4±8)/4，所以x₁=3, x₂=-1',
    knowledgePoint: '公式法', difficulty: 'medium', score: 10, userAnswer: '',
  },
];

const examModes = [
  { id: 'practice' as ExamType, label: '练习模式', desc: '即时查看答案和解析', icon: BookOpen, color: 'bg-blue-500' },
  { id: 'quiz' as ExamType, label: '测验模式', desc: '限时完成，交卷后看解析', icon: Target, color: 'bg-orange-500' },
  { id: 'simulation' as ExamType, label: '仿真模式', desc: '模拟真实考场环境', icon: Award, color: 'bg-red-500' },
];

export function ExamCenter() {
  const { setCurrentPage } = useStore();
  const [view, setView] = useState<'list' | 'config' | 'exam' | 'result'>('list');
  const [selectedMode, setSelectedMode] = useState<ExamType>('practice');
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ExamResult | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('数学');
  const [selectedChapter, setSelectedChapter] = useState('一元二次方程');

  const startExam = useCallback(async (mode: ExamType) => {
    setIsLoadingQuestions(true);
    try {
      const genResult = await examApi.generateQuestions({
        subject: selectedSubject,
        chapter: selectedChapter,
        difficulty: mode === 'practice' ? 'easy' : mode === 'quiz' ? 'medium' : 'hard',
        count: mode === 'simulation' ? 20 : 10,
      });

      const questions: Question[] = (genResult.questions || mockQuestions).map((q: Record<string, unknown>, i: number) => ({
        id: (q.id as string) || `q-${i}`,
        type: (q.type as Question['type']) || 'single',
        content: (q.content as string) || '',
        options: (q.options as string[]) || [],
        correctAnswer: (q.answer as string) || '',
        explanation: (q.explanation as string) || '',
        knowledgePoint: ((q.knowledge_points as string[])?.[0]) || '',
        difficulty: (q.difficulty as Question['difficulty']) || 'medium',
        score: (q.score as number) || 5,
        userAnswer: '',
      }));

      const exam: Exam = {
        id: `exam-${Date.now()}`,
        title: `${selectedChapter}单元测试`,
        type: mode,
        subject: selectedSubject,
        chapter: selectedChapter,
        questions,
        duration: mode === 'simulation' ? 45 : 30,
        totalScore: questions.reduce((a, q) => a + q.score, 0),
        timeRemaining: mode === 'practice' ? 9999 : (mode === 'simulation' ? 45 : 30) * 60,
        status: 'in-progress',
      };
      setSelectedMode(mode);
      setCurrentExam(exam);
      setAnswers({});
      setCurrentQuestion(0);
      setView('exam');
      if (mode !== 'practice') {
        setTimeRemaining(exam.timeRemaining);
        const timer = setInterval(() => {
          setTimeRemaining(prev => {
            if (prev <= 1) { clearInterval(timer); return 0; }
            return prev - 1;
          });
        }, 1000);
      }
    } catch {
      const exam: Exam = {
        id: `exam-${Date.now()}`,
        title: `${selectedChapter}单元测试`,
        type: mode,
        subject: selectedSubject,
        chapter: selectedChapter,
        questions: mockQuestions.map(q => ({ ...q, userAnswer: '' })),
        duration: 30,
        totalScore: mockQuestions.reduce((a, q) => a + q.score, 0),
        timeRemaining: mode === 'practice' ? 9999 : 30 * 60,
        status: 'in-progress',
      };
      setSelectedMode(mode);
      setCurrentExam(exam);
      setAnswers({});
      setCurrentQuestion(0);
      setView('exam');
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [selectedSubject, selectedChapter]);

  const submitExam = async () => {
    if (!currentExam) return;
    let score = 0;
    let correct = 0;
    const wrongQs: Question[] = [];
    const knowledgeStats: Record<string, { total: number; correct: number }> = {};

    currentExam.questions.forEach(q => {
      const userAns = answers[q.id] || '';
      const isCorrect = Array.isArray(q.correctAnswer)
        ? q.correctAnswer.includes(userAns)
        : userAns === q.correctAnswer;
      if (isCorrect) { score += q.score; correct++; }
      else wrongQs.push({ ...q, userAnswer: userAns, isCorrect: false });
      
      if (!knowledgeStats[q.knowledgePoint]) knowledgeStats[q.knowledgePoint] = { total: 0, correct: 0 };
      knowledgeStats[q.knowledgePoint].total++;
      if (isCorrect) knowledgeStats[q.knowledgePoint].correct++;
    });

    const mastery = Object.entries(knowledgeStats).map(([name, stats]) => ({
      name,
      mastery: Math.round((stats.correct / stats.total) * 100),
    }));

    let suggestions: string[] = [];
    try {
      const analysis = await examApi.analyzeMistakes({
        wrong_questions: wrongQs.map(q => ({
          content: q.content,
          user_answer: q.userAnswer,
          correct_answer: q.correctAnswer,
          knowledge_point: q.knowledgePoint,
        })),
        subject: currentExam.subject,
      });
      suggestions = (analysis as Record<string, unknown>).suggestions as string[] || [
        '建议复习薄弱知识点',
        '多练习相关题型',
        '注意审题和计算准确性',
      ];
    } catch {
      suggestions = [
        '建议复习韦达定理和根的判别式',
        '多练习因式分解法解方程',
        '注意计算过程中的符号变化',
      ];
    }

    const res: ExamResult = {
      examId: currentExam.id,
      score,
      totalScore: currentExam.totalScore,
      correctCount: correct,
      wrongCount: currentExam.questions.length - correct,
      timeUsed: (currentExam.duration * 60) - timeRemaining,
      knowledgeMastery: mastery,
      wrongQuestions: wrongQs,
      suggestions,
    };

    try {
      await examApi.submitResult({
        exam_title: currentExam.title,
        exam_type: currentExam.type,
        subject: currentExam.subject,
        score: res.score,
        total_score: res.totalScore,
        correct_count: res.correctCount,
        wrong_count: res.wrongCount,
        time_used: res.timeUsed,
        knowledge_mastery: res.knowledgeMastery,
        wrong_questions: res.wrongQuestions,
        suggestions: res.suggestions,
      });
    } catch {
      // silently fail - result is still shown locally
    }

    setResult(res);
    setView('result');
  };

  const formatTime = (seconds: number) => {
    if (seconds >= 9999) return '不限时';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (view === 'exam' && currentExam) {
    const q = currentExam.questions[currentQuestion];
    return (
      <div className="h-[calc(100vh-7rem)] flex flex-col">
        {/* Exam Header */}
        <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 rounded-t-2xl">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-slate-800 dark:text-white">{currentExam.title}</h3>
            <Badge variant="outline" className={selectedMode === 'practice' ? 'border-blue-300 text-blue-600' : selectedMode === 'quiz' ? 'border-orange-300 text-orange-600' : 'border-red-300 text-red-600'}>
              {examModes.find(m => m.id === selectedMode)?.label}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            {selectedMode !== 'practice' && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${timeRemaining < 300 ? 'bg-red-50 text-red-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                <Clock className="w-4 h-4" />
                <span className="font-mono font-semibold">{formatTime(timeRemaining)}</span>
              </div>
            )}
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {currentQuestion + 1} / {currentExam.questions.length}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex gap-1">
            {currentExam.questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQuestion(i)}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i === currentQuestion ? 'bg-violet-500' :
                  answers[_.id] ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Badge className={q.difficulty === 'easy' ? 'bg-green-100 text-green-700' : q.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}>
                {q.difficulty === 'easy' ? '基础' : q.difficulty === 'medium' ? '中档' : '难题'}
              </Badge>
              <Badge variant="outline" className="text-slate-500">{q.knowledgePoint}</Badge>
              <span className="text-sm text-slate-400 ml-auto">{q.score}分</span>
            </div>

            <h4 className="text-lg font-medium text-slate-800 dark:text-white mb-6">{q.content}</h4>

            {q.type === 'single' && q.options && (
              <div className="space-y-3">
                {q.options.map((opt, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      answers[q.id] === opt
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span className="font-medium mr-2 text-slate-500">{String.fromCharCode(65 + i)}.</span>
                    <span className="text-slate-700 dark:text-slate-200">{opt}</span>
                  </motion.button>
                ))}
              </div>
            )}

            {q.type === 'fill' && (
              <input
                type="text"
                value={answers[q.id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                placeholder="请输入你的答案..."
                className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-white focus:border-violet-500 focus:outline-none"
              />
            )}

            {q.type === 'judge' && q.options && (
              <div className="flex gap-4">
                {q.options.map((opt) => (
                  <motion.button
                    key={opt}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all text-center ${
                      answers[q.id] === opt
                        ? opt === '正确' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {opt === '正确' ? <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-600" /> : <XCircle className="w-5 h-5 mx-auto mb-1 text-red-600" />}
                    <span className="text-slate-700 dark:text-slate-200">{opt}</span>
                  </motion.button>
                ))}
              </div>
            )}

            {q.type === 'calculation' && (
              <textarea
                value={answers[q.id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                placeholder="请写出完整的解题过程..."
                rows={6}
                className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-white focus:border-violet-500 focus:outline-none resize-none"
              />
            )}

            {/* Practice Mode: Show Answer */}
            {selectedMode === 'practice' && answers[q.id] && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">解析</span>
                </div>
                <p className="text-sm text-emerald-800 dark:text-emerald-200">{q.explanation}</p>
                <p className="text-sm mt-2 text-slate-600 dark:text-slate-400">
                  正确答案：<span className="font-semibold text-emerald-700 dark:text-emerald-300">{Array.isArray(q.correctAnswer) ? q.correctAnswer.join(' / ') : q.correctAnswer}</span>
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 rounded-b-2xl">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="rounded-xl"
          >
            上一题
          </Button>
          <div className="flex gap-2">
            {currentExam.questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQuestion(i)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                  i === currentQuestion ? 'bg-violet-600 text-white' :
                  answers[currentExam.questions[i].id] ? 'bg-emerald-100 text-emerald-700' :
                  'bg-slate-100 dark:bg-slate-700 text-slate-500'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          {currentQuestion < currentExam.questions.length - 1 ? (
            <Button onClick={() => setCurrentQuestion(currentQuestion + 1)} className="rounded-xl bg-violet-600 hover:bg-violet-700">
              下一题
            </Button>
          ) : (
            <Button onClick={submitExam} data-testid="submit-exam-btn" className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
              提交试卷
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (view === 'result' && result) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 p-8 text-white text-center"
        >
          <Award className="w-12 h-12 mx-auto mb-4 text-amber-300" />
          <h2 className="text-3xl font-bold mb-2">{result.score} / {result.totalScore}</h2>
          <p className="text-violet-100 mb-4">
            答对 {result.correctCount} 题 · 答错 {result.wrongCount} 题 · 用时 {Math.floor(result.timeUsed / 60)}分{result.timeUsed % 60}秒
          </p>
          <div className="flex justify-center gap-6 text-sm">
            <div className="bg-white/15 rounded-xl px-4 py-2">
              <span className="text-violet-200">正确率 </span>
              <span className="font-bold">{Math.round((result.correctCount / (result.correctCount + result.wrongCount)) * 100)}%</span>
            </div>
            <div className="bg-white/15 rounded-xl px-4 py-2">
              <span className="text-violet-200">用时 </span>
              <span className="font-bold">{Math.floor(result.timeUsed / 60)}分{result.timeUsed % 60}秒</span>
            </div>
          </div>
        </motion.div>

        {/* Knowledge Mastery */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
        >
          <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-violet-500" />
            知识掌握情况
          </h3>
          <div className="space-y-3">
            {result.knowledgeMastery.map((km) => (
              <div key={km.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700 dark:text-slate-300">{km.name}</span>
                  <span className={`font-semibold ${km.mastery >= 80 ? 'text-green-600' : km.mastery >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                    {km.mastery >= 80 ? '掌握' : km.mastery >= 60 ? '薄弱' : '需加强'} ({km.mastery}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${km.mastery}%` }}
                    transition={{ duration: 1 }}
                    className={`h-full rounded-full ${km.mastery >= 80 ? 'bg-green-500' : km.mastery >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Wrong Questions */}
        {result.wrongQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
          >
            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              错题解析
            </h3>
            <div className="space-y-4">
              {result.wrongQuestions.map((q, i) => (
                <div key={q.id} className="p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                  <p className="text-sm font-medium text-slate-800 dark:text-white mb-2">{i + 1}. {q.content}</p>
                  <p className="text-sm text-red-600 dark:text-red-400 mb-1">你的答案：{q.userAnswer || '未作答'}</p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-2">
                    正确答案：{Array.isArray(q.correctAnswer) ? q.correctAnswer.join(' / ') : q.correctAnswer}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 p-2 rounded-lg">{q.explanation}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
        >
          <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            学习建议
          </h3>
          <div className="space-y-2">
            {result.suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <ChevronRight className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                <span>{s}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex gap-3 justify-center pb-6">
          <Button onClick={() => setView('list')} variant="outline" className="rounded-xl">
            <RotateCcw className="w-4 h-4 mr-2" />
            再来一套
          </Button>
          <Button onClick={() => setCurrentPage('chat')} className="rounded-xl bg-violet-600 hover:bg-violet-700">
            <BookOpen className="w-4 h-4 mr-2" />
            针对薄弱点学习
          </Button>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 flex items-center justify-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-violet-500" />
          考试中心
        </h2>
        <p className="text-slate-500 dark:text-slate-400">智能组卷 · 多种模式 · AI批改 · 薄弱分析</p>
      </div>

      {/* Exam Modes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {examModes.map((mode, i) => {
          const Icon = mode.icon;
          return (
            <motion.div
              key={mode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => startExam(mode.id)}
              data-testid={`start-${mode.id}-exam`}
            >
              <div className={`w-12 h-12 rounded-xl ${mode.color} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white mb-1">{mode.label}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{mode.desc}</p>
              <Button className={`w-full rounded-xl ${mode.color} hover:opacity-90 text-white`}>
                <Play className="w-4 h-4 mr-2" />
                开始
              </Button>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Results */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
      >
        <h3 className="font-bold text-slate-800 dark:text-white mb-4">练习记录</h3>
        <div className="space-y-3">
          {[
            { subject: '数学', title: '一元二次方程单元练习', score: 85, total: 100, date: '2026-05-11', mode: '练习' },
            { subject: '英语', title: 'Unit 1 词汇测试', score: 92, total: 100, date: '2026-05-10', mode: '测验' },
            { subject: '物理', title: '欧姆定律专项练习', score: 78, total: 100, date: '2026-05-09', mode: '练习' },
          ].map((record, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-800 dark:text-white text-sm">{record.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{record.subject} · {record.mode} · {record.date}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-lg font-bold ${record.score >= 90 ? 'text-green-600' : record.score >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                  {record.score}
                </span>
                <span className="text-sm text-slate-400">/{record.total}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
