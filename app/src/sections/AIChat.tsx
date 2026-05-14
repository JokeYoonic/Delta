import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Image, Mic, Paperclip, Sparkles, User, Bot, BookOpen,
  Lightbulb, HelpCircle, ThumbsUp, ThumbsDown,
  Copy, Check, Wand2, Camera, Users, Settings2, Calculator,
  Atom, Globe, FlaskConical, Leaf, Scroll, LandPlot, BookmarkPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { conversationApi, ocrApi, agentsApi, tutorApi, ragApi, memoryBooksApi } from '@/api';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import type { ChatMessage, RAGSource } from '@/types';

const agentRoles = [
  { role: 'gentle', name: '温柔学姐', icon: '👩‍🎓', desc: '耐心鼓励，循序渐进' },
  { role: 'strict', name: '严厉老师', icon: '👨‍🏫', desc: '严格要求，精准纠错' },
  { role: 'peer', name: '同龄学伴', icon: '🧑‍🤝‍🧑', desc: '轻松讨论，共同探索' },
  { role: 'foreign', name: '外教', icon: '🌍', desc: '全英对话，文化拓展' },
];

const depthOptions = [
  { value: 1, label: '极简', desc: '仅结论' },
  { value: 2, label: '简要', desc: '结论+推理' },
  { value: 3, label: '标准', desc: '推理+类比' },
  { value: 4, label: '详细', desc: '多角度+反例' },
  { value: 5, label: '深度', desc: '深度推导+边界' },
];

const learningStyleOptions = [
  { value: 'visual', label: '视觉型', icon: '👁️' },
  { value: 'auditory', label: '听觉型', icon: '👂' },
  { value: 'kinesthetic', label: '动觉型', icon: '✋' },
  { value: 'reading', label: '阅读型', icon: '📖' },
];

const commStyleOptions = [
  { value: 'socratic', label: '苏格拉底式', desc: '提问引导' },
  { value: 'direct', label: '直接式', desc: '清晰解释' },
  { value: 'storytelling', label: '故事式', desc: '场景包装' },
];

