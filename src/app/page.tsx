'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore, type User } from '@/store/app-store';
import { LandingPage } from '@/components/landing-page';
import { LoginPage } from '@/components/login-page';
import { RegisterPage } from '@/components/register-page';
import { PendingApproval } from '@/components/pending-approval';
import { AppShell } from '@/components/scribia/app-shell';
import { apiFetch } from '@/components/scribia/api-fetch';

export default function Home() {
  const { user, isAuthenticated, currentView, setUser, hydrateAuth, setCurrentView } = useAppStore();
  const [isHydrating, setIsHydrating] = useState(true);
  const hasHydrated = useRef(false);

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;

    hydrateAuth();

    // If we have a stored token, verify it with /api/auth/me
    const token = useAppStore.getState().token;
    if (token) {
      apiFetch<{ user: User; relatedStudents: unknown[]; relatedTeachers: unknown[] }>('/api/auth/me')
        .then((data) => {
          // /api/auth/me returns { user, relatedStudents, relatedTeachers } — 3 keys
          // apiFetch won't auto-unwrap multi-key responses
          const userData = data.user as User;
          setUser(userData, token);

          // If PENDING status, redirect to pending-approval view
          if (userData.status === 'PENDING') {
            setCurrentView('pending-approval');
          }
        })
        .catch(() => {
          // Token is invalid/expired — clear it
          setUser(null, null);
        })
        .finally(() => {
          setIsHydrating(false);
        });
    } else {
      // Use microtask to avoid synchronous setState in effect
      queueMicrotask(() => setIsHydrating(false));
    }
  }, [hydrateAuth, setUser, setCurrentView]);

  // Show splash while hydrating to avoid flash
  if (isHydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="flex items-center gap-3">
          <img src="/logo-scribia.png" alt="ScribIA" className="w-10 h-10 rounded-xl" />
          <span className="text-amber-900 font-semibold text-lg">ScribIA</span>
        </div>
      </div>
    );
  }

  // PENDING teacher — show approval pending screen
  if (currentView === 'pending-approval') {
    return <PendingApproval />;
  }

  if (isAuthenticated && user && user.status !== 'PENDING') {
    return <AppShell />;
  }

  switch (currentView) {
    case 'register':
      return <RegisterPage />;
    case 'login':
      return <LoginPage />;
    case 'landing':
    default:
      return <LandingPage />;
  }
}
