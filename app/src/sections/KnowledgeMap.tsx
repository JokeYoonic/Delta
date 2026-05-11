import { useState } from 'react';
import { useStore } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network, Search, ChevronRight, Target,
  BookOpen, Zap, TrendingUp, Award, Calculator, Atom, FlaskConical, Scroll
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const subjectIcons: Record<string, React.ElementType> = {
  math: Calculator,
  english: BookOpen,
  chinese: Scroll,
  physics: Atom,
  chemistry: FlaskConical,
};

export function KnowledgeMap() {
  const { subjects, setCurrentPage } = useStore();
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedKp, setExpandedKp] = useState<string | null>(null);

  const filteredKps = selectedSubject.chapters.flatMap(ch =>
    ch.knowledgePoints.filter(kp =>
      searchQuery === '' || kp.name.includes(searchQuery) || kp.description.includes(searchQuery)
    ).map(kp => ({ ...kp, chapterTitle: ch.title, chapterId: ch.id }))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center py-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 flex items-center justify-center gap-2">
          <Network className="w-6 h-6 text-cyan-500" />
          知识图谱
        </h2>
        <p className="text-slate-500 dark:text-slate-400">可视化学科知识结构 · 精准定位薄弱环节 · 智能推荐学习路径</p>
      </div>

      {/* Subject Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {subjects.map(subject => {
          const Icon = subjectIcons[subject.id] || BookOpen;
          const avgProgress = subject.chapters.reduce((a, ch) => a + ch.progress, 0) / subject.chapters.length;
          return (
            <button
              key={subject.id}
              onClick={() => { setSelectedSubject(subject); setSelectedChapter(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedSubject.id === subject.id
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {subject.name}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                selectedSubject.id === subject.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'
              }`}>
                {Math.round(avgProgress)}%
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Chapter List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white">章节列表</h3>
              <Badge variant="outline" className="text-violet-600 border-violet-300">
                {selectedSubject.chapters.length} 章
              </Badge>
            </div>
            <div className="space-y-2">
              {selectedSubject.chapters.map((chapter, i) => (
                <motion.button
                  key={chapter.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedChapter(selectedChapter === chapter.id ? null : chapter.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    selectedChapter === chapter.id
                      ? 'bg-violet-50 dark:bg-violet-900/20 border-2 border-violet-300 dark:border-violet-700'
                      : 'border-2 border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-800 dark:text-white">{chapter.title}</span>
                    <span className="text-xs text-slate-500">{chapter.progress}%</span>
                  </div>
                  <Progress value={chapter.progress} className="h-1.5 mb-1" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">{chapter.knowledgePoints.length} 个知识点</p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-violet-500" />
              知识点搜索
            </h3>
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索知识点..."
              className="rounded-xl"
            />
            {searchQuery && (
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                {filteredKps.map(kp => (
                  <button
                    key={kp.id}
                    onClick={() => { setSelectedChapter(kp.chapterId); setExpandedKp(kp.id); }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <p className="text-sm text-slate-700 dark:text-slate-200">{kp.name}</p>
                    <p className="text-xs text-slate-400">{kp.chapterTitle}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Knowledge Graph Visualization */}
        <div className="lg:col-span-2 space-y-4">
          {selectedChapter ? (
            (() => {
              const chapter = selectedSubject.chapters.find(ch => ch.id === selectedChapter);
              if (!chapter) return null;
              return (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={chapter.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">{chapter.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{chapter.description}</p>
                      </div>
                      <div className="text-right">
                        <Progress value={chapter.progress} className="w-32 h-2 mb-1" />
                        <span className="text-xs text-slate-500">{chapter.progress}% 完成</span>
                      </div>
                    </div>

                    {/* Knowledge Points Graph */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {chapter.knowledgePoints.map((kp, i) => (
                        <motion.button
                          key={kp.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.08 }}
                          onClick={() => setExpandedKp(expandedKp === kp.id ? null : kp.id)}
                          className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                            expandedKp === kp.id
                              ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 shadow-lg shadow-violet-500/10'
                              : kp.mastery >= 80
                                ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                                : kp.mastery >= 50
                                  ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10'
                                  : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={`text-xs ${
                              kp.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                              kp.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {kp.difficulty === 'easy' ? '基础' : kp.difficulty === 'medium' ? '中档' : '难题'}
                            </Badge>
                            <span className={`text-xs font-semibold ${
                              kp.mastery >= 80 ? 'text-green-600' : kp.mastery >= 50 ? 'text-amber-600' : 'text-red-600'
                            }`}>{kp.mastery}%</span>
                          </div>
                          <h4 className="font-medium text-slate-800 dark:text-white text-sm mb-1">{kp.name}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{kp.relatedQuestions} 道相关题</p>
                          <div className="mt-2 h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${kp.mastery}%` }}
                              transition={{ duration: 0.8, delay: i * 0.1 }}
                              className={`h-full rounded-full ${
                                kp.mastery >= 80 ? 'bg-green-500' : kp.mastery >= 50 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                            />
                          </div>

                          {expandedKp === kp.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700"
                            >
                              <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">{kp.description}</p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => { e.stopPropagation(); setCurrentPage('chat'); }}
                                  className="rounded-lg text-xs"
                                >
                                  <Zap className="w-3 h-3 mr-1" />
                                  问AI
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => { e.stopPropagation(); setCurrentPage('exam'); }}
                                  className="rounded-lg text-xs"
                                >
                                  <Target className="w-3 h-3 mr-1" />
                                  练习
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              );
            })()
          ) : (
            /* Overall Subject View */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
            >
              <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">
                {selectedSubject.name} - 知识总览
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: '总知识点', value: selectedSubject.chapters.reduce((a, c) => a + c.knowledgePoints.length, 0), icon: BookOpen, color: 'text-blue-500' },
                  { label: '已掌握', value: selectedSubject.chapters.reduce((a, c) => a + c.knowledgePoints.filter(kp => kp.mastery >= 80).length, 0), icon: Award, color: 'text-green-500' },
                  { label: '薄弱点', value: selectedSubject.chapters.reduce((a, c) => a + c.knowledgePoints.filter(kp => kp.mastery < 50).length, 0), icon: Target, color: 'text-red-500' },
                  { label: '总进度', value: `${Math.round(selectedSubject.chapters.reduce((a, c) => a + c.progress, 0) / selectedSubject.chapters.length)}%`, icon: TrendingUp, color: 'text-violet-500' },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                      <Icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
                      <p className="text-xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Chapter Progress Overview */}
              <div className="space-y-3">
                <h4 className="font-medium text-slate-800 dark:text-white text-sm">章节进度</h4>
                {selectedSubject.chapters.map((chapter) => (
                  <div key={chapter.id} className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedChapter(chapter.id)}
                      className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-violet-100 dark:bg-violet-900/20">
                        <BookOpen className="w-5 h-5 text-violet-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{chapter.title}</span>
                          <span className="text-xs text-slate-500">{chapter.progress}%</span>
                        </div>
                        <Progress value={chapter.progress} className="h-1.5" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
