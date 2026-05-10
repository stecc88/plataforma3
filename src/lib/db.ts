// ─────────────────────────────────────────────────────────────
// ScribIA — Database Access Layer (Prisma-style API over Supabase)
// ─────────────────────────────────────────────────────────────
//
// This module provides a unified data access layer that:
//   1. Wraps Supabase queries with a Prisma-style API
//   2. Automatically converts camelCase (JS) ↔ snake_case (Supabase)
//   3. Falls back to demo-store when Supabase is not configured
//   4. Returns Record<string, unknown> with camelCase keys
//   5. Uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)
//
// Usage:
//   import { userOps, essayOps, ... } from '@/lib/db';
//   const user = await userOps.findUnique({ where: { email: 'a@b.it' } });
//   const essays = await essayOps.findMany({ where: { studentId: '...' } });
// ─────────────────────────────────────────────────────────────

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  isDemoMode,
  demoStore,
  generateTeacherCode,
  type DemoUser,
  type DemoEssay,
  type DemoSelfAssessment,
  type DemoTeacherNote,
  type DemoClassPreparation,
  type DemoEnrollment,
} from '@/lib/demo-store';

// ─── camelCase ↔ snake_case conversion utilities ────────────

/** Convert a string from camelCase to snake_case */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/** Convert a string from snake_case to camelCase */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/** Convert all keys of an object from camelCase to snake_case */
function toSnakeRecord<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toSnakeCase(key)] = value;
  }
  return result;
}

/** Convert all keys of an object from snake_case to camelCase */
function toCamelRecord(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toCamelCase(key)] = value;
  }
  return result;
}

// ─── DB Error class ─────────────────────────────────────────

export class DBError extends Error {
  code?: string;
  details?: string;

  constructor(message: string, code?: string, details?: string) {
    super(message);
    this.name = 'DBError';
    this.code = code;
    this.details = details;
  }
}

/** Build a DBError from a Supabase error object */
function fromSupabaseError(err: { message: string; code?: string; details?: string }, context: string): DBError {
  return new DBError(
    `${context}: ${err.message}`,
    err.code,
    err.details
  );
}

// ─── Query filter types ─────────────────────────────────────

export type WhereFilter = Record<string, unknown>;
export type OrderBy = { column: string; ascending?: boolean };
export type SelectFields = string | string[];

// ─── Generic operation options ──────────────────────────────

interface FindManyOptions {
  where?: WhereFilter;
  orderBy?: OrderBy | OrderBy[];
  limit?: number;
  offset?: number;
  select?: SelectFields;
  /** Supabase join select string, e.g. '*, users!essays_student_id_fkey(name)' */
  joinSelect?: string;
}

interface FindUniqueOptions {
  where: WhereFilter;
  select?: SelectFields;
  joinSelect?: string;
}

interface CreateOptions {
  data: Record<string, unknown>;
  select?: SelectFields;
  joinSelect?: string;
}

interface UpdateOptions {
  where: WhereFilter;
  data: Record<string, unknown>;
  select?: SelectFields;
  joinSelect?: string;
}

interface DeleteOptions {
  where: WhereFilter;
}

interface CountOptions {
  where?: WhereFilter;
}

// ─── Helper: resolve select string ──────────────────────────

function resolveSelect(select?: SelectFields, joinSelect?: string): string {
  if (joinSelect) return joinSelect;
  if (!select) return '*';
  if (typeof select === 'string') return select;
  return select.map(toSnakeCase).join(',');
}

// ─── Supabase query builder helpers ─────────────────────────

type SupabaseQuery = ReturnType<ReturnType<typeof supabase.from>['select']>;

/**
 * Apply where filter conditions to a Supabase query builder.
 * Supports: eq, neq, gt, gte, lt, lte, like, ilike, in, is
 */
