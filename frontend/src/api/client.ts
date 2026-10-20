import type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  UserSummary,
  StartAttemptResponse,
  SafeQuestionResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  SubmitAttemptResponse,
  PreferenceProfile,
  PreferenceProfileHistoryItem,
  QuestionVersion,
  CreateQuestionInput,
  UpdateQuestionInput,
  ReviewQuestionInput,
  AssessmentConfig,
  UpdateAssessmentConfig,
  ErrorResponse,
  StudentAssessmentAccess,
  ManagedAssessmentStudent,
  TeacherAccount,
  CreateTeacherAccount,
  RegistrationOptions
} from '@pinnacle/shared';

// In-memory token storage (with sessionStorage sync to survive page refreshes in the same tab, never localStorage)
let memoryToken: string | null = null;

try {
  memoryToken = sessionStorage.getItem('mindbridge_access_token');
} catch {
  // Ignore sessionStorage errors (e.g. private browsing restriction)
}

export const tokenStore = {
  getToken(): string | null {
    return memoryToken;
  },
  setToken(token: string | null): void {
    memoryToken = token;
    try {
      if (token) {
        sessionStorage.setItem('mindbridge_access_token', token);
      } else {
        sessionStorage.removeItem('mindbridge_access_token');
      }
    } catch {
      // Ignore sessionStorage errors
    }
  },
  clear(): void {
    this.setToken(null);
  }
};

export class ApiError extends Error {
  code: string;
  details?: { field?: string; issue: string; message?: string }[];
  statusCode: number;

  constructor(statusCode: number, code: string, message: string, details?: any[]) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.getToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`/api/v1${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (data && data.error) {
      throw new ApiError(
        response.status,
        data.error.code || 'API_ERROR',
        data.error.message || 'An error occurred',
        data.error.details
      );
    }
    throw new ApiError(response.status, 'HTTP_ERROR', `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  async getRegistrationOptions(): Promise<RegistrationOptions> {
    return request<RegistrationOptions>('/auth/registration-options', { method: 'GET' });
  },

  async register(payload: RegisterRequest): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    tokenStore.setToken(res.token);
    return res;
  },

  async login(payload: LoginRequest): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    tokenStore.setToken(res.token);
    return res;
  },

  async getMe(): Promise<UserSummary> {
    return request<UserSummary>('/auth/me', { method: 'GET' });
  },

  async getAssessmentAccess(): Promise<StudentAssessmentAccess> {
    return request<StudentAssessmentAccess>('/students/me/assessment-access', { method: 'GET' });
  },

  async listManagedAssessmentStudents(): Promise<ManagedAssessmentStudent[]> {
    return request<ManagedAssessmentStudent[]>('/assessment-access/students', { method: 'GET' });
  },

  async grantAssessmentRetake(studentId: string): Promise<{ message: string; granted_at: string }> {
    return request(`/assessment-access/students/${studentId}/retake-access`, { method: 'POST' });
  },

  async revokeAssessmentRetake(studentId: string): Promise<{ message: string }> {
    return request(`/assessment-access/students/${studentId}/retake-access`, { method: 'DELETE' });
  },

  logout(): void {
    tokenStore.clear();
  },

  // Assessment Attempts
  async startOrResumeAttempt(): Promise<StartAttemptResponse> {
    return request<StartAttemptResponse>('/assessment-attempts', { method: 'POST' });
  },

  async getCurrentQuestion(attemptId: string): Promise<SafeQuestionResponse> {
    return request<SafeQuestionResponse>(`/assessment-attempts/${attemptId}/current`, { method: 'GET' });
  },

  async submitAnswer(attemptId: string, payload: SubmitAnswerRequest): Promise<SubmitAnswerResponse> {
    return request<SubmitAnswerResponse>(`/assessment-attempts/${attemptId}/responses`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async submitAttempt(attemptId: string): Promise<SubmitAttemptResponse> {
    return request<SubmitAttemptResponse>(`/assessment-attempts/${attemptId}/submit`, { method: 'POST' });
  },

  // Student Profiles
  async getCurrentProfile(): Promise<PreferenceProfile> {
    return request<PreferenceProfile>('/students/me/preference-profile', { method: 'GET' });
  },

  async getProfileHistory(): Promise<PreferenceProfileHistoryItem[]> {
    return request<PreferenceProfileHistoryItem[]>('/students/me/preference-profiles', { method: 'GET' });
  },

  // Admin Question & Config Management
  async listAdminQuestions(): Promise<QuestionVersion[]> {
    return request<QuestionVersion[]>('/admin/questions', { method: 'GET' });
  },

  async createAdminQuestion(payload: CreateQuestionInput): Promise<QuestionVersion> {
    return request<QuestionVersion>('/admin/questions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateAdminQuestion(questionId: string, payload: UpdateQuestionInput): Promise<QuestionVersion> {
    return request<QuestionVersion>(`/admin/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async reviewAdminQuestion(questionId: string, payload: ReviewQuestionInput): Promise<QuestionVersion> {
    return request<QuestionVersion>(`/admin/questions/${questionId}/review`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async activateAdminQuestion(questionId: string): Promise<QuestionVersion> {
    return request<QuestionVersion>(`/admin/questions/${questionId}/activate`, {
      method: 'POST'
    });
  },

  async deactivateAdminQuestion(questionId: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/admin/questions/${questionId}`, {
      method: 'DELETE'
    });
  },

  async getAdminConfig(): Promise<AssessmentConfig> {
    return request<AssessmentConfig>('/admin/assessment-config', { method: 'GET' });
  },

  async updateAdminConfig(payload: UpdateAssessmentConfig): Promise<AssessmentConfig> {
    return request<AssessmentConfig>('/admin/assessment-config', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async listTeacherAccounts(): Promise<TeacherAccount[]> {
    return request<TeacherAccount[]>('/admin/teachers', { method: 'GET' });
  },

  async createTeacherAccount(payload: CreateTeacherAccount): Promise<TeacherAccount> {
    return request<TeacherAccount>('/admin/teachers', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
