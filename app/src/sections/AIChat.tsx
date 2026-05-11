import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Image, Mic, Paperclip, Sparkles, User, Bot, BookOpen,
  Lightbulb, HelpCircle, ThumbsUp, ThumbsDown,
  Copy, Check, Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessage } from '@/types';

const suggestions = [
  { icon: HelpCircle, text: '一元二次方程的求根公式是什么？' },
  { icon: BookOpen, text: '帮我讲解一下Unit 1的语法重点' },
  { icon: Lightbulb, text: '给我一个物理欧姆定律的例题' },
  { icon: Wand2, text: '检查我的作文：The Importance of...' },
];

const mockAIResponse = (userMsg: string): string => {
  const responses: Record<string, string> = {
    '一元二次方程': '一元二次方程的标准形式是 **ax² + bx + c = 0**（a≠0）。\n\n求根公式为：\n**x = (-b ± √(b²-4ac)) / 2a**\n\n其中：\n- **b²-4ac > 0**：方程有两个不相等的实数根\n- **b²-4ac = 0**：方程有两个相等的实数根\n- **b²-4ac < 0**：方程没有实数根\n\n你想通过什么方法来深入理解这个知识点呢？我可以给你出几道练习题。',
    '求根公式': '求根公式是解一元二次方程的万能方法：\n\n**x = (-b ± √(b²-4ac)) / 2a**\n\n让我用一个例子来说明：\n\n解方程：2x² - 4x - 6 = 0\n\n这里 a=2, b=-4, c=-6\n\n代入公式：\nx = (4 ± √(16+48)) / 4\nx = (4 ± √64) / 4\nx = (4 ± 8) / 4\n\n所以 x₁ = 3, x₂ = -1\n\n你想自己试试解一道类似的题目吗？',
  };

  for (const [key, value] of Object.entries(responses)) {
    if (userMsg.includes(key)) return value;
  }

  return `好的，我来帮你分析这个问题。\n\n**问题理解**：${userMsg}\n\n让我用苏格拉底式引导法来帮助你：\n\n1️⃣ **首先**，你能告诉我这个问题涉及哪个知识点吗？\n\n2️⃣ **其次**，你还记得相关的公式或定理吗？\n\n3️⃣ **最后**，试着一步步分析，我来看看你的思路。\n\n不用担心答错，学习就是一个不断试错的过程！你想从哪个角度开始思考呢？`;
};

export function AIChat() {
  const { currentConversation, createConversation, addMessage, setIsTyping, isTyping } = useStore();
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!currentConversation) {
      createConversation('数学');
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages, isTyping]);

  const handleSend = () => {
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
      type: 'text',
    };

    addMessage(userMsg);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: mockAIResponse(userMsg.content),
        timestamp: Date.now(),
        type: 'text',
      };
      addMessage(aiMsg);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderMessageContent = (msg: ChatMessage) => {
    const parts = msg.content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-slate-800 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.includes('\n')) {
        return part.split('\n').map((line, j) => (
          <span key={`${i}-${j}`}>
            {line}
            {j < part.split('\n').length - 1 && <br />}
          </span>
        ));
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Sidebar: Conversation History */}
      <div className="hidden lg:flex w-64 border-r border-slate-200 dark:border-slate-700 flex-col bg-slate-50/50 dark:bg-slate-900/50">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <Button
            onClick={() => createConversation('数学')}
            className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            新建对话
          </Button>
        </div>
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {useStore.getState().conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => useStore.getState().setCurrentConversation(conv)}
                className={`w-full text-left p-3 rounded-xl text-sm transition-colors ${
                  currentConversation?.id === conv.id
                    ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <p className="font-medium truncate">{conv.title}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {conv.messages.length} 条消息 · {conv.subject}
                </p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {!currentConversation?.messages.length ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">有什么我可以帮你的？</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                支持文字提问、拍照搜题、苏格拉底式引导教学。我会通过引导而非直接给答案的方式帮助你独立思考。
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                {suggestions.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => { setInput(s.text); inputRef.current?.focus(); }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700 transition-all text-left"
                    >
                      <Icon className="w-5 h-5 text-violet-500 flex-shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-200">{s.text}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              <AnimatePresence>
                {currentConversation.messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`group max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                      <div
                        className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-violet-600 text-white rounded-br-md'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-md'
                        }`}
                      >
                        {renderMessageContent(msg)}
                      </div>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title="复制"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                          <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="有用">
                            <ThumbsUp className="w-3 h-3 text-slate-400" />
                          </button>
                          <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="无用">
                            <ThumbsDown className="w-3 h-3 text-slate-400" />
                          </button>
                        </div>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                        className="w-2 h-2 rounded-full bg-slate-400"
                      />
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                        className="w-2 h-2 rounded-full bg-slate-400"
                      />
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                        className="w-2 h-2 rounded-full bg-slate-400"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 bg-slate-100 dark:bg-slate-700/50 rounded-2xl p-2">
              <div className="flex gap-1">
                <button className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-500">
                  <Image className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-500">
                  <Mic className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-500">
                  <Paperclip className="w-4 h-4" />
                </button>
              </div>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的问题，AI会通过引导帮你思考..."
                rows={1}
                className="flex-1 bg-transparent border-0 resize-none py-2 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0 max-h-32"
                style={{ minHeight: '2rem' }}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                size="sm"
                className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-4 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-center text-xs text-slate-400 mt-2">
              AI可能产生错误，关键知识点请以教材为准 · 支持 Shift+Enter 换行
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
