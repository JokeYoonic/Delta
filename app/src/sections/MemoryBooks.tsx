import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, Trash2, Edit3, Search, Tag,
  ChevronRight, FolderOpen, FileText, X, Save,
  Brain, Sparkles, Bookmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { memoryBooksApi } from '@/api';

interface MemoryBookItem {
  id: string;
  title: string;
  description: string;
  subject: string;
  is_public: boolean;
  created_at: string;
}

interface MemoryEntryItem {
  id: string;
  title: string;
  content: string;
  knowledge_points: string[];
  source: string;
  tags: string[];
  order: number;
}

export function MemoryBooks() {
  const [books, setBooks] = useState<MemoryBookItem[]>([]);
  const [selectedBook, setSelectedBook] = useState<MemoryBookItem | null>(null);
  const [entries, setEntries] = useState<MemoryEntryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewBook, setShowNewBook] = useState(false);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MemoryEntryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newBook, setNewBook] = useState({ title: '', description: '', subject: '' });
  const [newEntry, setNewEntry] = useState({ title: '', content: '', knowledge_points: '' as string, tags: '' as string });

  const loadBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await memoryBooksApi.list();
      setBooks(data as MemoryBookItem[]);
    } catch {
      setBooks([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const loadEntries = useCallback(async (bookId: string) => {
    try {
      const data = await memoryBooksApi.getEntries(bookId);
      setEntries(data as MemoryEntryItem[]);
    } catch {
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    if (selectedBook) {
      loadEntries(selectedBook.id);
    }
  }, [selectedBook, loadEntries]);

  const handleCreateBook = async () => {
    if (!newBook.title.trim()) return;
    try {
      await memoryBooksApi.create({
        title: newBook.title,
        description: newBook.description,
        subject: newBook.subject,
      });
      setNewBook({ title: '', description: '', subject: '' });
      setShowNewBook(false);
      loadBooks();
    } catch {}
  };

  const handleCreateEntry = async () => {
    if (!selectedBook || !newEntry.title.trim()) return;
    try {
      const kps = newEntry.knowledge_points
        .split(/[,，]/)
        .map(s => s.trim())
        .filter(Boolean);
      const tags = newEntry.tags
        .split(/[,，]/)
        .map(s => s.trim())
        .filter(Boolean);
      await memoryBooksApi.createEntry(selectedBook.id, {
        title: newEntry.title,
        content: newEntry.content,
        knowledge_points: kps,
        tags,
      });
      setNewEntry({ title: '', content: '', knowledge_points: '', tags: '' });
      setShowNewEntry(false);
      loadEntries(selectedBook.id);
    } catch {}
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!selectedBook) return;
    try {
      await memoryBooksApi.deleteEntry(selectedBook.id, entryId);
      loadEntries(selectedBook.id);
    } catch {}
  };

  const filteredEntries = entries.filter(e =>
    !searchQuery ||
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const subjectColors: Record<string, string> = {
    '数学': 'from-blue-500 to-cyan-500',
    '英语': 'from-violet-500 to-purple-500',
    '语文': 'from-amber-500 to-orange-500',
    '物理': 'from-emerald-500 to-teal-500',
    '化学': 'from-rose-500 to-pink-500',
  };

  return (
    <div className="h-full flex">
      {/* Books Sidebar */}
      <div className="w-72 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-violet-500" />
              知识笔记本
            </h2>
            <Button
              onClick={() => setShowNewBook(true)}
              size="sm"
              className="rounded-lg bg-violet-600 hover:bg-violet-700 text-white h-8 w-8 p-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索笔记..."
              className="pl-9 h-9 text-sm rounded-lg"
            />
          </div>
        </div>

        {showNewBook && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3 border-b border-slate-200 dark:border-slate-700 bg-violet-50 dark:bg-violet-900/20"
          >
            <Input
              value={newBook.title}
              onChange={e => setNewBook({ ...newBook, title: e.target.value })}
              placeholder="笔记本名称"
              className="h-8 text-sm mb-2"
            />
            <Input
              value={newBook.subject}
              onChange={e => setNewBook({ ...newBook, subject: e.target.value })}
              placeholder="科目（如数学、英语）"
              className="h-8 text-sm mb-2"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleCreateBook}
                size="sm"
                className="rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs flex-1"
              >
                创建
              </Button>
              <Button
                onClick={() => { setShowNewBook(false); setNewBook({ title: '', description: '', subject: '' }); }}
                size="sm"
                variant="outline"
                className="rounded-lg text-xs"
              >
                取消
              </Button>
            </div>
          </motion.div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {books.map(book => (
            <button
              key={book.id}
              onClick={() => setSelectedBook(book)}
              className={`w-full text-left p-3 rounded-xl text-sm transition-all mb-1 ${
                selectedBook?.id === book.id
                  ? 'bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${subjectColors[book.subject] || 'from-slate-400 to-slate-500'} flex items-center justify-center flex-shrink-0`}>
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 dark:text-white truncate">{book.title}</p>
                  <p className="text-xs text-slate-400">{book.subject || '未分类'}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </button>
          ))}
          {books.length === 0 && !isLoading && (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
              还没有笔记本
              <br />点击 + 创建第一个
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {!selectedBook ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">知识笔记本</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
              在这里整理你的学习笔记，记录重要知识点和解题思路。
              AI对话中涉及的知识点也会自动归档到这里。
            </p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">{selectedBook.title}</h2>
                <p className="text-xs text-slate-400">{entries.length} 条笔记 · {selectedBook.subject || '未分类'}</p>
              </div>
              <Button
                onClick={() => setShowNewEntry(true)}
                size="sm"
                className="rounded-lg bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1" /> 新增笔记
              </Button>
            </div>

            {showNewEntry && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 border-b border-slate-200 dark:border-slate-700 bg-violet-50/50 dark:bg-violet-900/10"
              >
                <div className="max-w-2xl mx-auto space-y-3">
                  <Input
                    value={newEntry.title}
                    onChange={e => setNewEntry({ ...newEntry, title: e.target.value })}
                    placeholder="笔记标题"
                    className="h-9"
                  />
                  <textarea
                    value={newEntry.content}
                    onChange={e => setNewEntry({ ...newEntry, content: e.target.value })}
                    placeholder="笔记内容...支持自由记录知识点、解题思路等"
                    rows={4}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <div className="flex gap-3">
                    <Input
                      value={newEntry.knowledge_points}
                      onChange={e => setNewEntry({ ...newEntry, knowledge_points: e.target.value })}
                      placeholder="知识点（逗号分隔）"
                      className="h-8 text-sm flex-1"
                    />
                    <Input
                      value={newEntry.tags}
                      onChange={e => setNewEntry({ ...newEntry, tags: e.target.value })}
                      placeholder="标签（逗号分隔）"
                      className="h-8 text-sm flex-1"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      onClick={() => { setShowNewEntry(false); setNewEntry({ title: '', content: '', knowledge_points: '', tags: '' }); }}
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                    >
                      取消
                    </Button>
                    <Button
                      onClick={handleCreateEntry}
                      size="sm"
                      className="rounded-lg bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      <Save className="w-3 h-3 mr-1" /> 保存
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-2xl mx-auto space-y-3">
                <AnimatePresence>
                  {filteredEntries.map(entry => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-violet-500 flex-shrink-0" />
                          <h3 className="font-medium text-slate-800 dark:text-white">{entry.title}</h3>
                        </div>
                        <div className="flex items-center gap-1">
                          {entry.source === 'ai' && (
                            <span className="px-1.5 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/30 text-[10px] text-violet-600 dark:text-violet-400 flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" /> AI生成
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {entry.content && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap mb-2 leading-relaxed">
                          {entry.content}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {entry.knowledge_points?.map((kp, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-[10px] text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                            {kp}
                          </span>
                        ))}
                        {entry.tags?.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-700 text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                            <Tag className="w-2 h-2" />{tag}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredEntries.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    {searchQuery ? '没有匹配的笔记' : '还没有笔记，点击上方按钮添加'}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
