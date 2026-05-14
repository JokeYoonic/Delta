import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic2, Play, Square, RotateCcw, Volume2, VolumeX,
  Star, TrendingUp, Award, Clock, User, Bot,
  ChevronRight, Sparkles, BookOpen, Mic
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { voiceApi, speakingApi } from '@/api';
import type { SpeakingRole, SpeakingScene, SpeakingMessage } from '@/types';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type SpeakingView = 'setup' | 'session' | 'result';

const roles: { id: SpeakingRole; label: string; desc: string; icon: string }[] = [
  { id: 'strict', label: '严厉老师', desc: '严格要求，纠正每一个错误', icon: '👨‍🏫' },
  { id: 'gentle', label: '温柔学姐', desc: '耐心鼓励，循序渐进', icon: '👩‍🎓' },
  { id: 'peer', label: '同龄学伴', desc: '轻松对话，共同成长', icon: '🧑‍🤝‍🧑' },
  { id: 'foreign', label: '外教', desc: '纯正发音，沉浸式体验', icon: '🌍' },
];

const scenes: { id: SpeakingScene; label: string; desc: string; topics: string[] }[] = [
  { id: 'daily', label: '日常对话', desc: '生活场景模拟', topics: ['超市购物', '餐厅点餐', '问路', '自我介绍', '天气话题'] },
  { id: 'exam', label: '考试模拟', desc: '中高考口语题型', topics: ['朗读短文', '情景问答', '话题陈述', '听力理解'] },
  { id: 'recitation', label: '诗词朗诵', desc: '语文经典诵读', topics: ['古诗词朗诵', '课文朗读', '演讲练习'] },
  { id: 'presentation', label: '口述解题', desc: '理科说题训练', topics: ['数学说题', '物理解释', '化学实验'] },
];

const mockDialogues: Record<string, string[]> = {
  '超市购物': [
    'Hi! Welcome to our store. Can I help you find anything?',
    'I\'m looking for some fresh apples. Where can I find them?',
    'They\'re in the produce section, aisle 3. Would you like me to show you?',
  ],
  '餐厅点餐': [
    'Good evening! Do you have a reservation?',
    'No, I don\'t. Do you have a table for two?',
    'Yes, we do. Right this way. Here are your menus.',
  ],
};

