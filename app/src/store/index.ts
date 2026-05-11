import { create } from 'zustand';
import type {
  User, Conversation, Exam, ExamResult, SpeakingSession,
  Subject, StudyReport, ParentDashboard, TutorConfig, ChatMessage
} from '@/types';

interface AppState {
  // User
  user: User | null;
  setUser: (user: User | null) => void;

  // Navigation
  currentPage: string;
  setCurrentPage: (page: string) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // AI Tutor
  conversations: Conversation[];
  currentConversation: Conversation | null;
  tutorConfig: TutorConfig;
  isTyping: boolean;
  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversation: (conv: Conversation | null) => void;
  addMessage: (message: ChatMessage) => void;
  setTutorConfig: (config: TutorConfig) => void;
  setIsTyping: (typing: boolean) => void;
  createConversation: (subject: string) => Conversation;

  // Exam
  currentExam: Exam | null;
  examResults: ExamResult[];
  setCurrentExam: (exam: Exam | null) => void;
  submitExam: (result: ExamResult) => void;

  // Speaking
  speakingSession: SpeakingSession | null;
  setSpeakingSession: (session: SpeakingSession | null) => void;

  // Subjects
  subjects: Subject[];
  setSubjects: (subjects: Subject[]) => void;

  // Reports
  studyReport: StudyReport | null;
  setStudyReport: (report: StudyReport) => void;

  // Parent
  parentDashboard: ParentDashboard | null;
  setParentDashboard: (dashboard: ParentDashboard) => void;