const subjects = [
  { id: 'math', name: '数学', icon: Calculator, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'chinese', name: '语文', icon: Scroll, color: 'text-red-600 bg-red-50 border-red-200' },
  { id: 'english', name: '英语', icon: Globe, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'physics', name: '物理', icon: Atom, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'chemistry', name: '化学', icon: FlaskConical, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { id: 'biology', name: '生物', icon: Leaf, color: 'text-green-600 bg-green-50 border-green-200' },
  { id: 'history', name: '历史', icon: LandPlot, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'geography', name: '地理', icon: Globe, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  { id: 'politics', name: '政治', icon: BookOpen, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
];

const suggestions = [
  { icon: HelpCircle, text: '一元二次方程的求根公式是什么？' },
  { icon: BookOpen, text: '帮我讲解一下Unit 1的语法重点' },
  { icon: Lightbulb, text: '给我一个物理欧姆定律的例题' },
  { icon: Wand2, text: '检查我的作文：The Importance of...' },
];

export function AIChat() {
  const { currentConversation, createConversation, createConversationAsync, addMessage, setIsTyping, isTyping, setCurrentConversation } = useStore();
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingSources, setStreamingSources] = useState<RAGSource[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [showTutorConfig, setShowTutorConfig] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [tutorConfig, setTutorConfig] = useState({
    depth: 3,
    learning_style: 'visual',
    communication_style: 'socratic',
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage: wsSendMessage, connect, disconnect, isStreaming } = useStreamingChat();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    if (!currentConversation) {
      createConversation('数学');
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages, isTyping, streamingContent]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
      type: 'text',
    };

    addMessage(userMsg);
    const msgContent = input.trim();
    setInput('');
    setIsTyping(true);
    setStreamingContent('');
    setStreamingSources([]);

    try {
      let conv = currentConversation;
      if (!conv) {
        conv = createConversation('数学');
      }

      const aiMsgId = `msg-${Date.now() + 1}`;
      let fullContent = '';

      await new Promise<void>((resolve, reject) => {
        const wsBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/^http/, 'ws');
        const ws = new WebSocket(`${wsBase}/chat/ws/dev`);

        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: 'init',
            conversation_id: conv!.id,
            subject: conv?.subject || '',
            ...(selectedAgent ? { agent_role: selectedAgent } : {}),
            tutor_config: tutorConfig,
          }));
          ws.send(JSON.stringify({
            type: 'chat',
            content: msgContent,
            conversation_id: conv!.id,
            subject: conv?.subject || '',
            history: conv!.messages.map(m => ({ role: m.role, content: m.content })),
            ...(selectedAgent ? { agent_role: selectedAgent } : {}),
            tutor_config: tutorConfig,
          }));
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'chunk' && data.content) {
            fullContent += data.content;
            setStreamingContent(fullContent);
          } else if (data.type === 'done') {
            const content = data.content || fullContent;
            const aiMsg: ChatMessage = {
              id: aiMsgId,
              role: 'assistant',
              content,
              timestamp: Date.now(),
              type: 'text',
              ragSources: data.data?.rag_sources || [],
            };
            addMessage(aiMsg);
            // 保存到后端
            if (conv && conv.id) {
              conversationApi.addMessage(conv.id, { content: msgContent, message_type: 'text' }).catch(() => {});
              conversationApi.addMessage(conv.id, { content, message_type: 'text' }).catch(() => {});
            }
            // 自动错题检测：用户说不会/不懂/错了时收录到知识笔记
            const confusedKeywords = ['不会', '不懂', '不明白', '错了', '为什么错', '怎么做', '帮帮我', '太难了', '没听懂'];
            if (confusedKeywords.some(k => msgContent.includes(k))) {
              const noteTitle = msgContent.slice(0, 40);
              memoryBooksApi.list().then((books: any[]) => {
                const book = Array.isArray(books) && books.length > 0 ? books[0] : null;
                if (book && (book as any).id) {
                  memoryBooksApi.createEntry((book as any).id, {
                    title: noteTitle,
                    content: `**我的问题:** ${msgContent}\n\n**AI讲解:** ${content.slice(0, 500)}`,
                    tags: [conv?.subject || '数学', '错题'],
                  }).catch(() => {});
                }
              }).catch(() => {});
            }
            setStreamingContent('');
            setStreamingSources([]);
            setIsTyping(false);
            ws.close();
            resolve();
          } else if (data.type === 'error') {
            setIsTyping(false);
            setStreamingContent('');
            ws.close();
            reject(new Error(data.message || 'Stream error'));
          }
        };

        ws.onerror = () => {
          setIsTyping(false);
          setStreamingContent('');
          ws.close();
          reject(new Error('WebSocket connection error'));
        };

        setTimeout(() => {
          if (ws.readyState !== WebSocket.CLOSED) {
            ws.close();
          }
          resolve();
        }, 60000);
      });
    } catch {
      if (!streamingContent) {
        const fallbackMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: '抱歉，连接出现问题。请检查网络连接后重试。',
          timestamp: Date.now(),
          type: 'text',
        };
        addMessage(fallbackMsg);
      }
      setStreamingContent('');
      setIsTyping(false);
    }
  }, [input, isTyping, currentConversation, addMessage, setIsTyping, createConversation, streamingContent]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(',')[1];
      try {
        const result = await ocrApi.recognize(base64);
        if (result.text) {
          setInput(result.text);
        }
      } catch {
        setInput('图片识别失败，请手动输入题目');
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await ragApi.upload(file, 'delta-textbooks');
      // 上传成功提示——用一条系统消息提醒用户
      const sysMsg: ChatMessage = {
        id: `msg-upload-${Date.now()}`,
        role: 'assistant',
        content: `教材"${file.name}"已上传至知识库，AI 将基于此内容回答相关问题。`,
        timestamp: Date.now(),
        type: 'text',
      };
      addMessage(sysMsg);
    } catch {
      const errMsg: ChatMessage = {
        id: `msg-upload-err-${Date.now()}`,
        role: 'assistant',
        content: `上传"${file.name}"失败，请确认文件格式（支持 PDF/DOCX/TXT/MD）。`,
        timestamp: Date.now(),
        type: 'text',
      };
      addMessage(errMsg);
    }
    e.target.value = '';
  }, [addMessage]);

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
            onClick={() => setShowSubjectPicker(!showSubjectPicker)}
            className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            新建对话
          </Button>
          {showSubjectPicker && (
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {subjects.map(s => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      createConversationAsync(s.name);
                      setShowSubjectPicker(false);
                    }}
                    className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-xs border transition-all ${s.color} hover:scale-105`}
                  >
                    <Icon className="w-4 h-4" />
                    {s.name}
                  </button>
                );
              })}
            </div>
          )}
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
        <ScrollArea className="flex-1 min-h-0 p-4">
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
                          <button
                            onClick={() => {
                              memoryBooksApi.list().then((books: any[]) => {
                                const book = Array.isArray(books) && books.length > 0 ? books[0] : null;
                                const qMsg = currentConversation?.messages.find((m, i) =>
                                  i < currentConversation.messages.indexOf(msg) && m.role === 'user'
                                );
                                if (book && (book as any).id) {
                                  memoryBooksApi.createEntry((book as any).id, {
                                    title: (qMsg?.content || msg.content).slice(0, 40),
                                    content: qMsg
                                      ? `**问题:** ${qMsg.content}\n\n**回答:** ${msg.content.slice(0, 800)}`
                                      : msg.content.slice(0, 800),
                                    tags: [currentConversation?.subject || '通用', '收藏'],
                                  }).catch(() => {});
                                  // 轻提示
                                  const btn = document.activeElement as HTMLElement;
                                  const orig = btn?.title || '';
                                  btn?.setAttribute?.('title', '已收录!');
                                  setTimeout(() => btn?.setAttribute?.('title', orig), 1000);
                                }
                              }).catch(() => {});
                            }}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title="收录到知识笔记"
                          >
                            <BookmarkPlus className="w-3 h-3 text-amber-400" />
                          </button>
                        </div>
                      )}
                      {msg.role === 'assistant' && msg.ragSources && msg.ragSources.length > 0 && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-200/50 dark:border-slate-600/50">
                          <p className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                            <BookOpen className="w-2.5 h-2.5" /> 知识来源
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {msg.ragSources.map((src, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-[10px] text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800"
                                title={src.content_preview}
                              >
                                <BookOpen className="w-2 h-2" />
                                {src.document || `来源${idx + 1}`}
                                {src.similarity > 0 && (
                                  <span className="text-blue-400 dark:text-blue-500 ml-0.5">
                                    {Math.round(src.similarity * 100)}%
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
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

              {/* Typing Indicator / Streaming Content */}
              {isTyping && !streamingContent && (
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
              {isTyping && streamingContent && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="max-w-[80%] p-3.5 rounded-2xl rounded-bl-md bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
                    {renderMessageContent({ id: 'streaming', role: 'assistant', content: streamingContent, timestamp: Date.now(), type: 'text' })}
                    <span className="inline-block w-1.5 h-4 bg-violet-500 animate-pulse ml-0.5 align-text-bottom" />
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
            {showAgentPicker && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg"
              >
                <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                  <Users className="w-3 h-3" /> 选择AI教学角色
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {agentRoles.map((agent) => (
                    <button
                      key={agent.role}
                      onClick={() => {
                        setSelectedAgent(agent.role === selectedAgent ? '' : agent.role);
                        setShowAgentPicker(false);
                      }}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs transition-all ${
                        selectedAgent === agent.role
                          ? 'bg-violet-100 dark:bg-violet-900/30 border-2 border-violet-400 dark:border-violet-600'
                          : 'bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:border-violet-300'
                      }`}
                    >
                      <span className="text-lg">{agent.icon}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{agent.name}</span>
                      <span className="text-slate-400 text-[10px]">{agent.desc}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
            {showTutorConfig && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <Settings2 className="w-3 h-3" /> 教学偏好设置
                  </p>
                  <button
                    onClick={() => setShowTutorConfig(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >✕</button>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5">讲解深度</p>
                    <div className="flex gap-1">
                      {depthOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setTutorConfig({ ...tutorConfig, depth: opt.value })}
                          className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] font-medium transition-all ${
                            tutorConfig.depth === opt.value
                              ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-600'
                              : 'bg-slate-50 dark:bg-slate-700/50 text-slate-500 border border-transparent hover:border-slate-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5">学习风格</p>
                    <div className="flex gap-1">
                      {learningStyleOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setTutorConfig({ ...tutorConfig, learning_style: opt.value })}
                          className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1 ${
                            tutorConfig.learning_style === opt.value
                              ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-600'
                              : 'bg-slate-50 dark:bg-slate-700/50 text-slate-500 border border-transparent hover:border-slate-200'
                          }`}
                        >
                          <span>{opt.icon}</span> {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5">沟通方式</p>
                    <div className="flex gap-1">
                      {commStyleOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setTutorConfig({ ...tutorConfig, communication_style: opt.value })}
                          className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] font-medium transition-all ${
                            tutorConfig.communication_style === opt.value
                              ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-600'
                              : 'bg-slate-50 dark:bg-slate-700/50 text-slate-500 border border-transparent hover:border-slate-200'
                          }`}
                        >
                          {opt.label}
                          <span className="block text-[8px] text-slate-400">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            <div className="flex items-end gap-2 bg-slate-100 dark:bg-slate-700/50 rounded-2xl p-2">
              <div className="flex gap-1">
                <button
                  onClick={() => setShowAgentPicker(!showAgentPicker)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                    selectedAgent
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600'
                      : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                  title="选择AI角色"
                >
                  <Users className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowTutorConfig(!showTutorConfig)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                    showTutorConfig
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600'
                      : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                  title="教学偏好设置"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
                <label className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-500 cursor-pointer">
                  <Camera className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                <button className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-500">
                  <Mic className="w-4 h-4" />
                </button>
                <label className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-500 cursor-pointer" title="上传教材文件">
                  <Paperclip className="w-4 h-4" />
                  <input type="file" accept=".pdf,.docx,.doc,.txt,.md" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedAgent
                    ? `${agentRoles.find(a => a.role === selectedAgent)?.name}模式 · 输入你的问题...`
                    : '输入你的问题，AI会通过引导帮你思考...'
                }
                rows={1}
                data-testid="chat-input"
                className="flex-1 bg-transparent border-0 resize-none py-2 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0 max-h-32"
                style={{ minHeight: '2rem' }}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                size="sm"
                data-testid="send-btn"
                className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-4 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-center text-xs text-slate-400">
                AI可能产生错误，关键知识点请以教材为准 · 支持 Shift+Enter 换行
              </p>
              {selectedAgent && (
                <span className="text-xs text-violet-500 flex items-center gap-1">
                  {agentRoles.find(a => a.role === selectedAgent)?.icon}
                  {agentRoles.find(a => a.role === selectedAgent)?.name}模式
                  <button
                    onClick={() => setSelectedAgent('')}
                    className="ml-1 text-slate-400 hover:text-slate-600"
                  >✕</button>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
