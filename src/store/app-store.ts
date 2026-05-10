import { create } from 'zustand';

// ─── localStorage key for JWT token ─────────────────────────
export const TOKEN_KEY = 'escribia_token';

/** Safely read token from localStorage (SSR-safe) */
function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Safely write token to localStorage (SSR-safe) */
function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
  }
}

// ─── Types ───────────────────────────────────────────────────

export type ViewType =
  | 'landing'
  | 'login'
  | 'register'
  | 'pending-approval'
  | 'student-dashboard'
  | 'teacher-dashboard'
  | 'admin-dashboard'
  | 'essay-editor'
  | 'essay-detail'
  | 'self-assessment'
  | 'teacher-notes'
  | 'class-preparations'
  | 'preparation-editor'
  | 'student-detail'
  | 'profile';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  status: string;
  teacherCode?: string;
  institution?: string;
  avatar?: string;
}

export interface StudyTopic {
  topic: string;
  description: string;
  priority: 'alta' | 'media' | 'bassa';
  resources: string[];
}

export interface Essay {
  id: string;
  studentId: string;
  title: string;
  content: string;
  topic?: string;
  correctedContent?: string;
  score?: number;
  grammarScore?: number;
  coherenceScore?: number;
  vocabularyScore?: number;
  clarityScore?: number;
  aiFeedback?: string;
  errorAnnotations?: string;
  errors?: unknown[];
  cilsLevelAssessment?: {
    estimatedLevel: string;
    passesTargetLevel: boolean | null;
    readiness: string;
    targetLevelProvided?: string | null;
  } | null;
  studyTopics?: StudyTopic[];
  status: 'SUBMITTED' | 'CORRECTED';
  createdAt: string;
  updatedAt: string;
  studentName?: string;
  selfAssessments?: SelfAssessment[];
}

export interface SelfAssessment {
  id: string;
  essayId: string;
  studentId: string;
  clarity: number;
  coherence: number;
  grammar: number;
  vocabulary: number;
  overallSelfScore?: number;
  reflection?: string;
  createdAt: string;
}

export interface TeacherNote {
  id: string;
  teacherId: string;
  studentId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  studentName?: string;
}

export interface ClassPreparation {
  id: string;
  teacherId: string;
  title: string;
  topic: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  teacherId: string;
  studentId: string;
  joinedAt: string;
  studentName?: string;
  teacherName?: string;
}

// ─── Store interface ─────────────────────────────────────────

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Navigation
  currentView: ViewType;
  selectedStudentId: string | null;

  // Data
  essays: Essay[];
  currentEssay: Essay | null;
  selfAssessments: SelfAssessment[];
  teacherNotes: TeacherNote[];
  classPreparations: ClassPreparation[];
  enrollments: Enrollment[];
  students: User[];

  // UI State
  isLoading: boolean;
  sidebarOpen: boolean;

  // Actions
  setUser: (user: User | null, token?: string | null) => void;
  logout: () => void;
  setCurrentView: (view: ViewType) => void;
  setSelectedStudentId: (id: string | null) => void;
  setEssays: (essays: Essay[]) => void;
  setCurrentEssay: (essay: Essay | null) => void;
  setSelfAssessments: (assessments: SelfAssessment[]) => void;
  setTeacherNotes: (notes: TeacherNote[]) => void;
  setClassPreparations: (preparations: ClassPreparation[]) => void;
  setEnrollments: (enrollments: Enrollment[]) => void;
  setStudents: (students: User[]) => void;
  setIsLoading: (loading: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  /** Restore auth state from localStorage on app init */
  hydrateAuth: () => void;
}

// ─── Store creation ──────────────────────────────────────────

export const useAppStore = create<AppState>((set) => ({
  // Auth (initialized from localStorage via hydrateAuth)
  user: null,
  token: null,
  isAuthenticated: false,

  // Navigation
  currentView: 'landing' as ViewType,
  selectedStudentId: null as string | null,

  // Data
  essays: [],
  currentEssay: null,
  selfAssessments: [],
  teacherNotes: [],
  classPreparations: [],
  enrollments: [],
  students: [],

  // UI State
  isLoading: false,
  sidebarOpen: true,

  // Actions
  setUser: (user, token) => {
    const tokenValue = token !== undefined ? token : null;
    // Persist token to localStorage
    setStoredToken(tokenValue);
    set({
      user,
      token: tokenValue,
      isAuthenticated: !!user,
    });
  },

  logout: () => {
    // Clear token from localStorage
    setStoredToken(null);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      currentView: 'landing' as ViewType,
      selectedStudentId: null,
      essays: [],
      currentEssay: null,
      selfAssessments: [],
      teacherNotes: [],
      classPreparations: [],
      enrollments: [],
      students: [],
    });
  },

  setCurrentView: (view) => set({ currentView: view }),
  setSelectedStudentId: (id) => set({ selectedStudentId: id }),
  setEssays: (essays) => set({ essays }),
  setCurrentEssay: (essay) => set({ currentEssay: essay }),
  setSelfAssessments: (assessments) => set({ selfAssessments: assessments }),
  setTeacherNotes: (notes) => set({ teacherNotes: notes }),
  setClassPreparations: (preparations) => set({ classPreparations: preparations }),
  setEnrollments: (enrollments) => set({ enrollments }),
  setStudents: (students) => set({ students }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  /**
   * Restore authentication state from localStorage.
   * Called once on app mount to persist sessions across page reloads.
   * The token is validated server-side on each API call, so a stale
   * or expired token is handled gracefully (401 → redirect to login).
   */
  hydrateAuth: () => {
    const storedToken = getStoredToken();
    if (storedToken) {
      set({
        token: storedToken,
        // We don't set isAuthenticated here because we haven't
        // validated the token yet. The app-shell will call /api/auth/me
        // to verify and set the user + isAuthenticated.
      });
    }
  },
}));
