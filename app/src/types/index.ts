// User types
export interface User {
  id: string;
  name: string;
  avatar: string;
  grade: string;
  school: string;
  role: 'student' | 'parent' | 'teacher';
  points: number;
  streakDays: number;
}

// AI Tutor types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  type?: 'text' | 'image' | 'audio' | 'formula';
  attachment?: { type: string; url: string };
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  subject: string;
  createdAt: number;
  updatedAt: number;
}

// Teaching modes
export type TeachingMode = 'chat' | 'classroom' | 'exam' | 'speaking' | 'homework';

// Subject types
export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  knowledgePoints: KnowledgePoint[];
  completed: boolean;
  progress: number;
}

export interface KnowledgePoint {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  mastery: number; // 0-100
  relatedQuestions: number;
}

// Exam types
export type ExamType = 'practice' | 'quiz' | 'simulation';
export type QuestionType = 'single' | 'multiple' | 'fill' | 'judge' | 'essay' | 'calculation';

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  knowledgePoint: string;
  difficulty: 'easy' | 'medium' | 'hard';
  score: number;
  userAnswer?: string | string[];
  isCorrect?: boolean;
}

export interface Exam {
  id: string;
  title: string;
  type: ExamType;
  subject: string;
  chapter: string;
  questions: Question[];
  duration: number; // minutes
  totalScore: number;
  timeRemaining: number;
  status: 'preparing' | 'in-progress' | 'submitted' | 'graded';
}

export interface ExamResult {
  examId: string;
  score: number;
  totalScore: number;
  correctCount: number;
  wrongCount: number;
  timeUsed: number;
  knowledgeMastery: { name: string; mastery: number }[];
  wrongQuestions: Question[];
  suggestions: string[];
}

// Speaking types
export type SpeakingRole = 'strict' | 'gentle' | 'peer' | 'foreign';
export type SpeakingScene = 'daily' | 'exam' | 'recitation' | 'presentation';

export interface SpeakingSession {
  id: string;
  role: SpeakingRole;
  scene: SpeakingScene;
  subject: string;
  topic: string;
  messages: SpeakingMessage[];
  startTime: number;
  duration: number;
  pronunciationScore?: number;
  fluencyScore?: number;
  accuracyScore?: number;
}

export interface SpeakingMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  audioUrl?: string;
  pronunciationFeedback?: PronunciationFeedback;
  timestamp: number;
}

export interface PronunciationFeedback {
  overall: number;
  accuracy: number;
  fluency: number;
  completeness: number;
  wordDetails: {
    word: string;
    score: number;
    suggestion?: string;
  }[];
}

// Study Report
export interface StudyReport {
  period: 'day' | 'week' | 'month';
  studyTime: number; // minutes
  questionsAnswered: number;
  questionsCorrect: number;
  conversationsCount: number;
  examCount: number;
  averageScore: number;
  subjectMastery: { subject: string; mastery: number }[];
  knowledgeGaps: string[];
  trend: { date: string; score: number; time: number }[];
  ranking?: { class: number; grade: number };
}

// Parent dashboard
export interface ParentDashboard {
  childName: string;
  todayStudyTime: number;
  todayQuestions: number;
  weeklyTrend: { day: string; minutes: number }[];
  alerts: { type: 'warning' | 'info' | 'success'; message: string; time: number }[];
  studyPlan: StudyTask[];
}

export interface StudyTask {
  id: string;
  title: string;
  subject: string;
  deadline: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

// AI Tutor Configuration (from Mr. Ranedeer)
export interface TutorConfig {
  depth: 1 | 2 | 3 | 4 | 5; // 1=basic, 5=advanced
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  communicationStyle: 'socratic' | 'direct' | 'encouraging';
  toneStyle: 'friendly' | 'professional' | 'humorous';
  reasoningFramework: 'deductive' | 'inductive' | 'analogical';
  language: string;
  useEmojis: boolean;
}

// OCR / Image types
export interface OCRResult {
  text: string;
  formula?: string;
  confidence: number;
  boxes: { x: number; y: number; w: number; h: number; text: string }[];
}
