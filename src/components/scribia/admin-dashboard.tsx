'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  GraduationCap,
  UserCheck,
  UserX,
  Shield,
  Clock,
  Search,
  Filter,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppStore } from '@/store/app-store';
import { apiFetch } from './api-fetch';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  status: string;
  institution?: string | null;
  teacherCode?: string | null;
  createdAt: string;
}

interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  pendingApprovals: number;
}

interface UsersResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function getRoleBadge(role: string) {
  switch (role) {
    case 'STUDENT':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
          Studente
        </Badge>
      );
    case 'TEACHER':
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
          Docente
        </Badge>
      );
    case 'ADMIN':
      return (
        <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100">
          Admin
        </Badge>
      );
    default:
      return <Badge variant="outline">{role}</Badge>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'ACTIVE':
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
          Attivo
        </Badge>
      );
    case 'PENDING':
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100">
          In attesa
        </Badge>
      );
    case 'SUSPENDED':
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
          Sospeso
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function AdminDashboard() {
  const { user } = useAppStore();
  const [pendingTeachers, setPendingTeachers] = useState<AdminUser[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const PAGE_SIZE = 20;
  const initialLoadDone = useRef(false);

  const loadPendingTeachers = useCallback(async () => {
    try {
      const data = await apiFetch<{ pendingTeachers: AdminUser[] }>('/api/admin/pending-teachers');
      setPendingTeachers(data.pendingTeachers || []);
    } catch {
      toast.error('Errore nel caricamento dei docenti in attesa');
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(PAGE_SIZE));
      if (searchQuery) params.set('search', searchQuery);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const data = await apiFetch<UsersResponse>(`/api/admin/users?${params.toString()}`);
      setAllUsers(data.users || []);
      setPagination(data.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 });
    } catch {
      toast.error('Errore nel caricamento degli utenti');
    } finally {
      setUsersLoading(false);
    }
  }, [currentPage, searchQuery, roleFilter, statusFilter]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadPendingTeachers(), loadUsers()]);
      setLoading(false);
      initialLoadDone.current = true;
    };
    init();
  }, []);

  // Reload users when filters/page change (after initial load)
  useEffect(() => {
    if (initialLoadDone.current) {
      loadUsers();
    }
  }, [loadUsers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setCurrentPage(1);
  };

  const handleApproveTeacher = async (userId: string) => {
    setActionLoading(userId);
    try {
      await apiFetch<AdminUser>('/api/admin/approve-teacher', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      toast.success('Docente approvato con successo');
      await Promise.all([loadPendingTeachers(), loadUsers()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'approvazione');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectTeacher = async (userId: string) => {
    setActionLoading(userId);
    try {
      await apiFetch<AdminUser>('/api/admin/suspend-user', {
        method: 'POST',
        body: JSON.stringify({ userId, action: 'suspend' }),
      });
      toast.success('Docente rifiutato e sospeso');
      await Promise.all([loadPendingTeachers(), loadUsers()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nel rifiuto');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspendUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      await apiFetch<AdminUser>('/api/admin/suspend-user', {
        method: 'POST',
        body: JSON.stringify({ userId, action: 'suspend' }),
      });
      toast.success('Utente sospeso con successo');
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nella sospensione');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivateUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      await apiFetch<AdminUser>('/api/admin/suspend-user', {
        method: 'POST',
        body: JSON.stringify({ userId, action: 'reactivate' }),
      });
      toast.success('Utente riattivato con successo');
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nella riattivazione');
    } finally {
      setActionLoading(null);
    }
  };

  // Compute stats
  const stats: AdminStats = {
    totalUsers: pagination.total,
    totalStudents: allUsers.filter((u) => u.role === 'STUDENT').length,
    totalTeachers: allUsers.filter((u) => u.role === 'TEACHER').length,
    pendingApprovals: pendingTeachers.length,
  };

  // Recent registrations (last 5)
  const recentRegistrations = [...allUsers]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Role distribution data (approximate from current page)
  const roleDistribution = [
    { label: 'Studenti', count: stats.totalStudents, color: 'bg-emerald-500', bgColor: 'bg-emerald-100' },
    { label: 'Docenti', count: stats.totalTeachers, color: 'bg-amber-500', bgColor: 'bg-amber-100' },
    { label: 'Admin', count: allUsers.filter((u) => u.role === 'ADMIN').length, color: 'bg-rose-500', bgColor: 'bg-rose-100' },
  ];
  const maxCount = Math.max(...roleDistribution.map((r) => r.count), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Welcome */}
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-bold text-amber-900">
          Pannello Admin, {user?.name?.split(' ')[0] || 'Admin'}! 👋
        </h2>
        <p className="text-amber-700/60 mt-1">Gestisci utenti, docenti e statistiche della piattaforma.</p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="bg-amber-100/60 p-1 h-auto flex-wrap">
            <TabsTrigger
              value="pending"
              className="data-[state=active]:bg-white data-[state=active]:text-amber-900 data-[state=active]:shadow-sm text-amber-700"
            >
              <Clock className="h-4 w-4 mr-1.5" />
              Docenti in attesa
              {stats.pendingApprovals > 0 && (
                <Badge className="ml-1.5 bg-amber-500 text-white text-[10px] px-1.5 py-0 min-w-[20px] justify-center">
                  {stats.pendingApprovals}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-white data-[state=active]:text-amber-900 data-[state=active]:shadow-sm text-amber-700"
            >
              <Users className="h-4 w-4 mr-1.5" />
              Utenti
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="data-[state=active]:bg-white data-[state=active]:text-amber-900 data-[state=active]:shadow-sm text-amber-700"
            >
              <Shield className="h-4 w-4 mr-1.5" />
              Statistiche
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Docenti in attesa */}
          <TabsContent value="pending" className="mt-4">
            <Card className="border-amber-100 bg-white">
              <CardHeader>
                <CardTitle className="text-base text-amber-900 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-amber-600" />
                  Docenti in attesa di approvazione
                </CardTitle>
                <CardDescription>
                  {pendingTeachers.length} docent{pendingTeachers.length === 1 ? 'e' : 'i'} in attesa
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingTeachers.length === 0 ? (
                  <div className="text-center py-12 text-amber-600/50">
                    <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-medium">Nessun docente in attesa</p>
                    <p className="text-xs mt-1">Tutti i docenti sono stati approvati</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile: Card layout */}
                    <div className="sm:hidden space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                      {pendingTeachers.map((teacher) => (
                        <div key={teacher.id} className="p-4 rounded-lg border border-amber-100 bg-amber-50/30 space-y-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-amber-200">
                              <AvatarFallback className="bg-amber-100 text-amber-700 text-sm">
                                {teacher.name?.charAt(0)?.toUpperCase() || 'D'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-amber-900 text-sm truncate">{teacher.name}</p>
                              <p className="text-amber-700/60 text-xs truncate">{teacher.email}</p>
                            </div>
                          </div>
                          {teacher.institution && (
                            <p className="text-xs text-amber-600/70 pl-[52px]">{teacher.institution}</p>
                          )}
                          <div className="flex items-center gap-2 pl-[52px]">
                            <Button
                              size="sm"
                              onClick={() => handleApproveTeacher(teacher.id)}
                              disabled={actionLoading === teacher.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs flex-1"
                            >
                              {actionLoading === teacher.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              Approva
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectTeacher(teacher.id)}
                              disabled={actionLoading === teacher.id}
                              className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-8 text-xs flex-1"
                            >
                              {actionLoading === teacher.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5" />
                              )}
                              Rifiuta
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop: Table layout */}
                    <div className="hidden sm:block max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-amber-100 hover:bg-transparent">
                            <TableHead className="text-amber-700">Nome</TableHead>
                            <TableHead className="text-amber-700">Email</TableHead>
                            <TableHead className="text-amber-700 hidden md:table-cell">Istituto</TableHead>
                            <TableHead className="text-amber-700 hidden lg:table-cell">Data registrazione</TableHead>
                            <TableHead className="text-amber-700 text-right">Azioni</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingTeachers.map((teacher) => (
                            <TableRow key={teacher.id} className="border-amber-50 hover:bg-amber-50/50">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8 border border-amber-200">
                                    <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                                      {teacher.name?.charAt(0)?.toUpperCase() || 'D'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-amber-900 text-sm">{teacher.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-amber-700/70 text-sm">{teacher.email}</TableCell>
                              <TableCell className="text-amber-700/70 text-sm hidden md:table-cell">
                                {teacher.institution || '—'}
                              </TableCell>
                              <TableCell className="text-amber-700/70 text-sm hidden lg:table-cell">
                                {formatDate(teacher.createdAt)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveTeacher(teacher.id)}
                                    disabled={actionLoading === teacher.id}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                                  >
                                    {actionLoading === teacher.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    )}
                                    Approva
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRejectTeacher(teacher.id)}
                                    disabled={actionLoading === teacher.id}
                                    className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-8 text-xs"
                                  >
                                    {actionLoading === teacher.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <XCircle className="h-3.5 w-3.5" />
                                    )}
                                    Rifiuta
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Utenti */}
          <TabsContent value="users" className="mt-4 space-y-4">
            {/* Filters */}
            <Card className="border-amber-100 bg-white">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
                    <Input
                      placeholder="Cerca per nome o email..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-9 border-amber-200 focus:border-amber-400 focus:ring-amber-400/20 bg-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSearch}
                      className="bg-amber-600 hover:bg-amber-700 text-white h-9"
                    >
                      <Search className="h-3.5 w-3.5 mr-1" />
                      Cerca
                    </Button>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-[140px] border-amber-200 bg-white text-amber-700">
                        <Filter className="h-3.5 w-3.5 mr-1" />
                        <SelectValue placeholder="Ruolo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti i ruoli</SelectItem>
                        <SelectItem value="STUDENT">Studenti</SelectItem>
                        <SelectItem value="TEACHER">Docenti</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px] border-amber-200 bg-white text-amber-700">
                        <SelectValue placeholder="Stato" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti gli stati</SelectItem>
                        <SelectItem value="ACTIVE">Attivi</SelectItem>
                        <SelectItem value="PENDING">In attesa</SelectItem>
                        <SelectItem value="SUSPENDED">Sospesi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users table */}
            <Card className="border-amber-100 bg-white">
              <CardHeader>
                <CardTitle className="text-base text-amber-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-600" />
                  Tutti gli utenti
                </CardTitle>
                <CardDescription>
                  {pagination.total} utent{pagination.total === 1 ? 'e' : 'i'} trovati
                  {pagination.totalPages > 1 && ` — Pagina ${currentPage} di ${pagination.totalPages}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
                  </div>
                ) : allUsers.length === 0 ? (
                  <div className="text-center py-12 text-amber-600/50">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-medium">Nessun utente trovato</p>
                    <p className="text-xs mt-1">Prova a modificare i filtri</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile: Card layout */}
                    <div className="sm:hidden space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                      {allUsers.map((u) => (
                        <div key={u.id} className="p-4 rounded-lg border border-amber-100 bg-amber-50/30 space-y-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-amber-200">
                              <AvatarFallback className="bg-amber-100 text-amber-700 text-sm">
                                {u.name?.charAt(0)?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-amber-900 text-sm truncate">{u.name}</p>
                              <p className="text-amber-700/60 text-xs truncate">{u.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pl-[52px]">
                            {getRoleBadge(u.role)}
                            {getStatusBadge(u.status)}
                          </div>
                          {u.institution && (
                            <p className="text-xs text-amber-600/70 pl-[52px]">{u.institution}</p>
                          )}
                          {u.role !== 'ADMIN' && (
                            <div className="flex items-center gap-2 pl-[52px]">
                              {u.status === 'PENDING' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveTeacher(u.id)}
                                    disabled={actionLoading === u.id}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs flex-1"
                                  >
                                    {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                    Approva
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRejectTeacher(u.id)}
                                    disabled={actionLoading === u.id}
                                    className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-8 text-xs flex-1"
                                  >
                                    {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                                    Rifiuta
                                  </Button>
                                </>
                              )}
                              {u.status === 'ACTIVE' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSuspendUser(u.id)}
                                  disabled={actionLoading === u.id}
                                  className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-8 text-xs"
                                >
                                  {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                                  Sospendi
                                </Button>
                              )}
                              {u.status === 'SUSPENDED' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleReactivateUser(u.id)}
                                  disabled={actionLoading === u.id}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                                >
                                  {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                                  Riattiva
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desktop: Table layout */}
                    <div className="hidden sm:block max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-amber-100 hover:bg-transparent">
                            <TableHead className="text-amber-700">Nome</TableHead>
                            <TableHead className="text-amber-700">Email</TableHead>
                            <TableHead className="text-amber-700">Ruolo</TableHead>
                            <TableHead className="text-amber-700">Stato</TableHead>
                            <TableHead className="text-amber-700 hidden lg:table-cell">Istituto</TableHead>
                            <TableHead className="text-amber-700 hidden md:table-cell">Registrazione</TableHead>
                            <TableHead className="text-amber-700 text-right">Azioni</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allUsers.map((u) => (
                            <TableRow key={u.id} className="border-amber-50 hover:bg-amber-50/50">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8 border border-amber-200">
                                    <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                                      {u.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-amber-900 text-sm">{u.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-amber-700/70 text-sm">{u.email}</TableCell>
                              <TableCell>{getRoleBadge(u.role)}</TableCell>
                              <TableCell>{getStatusBadge(u.status)}</TableCell>
                              <TableCell className="text-amber-700/70 text-sm hidden lg:table-cell">
                                {u.institution || '—'}
                              </TableCell>
                              <TableCell className="text-amber-700/70 text-sm hidden md:table-cell">
                                {formatDate(u.createdAt)}
                              </TableCell>
                              <TableCell className="text-right">
                                {u.role !== 'ADMIN' && (
                                  u.status === 'PENDING' ? (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <Button
                                        size="sm"
                                        onClick={() => handleApproveTeacher(u.id)}
                                        disabled={actionLoading === u.id}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                                      >
                                        {actionLoading === u.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                        )}
                                        Approva
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRejectTeacher(u.id)}
                                        disabled={actionLoading === u.id}
                                        className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-8 text-xs"
                                      >
                                        {actionLoading === u.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <XCircle className="h-3.5 w-3.5" />
                                        )}
                                        Rifiuta
                                      </Button>
                                    </div>
                                  ) : u.status === 'ACTIVE' ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSuspendUser(u.id)}
                                      disabled={actionLoading === u.id}
                                      className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-8 text-xs"
                                    >
                                      {actionLoading === u.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <UserX className="h-3.5 w-3.5" />
                                      )}
                                      Sospendi
                                    </Button>
                                  ) : u.status === 'SUSPENDED' ? (
                                    <Button
                                      size="sm"
                                      onClick={() => handleReactivateUser(u.id)}
                                      disabled={actionLoading === u.id}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                                    >
                                      {actionLoading === u.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <UserCheck className="h-3.5 w-3.5" />
                                      )}
                                      Riattiva
                                    </Button>
                                  ) : null
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination controls */}
                    {pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t border-amber-100 mt-4">
                        <p className="text-xs text-amber-600/60">
                          Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, pagination.total)} di {pagination.total}
                        </p>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage <= 1}
                            className="h-8 w-8 p-0 border-amber-200 text-amber-700"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (pagination.totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= pagination.totalPages - 2) {
                              pageNum = pagination.totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                size="sm"
                                variant={currentPage === pageNum ? 'default' : 'outline'}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`h-8 w-8 p-0 ${
                                  currentPage === pageNum
                                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                                    : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                }`}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                            disabled={currentPage >= pagination.totalPages}
                            className="h-8 w-8 p-0 border-amber-200 text-amber-700"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Statistiche */}
          <TabsContent value="stats" className="mt-4 space-y-4">
            {/* Overview cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-amber-100 bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100">
                      <Users className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-900">{stats.totalUsers}</p>
                      <p className="text-xs text-amber-600/60">Totale utenti</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-100 bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100">
                      <GraduationCap className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-900">{stats.totalStudents}</p>
                      <p className="text-xs text-amber-600/60">Studenti</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-100 bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100">
                      <UserCheck className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-900">{stats.totalTeachers}</p>
                      <p className="text-xs text-amber-600/60">Docenti</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-100 bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-100">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-900">{stats.pendingApprovals}</p>
                      <p className="text-xs text-amber-600/60">In attesa</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Role distribution */}
              <Card className="border-amber-100 bg-white">
                <CardHeader>
                  <CardTitle className="text-base text-amber-900 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-amber-600" />
                    Distribuzione ruoli
                  </CardTitle>
                  <CardDescription>Distribuzione degli utenti per ruolo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {roleDistribution.map((role) => (
                    <div key={role.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-amber-800 font-medium">{role.label}</span>
                        <span className="text-amber-600 font-semibold">{role.count}</span>
                      </div>
                      <div className={`h-3 rounded-full ${role.bgColor} overflow-hidden`}>
                        <motion.div
                          className={`h-full rounded-full ${role.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${maxCount > 0 ? (role.count / maxCount) * 100 : 0}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' as const }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Status breakdown */}
                  <div className="pt-4 border-t border-amber-100">
                    <p className="text-xs font-medium text-amber-700 mb-3">Suddivisione per stato</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 rounded-lg bg-green-50 border border-green-100">
                        <p className="text-lg font-bold text-green-700">
                          {allUsers.filter((u) => u.status === 'ACTIVE').length}
                        </p>
                        <p className="text-[10px] text-green-600">Attivi</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-yellow-50 border border-yellow-100">
                        <p className="text-lg font-bold text-yellow-700">
                          {allUsers.filter((u) => u.status === 'PENDING').length}
                        </p>
                        <p className="text-[10px] text-yellow-600">In attesa</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-red-50 border border-red-100">
                        <p className="text-lg font-bold text-red-700">
                          {allUsers.filter((u) => u.status === 'SUSPENDED').length}
                        </p>
                        <p className="text-[10px] text-red-600">Sospesi</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent registrations */}
              <Card className="border-amber-100 bg-white">
                <CardHeader>
                  <CardTitle className="text-base text-amber-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-600" />
                    Registrazioni recenti
                  </CardTitle>
                  <CardDescription>Ultimi utenti registrati</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentRegistrations.length === 0 ? (
                    <div className="text-center py-8 text-amber-600/50">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Nessuna registrazione</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {recentRegistrations.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-amber-100 hover:bg-amber-50 transition-colors"
                        >
                          <Avatar className="h-9 w-9 border border-amber-200">
                            <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                              {u.name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-amber-900 truncate">{u.name}</p>
                            <p className="text-xs text-amber-600/50 truncate">{u.email}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {getRoleBadge(u.role)}
                            <span className="text-[10px] text-amber-500 hidden sm:block">
                              {formatDate(u.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