function applyWhereFilter(
  query: SupabaseQuery,
  where: WhereFilter
): SupabaseQuery {
  let q = query;
  for (const [key, value] of Object.entries(where)) {
    const col = toSnakeCase(key);

    if (value === null) {
      q = q.is(col, null);
    } else if (Array.isArray(value)) {
      q = q.in(col, value);
    } else if (typeof value === 'object' && value !== null) {
      // Complex filter: { gt: 5 }, { like: '%test%' }, etc.
      const filterObj = value as Record<string, unknown>;
      for (const [op, opValue] of Object.entries(filterObj)) {
        switch (op) {
          case 'eq': q = q.eq(col, opValue as unknown); break;
          case 'neq': q = q.neq(col, opValue as unknown); break;
          case 'gt': q = q.gt(col, opValue as unknown); break;
          case 'gte': q = q.gte(col, opValue as unknown); break;
          case 'lt': q = q.lt(col, opValue as unknown); break;
          case 'lte': q = q.lte(col, opValue as unknown); break;
          case 'like': q = q.like(col, opValue as string); break;
          case 'ilike': q = q.ilike(col, opValue as string); break;
          case 'in': q = q.in(col, opValue as unknown[]); break;
          case 'is': q = q.is(col, opValue as unknown); break;
        }
      }
    } else {
      q = q.eq(col, value);
    }
  }
  return q;
}

/**
 * Apply orderBy to a Supabase query builder.
 */
function applyOrderBy(
  query: SupabaseQuery,
  orderBy?: OrderBy | OrderBy[]
): SupabaseQuery {
  if (!orderBy) return query;
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  let q = query;
  for (const o of orders) {
    q = q.order(toSnakeCase(o.column), { ascending: o.ascending ?? true });
  }
  return q;
}

// ─── Table operation factory (Supabase mode) ────────────────

interface TableOps {
  findUnique: (opts: FindUniqueOptions) => Promise<Record<string, unknown> | null>;
  findMany: (opts?: FindManyOptions) => Promise<Record<string, unknown>[]>;
  create: (opts: CreateOptions) => Promise<Record<string, unknown>>;
  update: (opts: UpdateOptions) => Promise<Record<string, unknown>>;
  deleteMany: (opts: DeleteOptions) => Promise<number>;
  count: (opts?: CountOptions) => Promise<number>;
}

/**
 * Create Supabase-backed table operations.
 */