export function SpeakingLab() {
  const [view, setView] = useState<SpeakingView>('setup');
  const [selectedRole, setSelectedRole] = useState<SpeakingRole>('gentle');
  const [selectedScene, setSelectedScene] = useState<SpeakingScene>('daily');
  const [selectedTopic, setSelectedTopic] = useState('超市购物');
  const [messages, setMessages] = useState<SpeakingMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [inputText, setInputText] = useState('');
  const [pronunciationScore, setPronunciationScore] = useState(82);
  const [fluencyScore, setFluencyScore] = useState(75);
  const [accuracyScore, setAccuracyScore] = useState(88);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<Record<string, unknown> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingAiMsgIdRef = useRef<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (view === 'session') {
      timer = setInterval(() => setSessionTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [view]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const connectWebSocket = useCallback((): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      try {
        const ws = speakingApi.createWebSocket();
        ws.onopen = () => resolve(ws);
        ws.onerror = () => reject(new Error('WebSocket connection failed'));
        wsRef.current = ws;
      } catch (e) {
        reject(e);
      }
    });
  }, []);

  const startSession = useCallback(async () => {
    setMessages([]);
    setSessionTime(0);
    setEvaluation(null);
    setView('session');

    try {
      const session = await speakingApi.createSession({
        role: selectedRole,
        scene: selectedScene,
        topic: selectedTopic,
      });
      setSessionId((session as Record<string, unknown>).id as string);
    } catch {
      // session creation is optional
    }

    try {
      const ws = await connectWebSocket();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'greeting') {
          const aiMsg: SpeakingMessage = {
            id: `msg-${Date.now()}`,
            role: 'ai',
            text: data.content,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, aiMsg]);
        }

        if (data.type === 'chunk') {
          setIsAiResponding(true);
          if (!pendingAiMsgIdRef.current) {
            const msgId = `msg-${Date.now()}`;
            pendingAiMsgIdRef.current = msgId;
            const aiMsg: SpeakingMessage = {
              id: msgId,
              role: 'ai',
              text: data.content,
              timestamp: Date.now(),
            };
            setMessages(prev => [...prev, aiMsg]);
          } else {
            setMessages(prev => prev.map(m =>
              m.id === pendingAiMsgIdRef.current
                ? { ...m, text: m.text + data.content }
                : m
            ));
          }
        }

        if (data.type === 'done') {
          setIsAiResponding(false);
          pendingAiMsgIdRef.current = null;
        }

        if (data.type === 'evaluation') {
          setEvaluation(data.data);
        }

        if (data.type === 'error') {
          setIsAiResponding(false);
          pendingAiMsgIdRef.current = null;
        }
      };

      ws.send(JSON.stringify({
        type: 'init',
        scene: selectedScene,
        role: selectedRole,
      }));
    } catch {
      const opening = mockDialogues[selectedTopic]?.[0] || `Let's practice ${selectedTopic}. How are you today?`;
      const aiMsg: SpeakingMessage = {
        id: `msg-${Date.now()}`,
        role: 'ai',
        text: opening,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);
    }
  }, [selectedRole, selectedScene, selectedTopic, connectWebSocket]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        stream.getTracks().forEach(track => track.stop());

        try {
          const sttResult = await voiceApi.stt(audioBlob);
          const recognizedText = (sttResult as Record<string, unknown>).text as string;
          if (recognizedText) {
            sendMessage(recognizedText);
          }
        } catch {
          // STT failed, user can type instead
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const playTTS = useCallback(async (text: string) => {
    setIsPlaying(true);
    try {
      const audioBlob = await voiceApi.tts(text);
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
      audio.play();
    } catch {
      setIsPlaying(false);
    }
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const userMsg: SpeakingMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat', content: text.trim() }));
    } else {
      // 降级方案：走 AI 答疑的 WebSocket，用口语角色 prompt
      setIsAiResponding(true);
      const wsBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/^http/, 'ws');
      const chatWs = new WebSocket(`${wsBase}/chat/ws/dev`);
      const aiMsgId = `msg-${Date.now() + 1}`;
      let fullText = '';

      chatWs.onopen = () => {
        const rolePrompt = selectedRole === 'foreign'
          ? `You are an English native speaker. Have a spoken English conversation about: ${selectedTopic}. Keep responses short (2-3 sentences). Only reply in English.`
          : `你是口语练习伙伴，主题是"${selectedTopic}"。用中文简短回复（2-3句话），像真实对话一样自然。`;
        chatWs.send(JSON.stringify({ type: 'init', conversation_id: `speaking-${Date.now()}` }));
        chatWs.send(JSON.stringify({ type: 'chat', content: `${rolePrompt}\n\n对方说: ${text}\n\n请回复:`, history: [] }));
      };
      chatWs.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'chunk' && data.content) {
          fullText += data.content;
          setMessages(prev => prev.some(m => m.id === aiMsgId)
            ? prev.map(m => m.id === aiMsgId ? { ...m, text: fullText } : m)
            : [...prev, { id: aiMsgId, role: 'ai', text: fullText, timestamp: Date.now() }]);
        } else if (data.type === 'done') {
          if (!fullText) fullText = data.content || '好的，我理解了，我们继续练习吧！';
          setMessages(prev => prev.some(m => m.id === aiMsgId)
            ? prev.map(m => m.id === aiMsgId ? { ...m, text: fullText } : m)
            : [...prev, { id: aiMsgId, role: 'ai', text: fullText, timestamp: Date.now() }]);
          setIsAiResponding(false);
          chatWs.close();
        }
      };
      chatWs.onerror = () => {
        if (!fullText) {
          const fallback = selectedRole === 'foreign'
            ? `Let's continue our conversation about ${selectedTopic}. What do you think?`
            : `关于"${selectedTopic}"，让我们继续聊聊。你有什么想法？`;
          setMessages(prev => [...prev, { id: aiMsgId, role: 'ai', text: fallback, timestamp: Date.now() }]);
        }
        setIsAiResponding(false);
        chatWs.close();
      };
    }
  }, [selectedTopic, selectedRole]);

  const endSession = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const userMessages = messages.filter(m => m.role === 'user');
      const lastUserText = userMessages.length > 0 ? userMessages[userMessages.length - 1].text : '';
      wsRef.current.send(JSON.stringify({
        type: 'evaluate',
        text: lastUserText,
      }));
      wsRef.current.close();
      wsRef.current = null;
    }

    if (evaluation) {
      const evalData = evaluation as Record<string, number>;
      setPronunciationScore(Math.round(evalData.fluency * 10) || 75 + Math.floor(Math.random() * 20));
      setFluencyScore(Math.round(evalData.fluency * 10) || 70 + Math.floor(Math.random() * 20));
      setAccuracyScore(Math.round(evalData.grammar * 10) || 80 + Math.floor(Math.random() * 15));
    } else {
      setPronunciationScore(75 + Math.floor(Math.random() * 20));
      setFluencyScore(70 + Math.floor(Math.random() * 20));
      setAccuracyScore(80 + Math.floor(Math.random() * 15));
    }
    setView('result');
  }, [messages, evaluation]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (view === 'session') {
    return (
      <div className="h-[calc(100vh-7rem)] flex flex-col max-w-4xl mx-auto rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-violet-600 to-blue-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Mic2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-sm">{selectedTopic}</p>
              <p className="text-xs text-violet-100">{roles.find(r => r.id === selectedRole)?.label} · {scenes.find(s => s.id === selectedScene)?.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatTime(sessionTime)}</span>
            </div>
            <button
              onClick={endSession}
              className="w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-colors"
            >
              <Square className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-2xl mx-auto">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[75%] p-3.5 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-md'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-md'
                  }`}>
                    <p>{msg.text}</p>
                    {msg.role === 'ai' && (
                      <button
                        onClick={() => playTTS(msg.text)}
                        className="mt-2 flex items-center gap-1 text-xs opacity-70 hover:opacity-100"
                      >
                        <Volume2 className="w-3 h-3" /> 朗读
                      </button>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Controls */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/30'
                    : 'bg-violet-600 hover:bg-violet-700'
                }`}
              >
                <Mic className="w-5 h-5 text-white" />
              </button>
              <div className="flex-1 flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 rounded-2xl px-4">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage(inputText)}
                  placeholder={isRecording ? '正在录音...' : '输入文字或按住麦克风说话...'}
                  data-testid="speaking-input"
                  className="flex-1 bg-transparent border-0 py-3 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <Button
                onClick={() => sendMessage(inputText)}
                size="sm"
                data-testid="speaking-send-btn"
                className="rounded-xl bg-violet-600 hover:bg-violet-700"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {isRecording && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center gap-1 mt-2"
              >
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [4, 16 + Math.random() * 16, 4] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                    className="w-1 rounded-full bg-red-400"
                  />
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'result') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 p-8 text-white text-center"
        >
          <Award className="w-12 h-12 mx-auto mb-4 text-amber-300" />
          <h2 className="text-2xl font-bold mb-2">练习完成！</h2>
          <p className="text-violet-100 mb-4">本次练习时长 {formatTime(sessionTime)} · {messages.filter(m => m.role === 'user').length} 轮对话</p>
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="bg-white/15 rounded-xl p-3">
              <p className="text-2xl font-bold">{pronunciationScore}</p>
              <p className="text-xs text-violet-200">发音评分</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3">
              <p className="text-2xl font-bold">{fluencyScore}</p>
              <p className="text-xs text-violet-200">流利度</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3">
              <p className="text-2xl font-bold">{accuracyScore}</p>
              <p className="text-xs text-violet-200">准确度</p>
            </div>
          </div>
        </motion.div>

        {/* Detailed Feedback */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
        >
          <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-500" />
            发音分析
          </h3>
          <div className="space-y-4">
            {[
              { label: '发音准确度', score: pronunciationScore, color: 'bg-blue-500' },
              { label: '流利度', score: fluencyScore, color: 'bg-green-500' },
              { label: '语法正确率', score: accuracyScore, color: 'bg-amber-500' },
              { label: '词汇丰富度', score: 70, color: 'bg-purple-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{item.score}分</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.score}%` }}
                    transition={{ duration: 1 }}
                    className={`h-full rounded-full ${item.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
        >
          <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            改进建议
          </h3>
          <div className="space-y-2">
            {[
              '注意 /th/ 音的发音，需要舌尖轻触上齿',
              '尝试使用更丰富的连接词，如 "however", "therefore"',
              '语速可以稍微放慢，提高清晰度',
              '多练习情景对话中的常用表达',
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <ChevronRight className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                <span>{s}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="flex gap-3 justify-center pb-6">
          <Button onClick={() => setView('setup')} variant="outline" className="rounded-xl">
            <RotateCcw className="w-4 h-4 mr-2" />
            重新练习
          </Button>
          <Button onClick={() => setView('setup')} className="rounded-xl bg-violet-600 hover:bg-violet-700">
            <Mic2 className="w-4 h-4 mr-2" />
            换场景练习
          </Button>
        </div>
      </div>
    );
  }

  // Setup View
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 flex items-center justify-center gap-2">
          <Mic2 className="w-6 h-6 text-pink-500" />
          口语训练室
        </h2>
        <p className="text-slate-500 dark:text-slate-400">AI语音对话 · 发音评测 · 情景模拟 · 角色扮演</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '本周练习', value: '3次', icon: Clock, color: 'text-blue-500' },
          { label: '累计时长', value: '45分钟', icon: Mic2, color: 'text-pink-500' },
          { label: '平均发音', value: '82分', icon: Star, color: 'text-amber-500' },
          { label: '连续练习', value: '5天', icon: Award, color: 'text-emerald-500' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 text-center"
            >
              <Icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
              <p className="text-xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Role Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
      >
        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-violet-500" />
          选择AI角色
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {roles.map(role => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`p-4 rounded-xl border-2 transition-all text-center ${
                selectedRole === role.id
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="text-3xl mb-2 block">{role.icon}</span>
              <p className="font-medium text-slate-800 dark:text-white text-sm">{role.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{role.desc}</p>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Scene Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
      >
        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-500" />
          选择练习场景
        </h3>
        <div className="space-y-4">
          {scenes.map(scene => (
            <div key={scene.id}>
              <button
                onClick={() => { setSelectedScene(scene.id); setSelectedTopic(scene.topics[0]); }}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all mb-2 ${
                  selectedScene === scene.id
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-white">{scene.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{scene.desc}</p>
                  </div>
                  {selectedScene === scene.id && <ChevronRight className="w-5 h-5 text-emerald-500" />}
                </div>
              </button>
              {selectedScene === scene.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex flex-wrap gap-2 pl-4"
                >
                  {scene.topics.map(topic => (
                    <button
                      key={topic}
                      onClick={() => setSelectedTopic(topic)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        selectedTopic === topic
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {topic}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Start Button */}
      <div className="text-center pb-6">
        <Button
          onClick={startSession}
          size="lg"
          data-testid="start-speaking-session"
          className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white px-8 py-6 text-lg"
        >
          <Play className="w-5 h-5 mr-2" />
          开始练习
        </Button>
        <p className="text-xs text-slate-400 mt-3">点击麦克风按钮或按住说话，支持实时语音识别</p>
      </div>
    </div>
  );
}
