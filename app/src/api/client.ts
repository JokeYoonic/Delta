const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('delta_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('delta_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('delta_token');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `API Error: ${response.status}`);
    }

    return response.json();
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  async upload<T>(path: string, file: File, extraFields?: Record<string, string>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    if (extraFields) {
      for (const [key, value] of Object.entries(extraFields)) {
        formData.append(key, value);
      }
    }

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `API Error: ${response.status}`);
    }

    return response.json();
  }

  createWebSocket(path: string): WebSocket {
    const wsBase = this.baseUrl.replace(/^http/, 'ws');
    const url = `${wsBase}${path}?token=${this.token}`;
    return new WebSocket(url);
  }
}

export const api = new ApiClient(API_BASE);

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    grade: string;
    school: string;
    role: string;
    points: number;
    streak_days: number;
  };
}

export interface ConversationResponse {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  mode: string;
  created_at: string;
  updated_at: string;
  messages: MessageResponse[];
}

export interface MessageResponse {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  message_type: string;
  attachment: Record<string, unknown> | null;
  created_at: string;
}

export interface ExamResultResponse {
  id: string;
  exam_title: string;
  exam_type: string;
  subject: string;
  score: number;
  total_score: number;
  correct_count: number;
  wrong_count: number;
  time_used: number;
  knowledge_mastery: Record<string, unknown>[];
  wrong_questions: Record<string, unknown>[];
  suggestions: string[];
  created_at: string;
}

export interface TutorConfigResponse {
  id: string;
  user_id: string;
  depth: number;
  learning_style: string;
  communication_style: string;
  tone_style: string;
  reasoning_framework: string;
  language: string;
  use_emojis: boolean;
  updated_at: string;
}

export interface StudyReportResponse {
  period: string;
  study_time: number;
  questions_answered: number;
  questions_correct: number;
  conversations_count: number;
  exam_count: number;
  average_score: number;
  subject_mastery: { subject: string; average_mastery: number; total_points: number }[];
  knowledge_gaps: string[];
  trend: { date: string; study_time: number; questions_answered: number; correct_rate: number }[];
}

export interface OCRResponse {
  text: string;
  formula: string | null;
  confidence: number;
  boxes: Record<string, unknown>[];
}

export interface RAGQueryResponse {
  answer: string;
  sources: Record<string, unknown>[];
  confidence: number;
}

export const authApi = {
  register: (data: { name: string; email: string; password: string; grade?: string; school?: string }) =>
    api.post<AuthResponse>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),
  getMe: () => api.get<AuthResponse['user']>('/auth/me'),
  updateMe: (data: { name?: string; grade?: string; school?: string; avatar?: string }) =>
    api.patch<AuthResponse['user']>('/auth/me', data),
};

export const conversationApi = {
  list: () => api.get<ConversationResponse[]>('/conversations'),
  create: (data: { title?: string; subject?: string; mode?: string }) =>
    api.post<ConversationResponse>('/conversations', data),
  get: (id: string) => api.get<ConversationResponse>(`/conversations/${id}`),
  addMessage: (id: string, data: { content: string; message_type?: string; attachment?: Record<string, unknown> }) =>
    api.post<MessageResponse>(`/conversations/${id}/messages`, data),
  delete: (id: string) => api.delete(`/conversations/${id}`),
};

export const chatApi = {
  completion: (conversationId: string, content: string) =>
    api.post<MessageResponse>(`/chat/completions?conversation_id=${conversationId}&content=${encodeURIComponent(content)}`, {}),
};

export const examApi = {
  listResults: () => api.get<ExamResultResponse[]>('/exams/results'),
  submitResult: (data: Record<string, unknown>) => api.post<ExamResultResponse>('/exams/results', data),
  getResult: (id: string) => api.get<ExamResultResponse>(`/exams/results/${id}`),
  generateQuestions: (params: { subject: string; chapter: string; difficulty?: string; count?: number; question_types?: string[] }) => {
    const query = new URLSearchParams({ subject: params.subject, chapter: params.chapter });
    if (params.difficulty) query.set('difficulty', params.difficulty);
    if (params.count) query.set('count', String(params.count));
    return api.post<{ questions: Record<string, unknown>[] }>(`/exam/generate?${query}`, {});
  },
  evaluateAnswer: (data: { question: string; correct_answer: string; user_answer: string; subject?: string }) =>
    api.post<Record<string, unknown>>('/exam/evaluate', data),
  analyzeMistakes: (data: { wrong_questions: Record<string, unknown>[]; subject?: string }) =>
    api.post<Record<string, unknown>>('/exam/analyze-mistakes', data),
};

export const tutorApi = {
  getConfig: () => api.get<TutorConfigResponse>('/tutor/config'),
  updateConfig: (data: Record<string, unknown>) => api.patch<TutorConfigResponse>('/tutor/config', data),
};

export const reportApi = {
  getStudyReport: (period: string = 'week') =>
    api.get<StudyReportResponse>(`/reports/study?period=${period}`),
};

export const ragApi = {
  query: (data: { question: string; kb_name?: string; top_k?: number }) =>
    api.post<RAGQueryResponse>('/rag/query', data),
  upload: (file: File, kbName?: string) =>
    api.upload<{ status: string; filename: string }>('/rag/upload', file, kbName ? { kb_name: kbName } : undefined),
  listDatasets: () => api.get<{ datasets: Record<string, unknown>[] }>('/rag/datasets'),
};

