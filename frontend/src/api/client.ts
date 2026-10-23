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

export interface LearningResourceSummary {
  id: string;
  title: string;
  format: 'VIDEO' | 'IMAGE' | 'PDF';
  pathway: { code: string; name: string };
  durationSeconds: number | null;
}
export interface LearningConcept {
  id: string;
  conceptKey: string;
  title: string;
  description: string | null;
  learningObjective: string | null;
  curriculumReference: string | null;
  orderIndex: number;
  resources: LearningResourceSummary[];
  progress: { status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'NEEDS_REVIEW'; progressPercent: number; completedAt: string | null }[];
}
export interface LearningCatalog {
  grade: number;
  preferredPathways: string[];
  profileRequired: boolean;
  subjects: { id: string; code: string; name: string; chapters: { id: string; title: string; term: number | null; description: string | null; curriculumReference: string | null; orderIndex: number; concepts: LearningConcept[] }[] }[];
}
export interface TeacherStudentReport {
  student: { id: string; name: string; username: string; grade: number; class_name: string | null };
  profile: PreferenceProfile | null;
}

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

  async getAssignedStudentReport(studentId: string): Promise<TeacherStudentReport> {
    return request<TeacherStudentReport>(`/assessment-access/students/${studentId}/report`, { method: 'GET' });
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
  },

  async listTeacherAssignments(teacherId: string): Promise<{ id: string; subject: { id: string; code: string; name: string }; class: { id: string; school_id: string; grade: number; section: string; academic_year: string } }[]> {
    return request(`/admin/teachers/${teacherId}/assignments`, { method: 'GET' });
  },

  async assignTeacherToClass(teacherId: string, classId: string, subjectId: string): Promise<unknown> {
    return request(`/admin/teachers/${teacherId}/assignments`, { method: 'POST', body: JSON.stringify({ class_id: classId, subject_id: subjectId }) });
  },

  async removeTeacherAssignment(teacherId: string, assignmentId: string): Promise<void> {
    await request(`/admin/teachers/${teacherId}/assignments/${assignmentId}`, { method: 'DELETE' });
  },

  async getLearningCatalog(): Promise<LearningCatalog> {
    return request<LearningCatalog>('/learning/catalog', { method: 'GET' });
  },

  async openLearningResource(resourceId: string): Promise<{ url: string; expiresIn: number }> {
    return request(`/learning/resources/${resourceId}/open`, { method: 'GET' });
  },

  async updateConceptProgress(conceptId: string, payload: { status: 'IN_PROGRESS' | 'COMPLETED' | 'NEEDS_REVIEW'; progressPercent: number; resourceId?: string }): Promise<unknown> {
    return request(`/learning/concepts/${conceptId}/progress`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  async listTeacherLearningReviewQueue(): Promise<any[]> {
    return request('/learning/teacher/review-queue', { method: 'GET' });
  },

  async reviewLearningResource(resourceId: string, decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION', reviewNotes?: string): Promise<any> {
    return request(`/learning/teacher/resources/${resourceId}/review`, { method: 'POST', body: JSON.stringify({ decision, reviewNotes }) });
  },

  async listAdminLearningResources(status?: string): Promise<any[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request(`/learning/admin/resources${query}`, { method: 'GET' });
  },

  async createAdminLearningResource(payload: { conceptId: string; pathwayCode: 'VIS' | 'LING' | 'LOGI'; format: 'VIDEO' | 'IMAGE' | 'PDF'; title: string; sourceReference?: string }): Promise<{ id: string; format: 'VIDEO' | 'IMAGE' | 'PDF'; status: string }> {
    return request('/learning/admin/resources', { method: 'POST', body: JSON.stringify(payload) });
  },

  async openTeacherReviewResource(resourceId: string): Promise<{ url: string; expiresIn: number }> {
    return request(`/learning/teacher/resources/${resourceId}/open`, { method: 'GET' });
  },

  async listAdminLearningSubjects(): Promise<{ id: string; code: string; name: string }[]> {
    return request('/learning/admin/subjects', { method: 'GET' });
  },

  async listAdminCurriculum(grade?: number): Promise<any[]> {
    return request(`/learning/admin/curriculum${grade ? `?grade=${grade}` : ''}`, { method: 'GET' });
  },

  async createAdminCurriculumChapter(payload: { subjectId: string; grade: number; term: number; title: string; description?: string; curriculumReference?: string; orderIndex: number }): Promise<any> {
    return request('/learning/admin/curriculum/chapters', { method: 'POST', body: JSON.stringify(payload) });
  },

  async createAdminCurriculumConcept(chapterId: string, payload: { conceptKey: string; title: string; description?: string; learningObjective?: string; curriculumReference?: string; orderIndex: number }): Promise<any> {
    return request(`/learning/admin/curriculum/chapters/${chapterId}/concepts`, { method: 'POST', body: JSON.stringify(payload) });
  },

  async createAdminLearningUploadIntent(resourceId: string, file: File, durationSeconds?: number): Promise<{ uploadUrl: string; storageBucket: string; storagePath: string; mimeType: string; fileSizeBytes: number; durationSeconds: number | null }> {
    return request(`/learning/admin/resources/${resourceId}/upload-intent`, { method: 'POST', body: JSON.stringify({ fileName: file.name, mimeType: file.type, fileSizeBytes: file.size, durationSeconds }) });
  },

  async saveAdminLearningFile(resourceId: string, payload: { storageBucket: string; storagePath: string; mimeType: string; fileSizeBytes: number; durationSeconds?: number }): Promise<any> {
    return request(`/learning/admin/resources/${resourceId}/file`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  async publishAdminLearningResource(resourceId: string): Promise<any> {
    return request(`/learning/admin/resources/${resourceId}/publish`, { method: 'POST' });
  }
};