  // UI
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const defaultTutorConfig: TutorConfig = {
  depth: 3,
  learningStyle: 'visual',
  communicationStyle: 'socratic',
  toneStyle: 'friendly',
  reasoningFramework: 'deductive',
  language: 'zh-CN',
  useEmojis: true,
};

const mockSubjects: Subject[] = [
  {
    id: 'math',
    name: '数学',
    icon: 'Calculator',
    color: '#4F46E5',
    chapters: [
      {
        id: 'math-9-1',
        title: '一元二次方程',
        description: '掌握一元二次方程的解法及应用',
        completed: false,
        progress: 65,
        knowledgePoints: [
          { id: 'kp-1', name: '直接开平方法', description: '利用平方根定义解方程', difficulty: 'easy', mastery: 80, relatedQuestions: 12 },
          { id: 'kp-2', name: '配方法', description: '通过配方将方程化为完全平方', difficulty: 'medium', mastery: 60, relatedQuestions: 15 },
          { id: 'kp-3', name: '公式法（求根公式）', description: 'x=(-b±√(b²-4ac))/2a', difficulty: 'medium', mastery: 70, relatedQuestions: 20 },
          { id: 'kp-4', name: '因式分解法', description: '将方程左边分解为两个一次因式', difficulty: 'medium', mastery: 55, relatedQuestions: 18 },
          { id: 'kp-5', name: '根的判别式', description: 'Δ=b²-4ac判断根的情况', difficulty: 'hard', mastery: 45, relatedQuestions: 15 },
          { id: 'kp-6', name: '韦达定理', description: '根与系数的关系', difficulty: 'hard', mastery: 40, relatedQuestions: 12 },
        ],
      },
      {
        id: 'math-9-2',
        title: '二次函数',
        description: '理解二次函数的图像与性质',
        completed: false,
        progress: 30,
        knowledgePoints: [
          { id: 'kp-7', name: '二次函数定义', description: 'y=ax²+bx+c的形式', difficulty: 'easy', mastery: 90, relatedQuestions: 10 },
          { id: 'kp-8', name: '图像与性质', description: '抛物线的开口、对称轴、顶点', difficulty: 'medium', mastery: 50, relatedQuestions: 15 },
          { id: 'kp-9', name: '顶点式', description: 'y=a(x-h)²+k的应用', difficulty: 'medium', mastery: 35, relatedQuestions: 12 },
        ],
      },
    ],
  },
  {
    id: 'english',
    name: '英语',
    icon: 'BookOpen',
    color: '#059669',
    chapters: [
      {
        id: 'eng-9-1',
        title: 'Unit 1: How can we become good learners?',
        description: '学习英语方法和策略',
        completed: false,
        progress: 45,
        knowledgePoints: [
          { id: 'kp-10', name: 'by + doing 结构', description: '通过某种方式', difficulty: 'easy', mastery: 75, relatedQuestions: 10 },
          { id: 'kp-11', name: '宾语从句', description: 'that引导的宾语从句', difficulty: 'medium', mastery: 55, relatedQuestions: 15 },
          { id: 'kp-12', name: 'used to 用法', description: '过去常常做某事', difficulty: 'medium', mastery: 60, relatedQuestions: 12 },
        ],
      },
    ],
  },
  {
    id: 'chinese',
    name: '语文',
    icon: 'Scroll',
    color: '#DC2626',
    chapters: [
      {
        id: 'cn-9-1',
        title: '古诗词鉴赏',
        description: '理解古诗词的意境与表达技巧',
        completed: false,
        progress: 50,
        knowledgePoints: [
          { id: 'kp-13', name: '意象分析', description: '理解诗词中的意象', difficulty: 'medium', mastery: 65, relatedQuestions: 8 },
          { id: 'kp-14', name: '修辞手法', description: '比喻、拟人、夸张等', difficulty: 'easy', mastery: 80, relatedQuestions: 10 },
        ],
      },
    ],
  },
  {
    id: 'physics',
    name: '物理',
    icon: 'Atom',
    color: '#7C3AED',
    chapters: [
      {
        id: 'phy-9-1',
        title: '电学基础',
        description: '电流、电压、电阻的关系',
        completed: false,
        progress: 20,
        knowledgePoints: [
          { id: 'kp-15', name: '欧姆定律', description: 'I=U/R', difficulty: 'medium', mastery: 50, relatedQuestions: 15 },
          { id: 'kp-16', name: '串联电路', description: '电流、电压的分配', difficulty: 'hard', mastery: 30, relatedQuestions: 12 },
        ],
      },
    ],
  },
  {
    id: 'chemistry',
    name: '化学',
    icon: 'FlaskConical',
    color: '#EA580C',
    chapters: [
      {
        id: 'chem-9-1',
        title: '酸碱盐',
        description: '酸碱盐的性质与反应',
        completed: false,
        progress: 10,
        knowledgePoints: [
          { id: 'kp-17', name: '酸碱指示剂', description: '酚酞、石蕊的变色', difficulty: 'easy', mastery: 85, relatedQuestions: 8 },
          { id: 'kp-18', name: '中和反应', description: '酸+碱→盐+水', difficulty: 'medium', mastery: 40, relatedQuestions: 12 },
        ],
      },
    ],
  },
];

export const useStore = create<AppState>((set, get) => ({
  // User
  user: {
    id: '1',
    name: '张小明',
    avatar: '',
    grade: '九年级',
    school: '实验中学',
    role: 'student',
    points: 1250,
    streakDays: 7,
  },
  setUser: (user) => set({ user }),

  // Navigation
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // AI Tutor
  conversations: [],
  currentConversation: null,
  tutorConfig: defaultTutorConfig,
  isTyping: false,
  setConversations: (conversations) => set({ conversations }),
  setCurrentConversation: (conv) => set({ currentConversation: conv }),
  addMessage: (message) => {
    const state = get();
    if (state.currentConversation) {
      const updated = {
        ...state.currentConversation,
        messages: [...state.currentConversation.messages, message],
        updatedAt: Date.now(),
      };
      set({
        currentConversation: updated,
        conversations: state.conversations.map((c) =>
          c.id === updated.id ? updated : c
        ),
      });
    }
  },
  setTutorConfig: (config) => set({ tutorConfig: config }),
  setIsTyping: (typing) => set({ isTyping: typing }),
  createConversation: (subject) => {
    const conv: Conversation = {
      id: `conv-${Date.now()}`,
      title: `${subject} - 新对话`,
      messages: [],
      subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => ({
      conversations: [conv, ...state.conversations],
      currentConversation: conv,
    }));
    return conv;
  },

  // Exam
  currentExam: null,
  examResults: [],
  setCurrentExam: (exam) => set({ currentExam: exam }),
  submitExam: (result) =>
    set((state) => ({ examResults: [result, ...state.examResults] })),

  // Speaking
  speakingSession: null,
  setSpeakingSession: (session) => set({ speakingSession: session }),

  // Subjects
  subjects: mockSubjects,
  setSubjects: (subjects) => set({ subjects }),

  // Reports
  studyReport: null,
  setStudyReport: (report) => set({ studyReport: report }),

  // Parent
  parentDashboard: null,
  setParentDashboard: (dashboard) => set({ parentDashboard: dashboard }),

  // UI
  theme: 'light',
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  activeTab: 'chat',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