function createSupabaseOps(tableName: string): TableOps {
  return {
    async findUnique(opts: FindUniqueOptions): Promise<Record<string, unknown> | null> {
      const selectStr = resolveSelect(opts.select, opts.joinSelect);
      let query = supabase.from(tableName).select(selectStr);

      // Apply where filters
      for (const [key, value] of Object.entries(opts.where)) {
        const col = toSnakeCase(key);
        if (value === null) {
          query = query.is(col, null);
        } else if (Array.isArray(value)) {
          query = query.in(col, value);
        } else {
          query = query.eq(col, value);
        }
      }

      const { data, error } = await query.single();

      if (error) {
        // PGRST116 = no rows found (not an error, return null)
        if (error.code === 'PGRST116') return null;
        throw fromSupabaseError(error, `findUnique on ${tableName}`);
      }

      return toCamelRecord(data as unknown as Record<string, unknown>);
    },

    async findMany(opts?: FindManyOptions): Promise<Record<string, unknown>[]> {
      const selectStr = resolveSelect(opts?.select, opts?.joinSelect);
      let query: SupabaseQuery = supabase.from(tableName).select(selectStr);

      if (opts?.where) {
        query = applyWhereFilter(query, opts.where);
      }

      if (opts?.orderBy) {
        query = applyOrderBy(query, opts.orderBy);
      }

      if (opts?.offset) {
        const limit = opts.limit || 100;
        query = query.range(opts.offset, opts.offset + limit - 1);
      } else if (opts?.limit) {
        query = query.limit(opts.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw fromSupabaseError(error, `findMany on ${tableName}`);
      }

      return (data || []).map((row: unknown) => toCamelRecord(row as Record<string, unknown>));
    },

    async create(opts: CreateOptions): Promise<Record<string, unknown>> {
      const snakeData = toSnakeRecord(opts.data);
      const selectStr = resolveSelect(opts.select, opts.joinSelect);
      const { data, error } = await supabase
        .from(tableName)
        .insert(snakeData)
        .select(selectStr)
        .single();

      if (error) {
        throw fromSupabaseError(error, `create on ${tableName}`);
      }

      return toCamelRecord(data as unknown as Record<string, unknown>);
    },

    async update(opts: UpdateOptions): Promise<Record<string, unknown>> {
      const snakeData = toSnakeRecord(opts.data);
      const selectStr = resolveSelect(opts.select, opts.joinSelect);
      let query = supabase.from(tableName).update(snakeData).select(selectStr);

      // Apply where filters
      for (const [key, value] of Object.entries(opts.where)) {
        const col = toSnakeCase(key);
        if (value === null) {
          query = query.is(col, null);
        } else if (Array.isArray(value)) {
          query = query.in(col, value);
        } else {
          query = query.eq(col, value);
        }
      }

      const { data, error } = await query.single();

      if (error) {
        throw fromSupabaseError(error, `update on ${tableName}`);
      }

      return toCamelRecord(data as unknown as Record<string, unknown>);
    },

    async deleteMany(opts: DeleteOptions): Promise<number> {
      // Use .select() before .delete() to get the deleted rows count
      let query = supabase.from(tableName).delete().select('id');

      for (const [key, value] of Object.entries(opts.where)) {
        const col = toSnakeCase(key);
        if (Array.isArray(value)) {
          query = query.in(col, value);
        } else {
          query = query.eq(col, value);
        }
      }

      const { data, error } = await query;

      if (error) {
        throw fromSupabaseError(error, `deleteMany on ${tableName}`);
      }

      return Array.isArray(data) ? data.length : 0;
    },

    async count(opts?: CountOptions): Promise<number> {
      let query = supabase.from(tableName).select('*', { count: 'exact', head: true });

      if (opts?.where) {
        query = applyWhereFilter(query, opts.where);
      }

      const { count, error } = await query;

      if (error) {
        throw fromSupabaseError(error, `count on ${tableName}`);
      }

      return count ?? 0;
    },
  };
}

// ─── Demo-store backed operations ───────────────────────────

/** Type-safe accessor for demo store arrays */
type DemoStoreAccessor = {
  users: DemoUser[];
  essays: DemoEssay[];
  selfAssessments: DemoSelfAssessment[];
  teacherNotes: DemoTeacherNote[];
  classPreparations: DemoClassPreparation[];
  enrollments: DemoEnrollment[];
};

/** Convert a demo-store record (snake_case) to camelCase Record */
function demoToCamel(item: unknown): Record<string, unknown> {
  return toCamelRecord(item as Record<string, unknown>);
}

/** Apply where filter to an in-memory array */
function filterArray<T extends Record<string, unknown>>(
  items: T[],
  where?: WhereFilter
): T[] {
  if (!where) return items;
  return items.filter((item) => {
    return Object.entries(where).every(([key, value]) => {
      const snakeKey = toSnakeCase(key);
      const itemVal = item[snakeKey];
      if (value === null) return itemVal === null || itemVal === undefined;
      if (Array.isArray(value)) return value.includes(itemVal);
      if (typeof value === 'object' && value !== null) {
        const filterObj = value as Record<string, unknown>;
        return Object.entries(filterObj).every(([op, opValue]) => {
          switch (op) {
            case 'eq': return itemVal === opValue;
            case 'neq': return itemVal !== opValue;
            case 'gt': return (itemVal as number) > (opValue as number);
            case 'gte': return (itemVal as number) >= (opValue as number);
            case 'lt': return (itemVal as number) < (opValue as number);
            case 'lte': return (itemVal as number) <= (opValue as number);
            case 'like': return String(itemVal).includes(String(opValue).replace(/%/g, ''));
            case 'ilike': return String(itemVal).toLowerCase().includes(String(opValue).replace(/%/g, '').toLowerCase());
            case 'in': return (opValue as unknown[]).includes(itemVal);
            case 'is': return itemVal === opValue;
            default: return true;
          }
        });
      }
      return itemVal === value;
    });
  });
}

/** Apply orderBy to an in-memory array */
function sortArray<T extends Record<string, unknown>>(
  items: T[],
  orderBy?: OrderBy | OrderBy[]
): T[] {
  if (!orderBy) return items;
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  const sorted = [...items];
  sorted.sort((a, b) => {
    for (const o of orders) {
      const col = toSnakeCase(o.column);
      const asc = o.ascending ?? true;
      const aVal = a[col];
      const bVal = b[col];
      if (aVal === bVal) continue;
      if (aVal == null) return asc ? -1 : 1;
      if (bVal == null) return asc ? 1 : -1;
      const cmp = aVal < bVal ? -1 : 1;
      return asc ? cmp : -cmp;
    }
    return 0;
  });
  return sorted;
}

/**
 * Create demo-store-backed table operations.
 */
function createDemoOps<K extends keyof DemoStoreAccessor>(storeKey: K): TableOps {
  const getStore = () => demoStore[storeKey] as unknown as Record<string, unknown>[];

  return {
    async findUnique(opts: FindUniqueOptions): Promise<Record<string, unknown> | null> {
      const items = getStore();
      const filtered = filterArray(items, opts.where);
      if (filtered.length === 0) return null;
      return demoToCamel(filtered[0]);
    },

    async findMany(opts?: FindManyOptions): Promise<Record<string, unknown>[]> {
      let items = getStore();
      items = filterArray(items, opts?.where);
      items = sortArray(items, opts?.orderBy);
      if (opts?.offset) items = items.slice(opts.offset);
      if (opts?.limit) items = items.slice(0, opts.limit);
      return items.map((item) => demoToCamel(item));
    },

    async create(opts: CreateOptions): Promise<Record<string, unknown>> {
      const store = getStore();
      const snakeData = toSnakeRecord(opts.data);
      store.push(snakeData as any);
      return demoToCamel(snakeData);
    },

    async update(opts: UpdateOptions): Promise<Record<string, unknown>> {
      const store = getStore();
      const filtered = filterArray(store, opts.where);
      if (filtered.length === 0) {
        throw new DBError(`update on ${storeKey}: no record found`);
      }
      const snakeData = toSnakeRecord(opts.data);
      const target = filtered[0];
      Object.assign(target, snakeData);
      return demoToCamel(target);
    },

    async deleteMany(opts: DeleteOptions): Promise<number> {
      const store = getStore();
      const before = store.length;
      const toDelete = filterArray(store, opts.where);
      for (const item of toDelete) {
        const idx = store.indexOf(item);
        if (idx >= 0) store.splice(idx, 1);
      }
      return before - store.length;
    },

    async count(opts?: CountOptions): Promise<number> {
      const store = getStore();
      return filterArray(store, opts?.where).length;
    },
  };
}

// ─── Mode-aware factory ─────────────────────────────────────

/**
 * Returns Supabase or demo-store operations depending on configuration.
 * This is called lazily on each operation so the mode can change at runtime.
 */
function getOps(tableName: string, storeKey: keyof DemoStoreAccessor): TableOps {
  const supabaseOps = createSupabaseOps(tableName);
  const demoOps = createDemoOps(storeKey);

  return {
    async findUnique(opts) {
      if (isDemoMode() || !isSupabaseConfigured()) {
        return demoOps.findUnique(opts);
      }
      return supabaseOps.findUnique(opts);
    },
    async findMany(opts?) {
      if (isDemoMode() || !isSupabaseConfigured()) {
        return demoOps.findMany(opts);
      }
      return supabaseOps.findMany(opts);
    },
    async create(opts) {
      if (isDemoMode() || !isSupabaseConfigured()) {
        return demoOps.create(opts);
      }
      return supabaseOps.create(opts);
    },
    async update(opts) {
      if (isDemoMode() || !isSupabaseConfigured()) {
        return demoOps.update(opts);
      }
      return supabaseOps.update(opts);
    },
    async deleteMany(opts) {
      if (isDemoMode() || !isSupabaseConfigured()) {
        return demoOps.deleteMany(opts);
      }
      return supabaseOps.deleteMany(opts);
    },
    async count(opts?) {
      if (isDemoMode() || !isSupabaseConfigured()) {
        return demoOps.count(opts);
      }
      return supabaseOps.count(opts);
    },
  };
}

// ─── Exported table operations ──────────────────────────────

/**
 * Users table operations.
 *
 * @example
 *   const user = await userOps.findUnique({ where: { email: 'a@b.it' } });
 *   const pending = await userOps.findMany({ where: { role: 'TEACHER', status: 'PENDING' } });
 *   const count = await userOps.count({ where: { role: 'STUDENT' } });
 */
export const userOps = getOps('users', 'users');

/**
 * Enrollments table operations.
 *
 * @example
 *   const enrollments = await enrollmentOps.findMany({ where: { teacherId: '...' } });
 *   const en = await enrollmentOps.create({ data: { teacherId: '...', studentId: '...', joinedAt: now } });
 */
export const enrollmentOps = getOps('enrollments', 'enrollments');

/**
 * Essays table operations.
 *
 * @example
 *   const essays = await essayOps.findMany({
 *     where: { studentId: '...' },
 *     orderBy: { column: 'createdAt', ascending: false },
 *     joinSelect: '*, users!essays_student_id_fkey(name)',
 *   });
 */
export const essayOps = getOps('essays', 'essays');

/**
 * Self-assessments table operations.
 *
 * @example
 *   const assessments = await selfAssessmentOps.findMany({ where: { essayId: '...' } });
 *   const a = await selfAssessmentOps.create({ data: { essayId: '...', ... } });
 */
export const selfAssessmentOps = getOps('self_assessments', 'selfAssessments');

/**
 * Teacher notes table operations.
 *
 * @example
 *   const notes = await teacherNoteOps.findMany({
 *     where: { teacherId: '...' },
 *     joinSelect: '*, users!teacher_notes_student_id_fkey(name)',
 *   });
 */
export const teacherNoteOps = getOps('teacher_notes', 'teacherNotes');

/**
 * Class preparations table operations.
 *
 * @example
 *   const preps = await classPreparationOps.findMany({
 *     where: { teacherId: '...' },
 *     orderBy: { column: 'createdAt', ascending: false },
 *   });
 */
export const classPreparationOps = getOps('class_preparations', 'classPreparations');

// ─── Convenience: is demo mode ──────────────────────────────

/** Check if the DB layer is running in demo mode */
export const dbIsDemoMode = (): boolean => isDemoMode() || !isSupabaseConfigured();

// ─── Convenience: expose generateTeacherCode ────────────────

export { generateTeacherCode };

// ─── Low-level Supabase access for advanced queries ─────────

/**
 * Direct access to the Supabase client for complex queries
 * that don't fit the Prisma-style API (e.g., RPC calls, joins).
 *
 * IMPORTANT: Always use the service_role client (bypasses RLS).
 * Results will NOT have camelCase conversion applied.
 */
export { supabase };

// ─── Utility: raw Supabase query with camelCase conversion ──

/**
 * Execute a Supabase query and return results with camelCase keys.
 * Useful for complex join queries that need manual construction.
 *
 * @example
 *   const data = await rawSupabaseQuery(
 *     supabase.from('essays').select('*, users!essays_student_id_fkey(name)').eq('id', essayId).single()
 *   );
 */
export async function rawSupabaseQuery<T extends Record<string, unknown>>(
  query: Promise<{ data: T | null; error: { message: string; code?: string; details?: string } | null }>
): Promise<Record<string, unknown>> {
  const { data, error } = await query;
  if (error) {
    throw fromSupabaseError(error, 'rawSupabaseQuery');
  }
  if (!data) {
    throw new DBError('rawSupabaseQuery: no data returned');
  }
  return toCamelRecord(data as Record<string, unknown>);
}

/**
 * Execute a Supabase query returning an array and convert each row.
 *
 * @example
 *   const rows = await rawSupabaseQueryMany(
 *     supabase.from('essays').select('*, users!essays_student_id_fkey(name)').eq('student_id', id)
 *   );
 */
export async function rawSupabaseQueryMany<T extends Record<string, unknown>>(
  query: Promise<{ data: T[] | null; error: { message: string; code?: string; details?: string } | null }>
): Promise<Record<string, unknown>[]> {
  const { data, error } = await query;
  if (error) {
    throw fromSupabaseError(error, 'rawSupabaseQueryMany');
  }
  return (data || []).map((row) => toCamelRecord(row as Record<string, unknown>));
}