export const ocrApi = {
  recognize: (imageBase64: string) =>
    api.post<OCRResponse>('/ocr/recognize', { image_base64: imageBase64 }),
};

export const voiceApi = {
  stt: async (audioBlob: Blob, language?: string): Promise<Record<string, unknown>> => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    if (language) formData.append('language', language);
    const headers: Record<string, string> = {};
    const token = localStorage.getItem('delta_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}/voice/stt`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return response.json();
  },
  tts: async (text: string, voice?: string): Promise<Blob> => {
    const formData = new FormData();
    formData.append('text', text);
    if (voice) formData.append('voice', voice);
    const headers: Record<string, string> = {};
    const token = localStorage.getItem('delta_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}/voice/tts`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return response.blob();
  },
  evaluatePronunciation: async (audioBlob: Blob, referenceText: string): Promise<Record<string, unknown>> => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    formData.append('reference_text', referenceText);
    const headers: Record<string, string> = {};
    const token = localStorage.getItem('delta_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}/voice/evaluate-pronunciation`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return response.json();
  },
};

export const speakingApi = {
  listSessions: () => api.get<Record<string, unknown>[]>('/speaking/sessions'),
  createSession: (data: { role?: string; scene?: string; subject?: string; topic?: string }) =>
    api.post<Record<string, unknown>>('/speaking/sessions', data),
  getSession: (id: string) => api.get<Record<string, unknown>>(`/speaking/sessions/${id}`),
  createWebSocket: () => {
    const wsBase = API_BASE.replace(/^http/, 'ws');
    const token = localStorage.getItem('delta_token');
    return new WebSocket(`${wsBase}/speaking/ws/${token}`);
  },
};

export const classroomApi = {
  createWebSocket: () => {
    const wsBase = API_BASE.replace(/^http/, 'ws');
    const token = localStorage.getItem('delta_token');
    return new WebSocket(`${wsBase}/classroom/ws/${token}`);
  },
};

export const knowledgeApi = {
  getDueReviews: () => api.get<{ due_count: number; knowledge_points: Record<string, unknown>[] }>('/knowledge/due-reviews'),
  submitReview: (kpId: string, quality: number) =>
    api.post<Record<string, unknown>>(`/knowledge/review/${kpId}?quality=${quality}`, {}),
  getAdaptiveQuestions: (targetCount?: number) =>
    api.get<{ questions: Record<string, unknown>[] }>(`/knowledge/adaptive-questions${targetCount ? `?target_count=${targetCount}` : ''}`),
};

export const billingApi = {
  createCustomer: () => api.post<Record<string, unknown>>('/billing/customers', {}),
  createSubscription: (planCode?: string) =>
    api.post<Record<string, unknown>>(`/billing/subscriptions?plan_code=${planCode || 'delta-free'}`, {}),
  trackUsage: (eventCode: string, properties?: Record<string, unknown>) =>
    api.post<Record<string, unknown>>('/billing/events', { event_code: eventCode, properties }),
  getUsage: () => api.get<Record<string, unknown>>('/billing/usage'),
  getInvoices: () => api.get<Record<string, unknown>>('/billing/invoices'),
};

export const logtoApi = {
  getAuthUrl: (redirectUri: string) =>
    api.get<{ url: string }>(`/auth/logto/url?redirect_uri=${encodeURIComponent(redirectUri)}`),
  callback: (code: string, redirectUri: string) =>
    api.post<AuthResponse>('/auth/logto/callback', { code, redirect_uri: redirectUri }),
};

export const skillsApi = {
  list: () => api.get<Record<string, unknown>[]>('/skills'),
  dispatch: (message: string, subject?: string) =>
    api.post<Record<string, unknown>>('/skills/dispatch', { message, subject }),
  execute: (skillName: string, message: string, subject?: string) =>
    api.post<Record<string, unknown>>(`/skills/execute/${skillName}`, { message, subject }),
};

export const agentsApi = {
  list: () => api.get<Record<string, unknown>[]>('/agents'),
  select: (studentLevel?: string, scenario?: string, preference?: string) =>
    api.post<Record<string, unknown>>('/agents/select', { student_level: studentLevel, scenario, preference }),
  get: (role: string) => api.get<Record<string, unknown>>(`/agents/${role}`),
};

export const memoryBooksApi = {
  list: () => api.get<Record<string, unknown>[]>('/memory-books'),
  create: (data: { title: string; description?: string; subject?: string }) =>
    api.post<Record<string, unknown>>('/memory-books', data),
  getEntries: (bookId: string) => api.get<Record<string, unknown>[]>(`/memory-books/${bookId}/entries`),
  createEntry: (bookId: string, data: { title: string; content?: string; knowledge_points?: string[]; tags?: string[] }) =>
    api.post<Record<string, unknown>>(`/memory-books/${bookId}/entries`, data),
  deleteEntry: (bookId: string, entryId: string) =>
    api.delete(`/memory-books/${bookId}/entries/${entryId}`),
};

export const superAdminApi = {
  seedSuperUser: () => api.post<Record<string, unknown>>('/auth/seed-superuser', {}),
};
