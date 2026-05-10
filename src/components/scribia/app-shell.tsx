'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  LayoutDashboard,
  FileText,
  PenLine,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  StickyNote,
  BookMarked,
  GraduationCap,
  ChevronLeft,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAppStore, type ViewType } from '@/store/app-store';
import { cn } from '@/lib/utils';
import { StudentDashboard } from './student-dashboard';
import { TeacherDashboard } from './teacher-dashboard';
import { AdminDashboard } from './admin-dashboard';
import { EssayEditor } from './essay-editor';
import { EssayDetail } from './essay-detail';
import { SelfAssessment } from './self-assessment';
import { TeacherNotes } from './teacher-notes';
import { ClassPreparations } from './class-preparations';
import { ProfileSection } from './profile-section';
import { StudentDetail } from './student-detail';

interface NavItem {
  icon: React.ElementType;
  label: string;
  view: ViewType;
}

const studentNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Cruscotto', view: 'student-dashboard' },
  { icon: PenLine, label: 'Scrivi testo', view: 'essay-editor' },
  { icon: UserIcon, label: 'Profilo', view: 'profile' },
];

const teacherNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Cruscotto', view: 'teacher-dashboard' },
  { icon: FileText, label: 'Testi', view: 'student-dashboard' },
  { icon: StickyNote, label: 'Note studenti', view: 'teacher-notes' },
  { icon: BookMarked, label: 'Preparazioni', view: 'class-preparations' },
  { icon: UserIcon, label: 'Profilo', view: 'profile' },
];

const adminNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Cruscotto', view: 'admin-dashboard' },
  { icon: UserIcon, label: 'Profilo', view: 'profile' },
];

function renderView(view: ViewType) {
  switch (view) {
    case 'student-dashboard':
      return <StudentDashboard />;
    case 'teacher-dashboard':
      return <TeacherDashboard />;
    case 'admin-dashboard':
      return <AdminDashboard />;
    case 'essay-editor':
      return <EssayEditor />;
    case 'essay-detail':
      return <EssayDetail />;
    case 'self-assessment':
      return <SelfAssessment />;
    case 'teacher-notes':
      return <TeacherNotes />;
    case 'class-preparations':
    case 'preparation-editor':
      return <ClassPreparations />;
    case 'student-detail':
      return <StudentDetail />;
    case 'profile':
      return <ProfileSection />;
    default:
      return <StudentDashboard />;
  }
}

function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const { user, currentView, setCurrentView, logout, sidebarOpen, setSidebarOpen } = useAppStore();
  const navItems = user?.role === 'ADMIN' ? adminNavItems : user?.role === 'TEACHER' ? teacherNavItems : studentNavItems;

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-amber-100', collapsed && 'justify-center px-2')}>
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shrink-0">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <h2 className="text-lg font-bold text-amber-900">ScribIA</h2>
          </motion.div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => {
                setCurrentView(item.view);
                setSidebarOpen(false);
              }}
              className={cn(
                'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]',
                isActive
                  ? 'bg-amber-100 text-amber-900 shadow-sm'
                  : 'text-amber-700/70 hover:bg-amber-50 hover:text-amber-900',
                collapsed && 'justify-center px-2'
              )}
            >
              <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-amber-600')} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-amber-100 p-3">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <Avatar className="h-8 w-8 border border-amber-200">
            <AvatarFallback className="bg-amber-100 text-amber-700 text-xs font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900 truncate">{user?.name}</p>
              <p className="text-xs text-amber-600/60 truncate">{user?.email}</p>
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon" onClick={logout} className="shrink-0 text-amber-600 hover:text-rose-600 hover:bg-rose-50">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AppShell() {
  const { user, currentView, sidebarOpen, setSidebarOpen } = useAppStore();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const viewLabel = (() => {
    const navItems = user?.role === 'ADMIN' ? adminNavItems : user?.role === 'TEACHER' ? teacherNavItems : studentNavItems;
    const found = navItems.find((i) => i.view === currentView);
    if (found) return found.label;
    if (currentView === 'essay-detail') return 'Dettaglio testo';
    if (currentView === 'self-assessment') return 'Autovalutazione';
    if (currentView === 'student-detail') return 'Dettaglio studente';
    if (currentView === 'admin-dashboard') return 'Cruscotto Admin';
    return '';
  })();

  return (
    <div className="min-h-screen flex flex-col bg-amber-50/30">
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        {!isMobile && (
          <motion.aside
            initial={false}
            animate={{ width: collapsed ? 64 : 240 }}
            transition={{ duration: 0.2, ease: 'easeInOut' as const }}
            className="sticky top-0 h-screen bg-white border-r border-amber-100 shadow-sm z-30 shrink-0 overflow-hidden"
          >
            <SidebarContent collapsed={collapsed} />
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="absolute top-5 -right-3 w-6 h-6 bg-white border border-amber-200 rounded-full flex items-center justify-center shadow-sm hover:bg-amber-50 transition-colors z-40"
            >
              <ChevronLeft className={cn('h-3 w-3 text-amber-600 transition-transform', collapsed && 'rotate-180')} />
            </button>
          </motion.aside>
        )}

        {/* Mobile sidebar */}
        {isMobile && (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-64 p-0 bg-white border-amber-100">
              <SheetTitle className="sr-only">Menu di navigazione</SheetTitle>
              <SidebarContent collapsed={false} />
            </SheetContent>
          </Sheet>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top header */}
          <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-amber-100 px-4 md:px-6 py-3">
            <div className="flex items-center gap-3">
              {isMobile && (
                <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-amber-700">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                </Sheet>
              )}
              <h1 className="text-lg font-semibold text-amber-900">{viewLabel}</h1>
              <div className="ml-auto flex items-center gap-2">
                {user?.role === 'ADMIN' && (
                  <div className="hidden sm:flex items-center gap-1.5 text-xs bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full">
                    <Shield className="h-3.5 w-3.5" />
                    Admin
                  </div>
                )}
                {user?.role === 'TEACHER' && (
                  <div className="hidden sm:flex items-center gap-1.5 text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                    <GraduationCap className="h-3.5 w-3.5" />
                    Docente
                  </div>
                )}
                {user?.role === 'STUDENT' && (
                  <div className="hidden sm:flex items-center gap-1.5 text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                    <GraduationCap className="h-3.5 w-3.5" />
                    Studente
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-4 md:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: 'easeInOut' as const }}
              >
                {renderView(currentView)}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Footer */}
          <footer className="border-t border-amber-100 bg-white/60 px-4 py-3 text-center text-xs text-amber-600/60">
            ScribIA — Assistente di scrittura con IA per l&apos;italiano
          </footer>
        </div>
      </div>
    </div>
  );
}
