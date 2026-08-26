/**
 * Drop-in replacement for the `@supabase/supabase-js` surface this app used
 * (auth, table queries, rpc, realtime channels) backed by the ZURB API
 * (server/ in this repo). Query builders are thenable and resolve to
 * `{ data, error }` exactly like PostgREST responses did.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface User { id: string; email: string }
export interface Session { access_token: string; token_type: string; user: User }
export interface ApiError { message: string; code?: string; details?: string }
export type AuthChangeEvent = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED';

const DEFAULT_PROD_API = 'https://zurbstudio.zenoah.org';

export function apiBaseUrl(): string {
  const env = (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (env) return env;
  if (Platform.OS === 'web') return ''; // same origin
  return DEFAULT_PROD_API;
}

// ------------------------------------------------------------------ storage
const SESSION_KEY = 'zurb.session';

async function storageGet(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
    return await AsyncStorage.getItem(SESSION_KEY);
  } catch { return null; }
}
async function storageSet(value: string | null) {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') return;
      if (value === null) localStorage.removeItem(SESSION_KEY); else localStorage.setItem(SESSION_KEY, value);
      return;
    }
    if (value === null) await AsyncStorage.removeItem(SESSION_KEY); else await AsyncStorage.setItem(SESSION_KEY, value);
  } catch {}
}

// ------------------------------------------------------------------ auth state
let currentSession: Session | null = null;
let sessionLoaded: Promise<void> | null = null;
const authListeners = new Set<(event: AuthChangeEvent, session: Session | null) => void>();

function loadSession(): Promise<void> {
  if (!sessionLoaded) {
    sessionLoaded = (async () => {
      const raw = await storageGet();
      if (raw) { try { currentSession = JSON.parse(raw); } catch { currentSession = null; } }
    })();
  }
  return sessionLoaded;
}

async function setSession(session: Session | null, event: AuthChangeEvent) {
  currentSession = session;
  await storageSet(session ? JSON.stringify(session) : null);
  for (const l of Array.from(authListeners)) { try { l(event, session); } catch (e) { console.error('[auth] listener error', e); } }
}

// ------------------------------------------------------------------ http
async function request<T = any>(path: string, body: any = {}, opts: { auth?: boolean } = {}): Promise<{ status: number; json: T }> {
  await loadSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.auth !== false && currentSession?.access_token) headers.Authorization = `Bearer ${currentSession.access_token}`;
  const res = await fetch(`${apiBaseUrl()}${path}`, { method: 'POST', headers, body: JSON.stringify(body ?? {}) });
  let json: any = null;
  try { json = await res.json(); } catch { json = null; }
  if (res.status === 401 && opts.auth !== false && currentSession) {
    // Token expired / revoked → behave like Supabase: sign the user out.
    await setSession(null, 'SIGNED_OUT');
  }
  return { status: res.status, json };
}

// ------------------------------------------------------------------ realtime emulation
type ChangeCallback = (payload: any) => void;
interface Subscription { table: string; cb: ChangeCallback }
class RealtimeChannel {
  subs: Subscription[] = [];
  constructor(public name: string) {}
  on(_event: string, filter: { table?: string; event?: string; schema?: string; filter?: string }, cb: ChangeCallback) {
    if (filter?.table) this.subs.push({ table: filter.table, cb });
    return this;
  }
  subscribe(cb?: (status: string) => void) { channels.add(this); cb?.('SUBSCRIBED'); return this; }
  unsubscribe() { channels.delete(this); return Promise.resolve('ok'); }
}
const channels = new Set<RealtimeChannel>();
const pending = new Map<string, ReturnType<typeof setTimeout>>();

/** Notify subscribers that `tables` changed (coalesced per table). */
export function emitChanged(tables: string[] | undefined) {
  for (const t of tables || []) {
    if (pending.has(t)) continue;
    pending.set(t, setTimeout(() => {
      pending.delete(t);
      for (const ch of Array.from(channels)) for (const s of ch.subs) if (s.table === t) { try { s.cb({ table: t, eventType: '*' }); } catch (e) { console.error('[realtime] callback error', e); } }
    }, 50));
  }
}

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  // Cheap cross-device freshness: refresh everything when the tab regains focus.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentSession) {
      const tables = new Set<string>();
      for (const ch of Array.from(channels)) for (const s of ch.subs) tables.add(s.table);
      emitChanged(Array.from(tables));
    }
  });
}

// ------------------------------------------------------------------ query builder
type Filter = { col: string; op: string; value: any };

class QueryBuilder<R = any[]> implements PromiseLike<{ data: R; error: ApiError | null }> {
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private columns = '*';
  private filters: Filter[] = [];
  private orders: { col: string; ascending: boolean }[] = [];
  private limitN: number | null = null;
  private singleMode: 'single' | 'maybeSingle' | null = null;
  private rows: any = null;
  private values: any = null;
  private returning = false;

  constructor(private table: string) {}

  select(columns: string = '*') {
    if (this.op === 'select') this.columns = columns; else { this.returning = true; }
    return this;
  }
  insert(rows: any) { this.op = 'insert'; this.rows = rows; return this; }
  upsert(rows: any) { this.op = 'insert'; this.rows = rows; return this; }
  update(values: any) { this.op = 'update'; this.values = values; return this; }
  delete() { this.op = 'delete'; return this; }

  eq(col: string, value: any) { this.filters.push({ col, op: 'eq', value }); return this; }
  neq(col: string, value: any) { this.filters.push({ col, op: 'neq', value }); return this; }
  gt(col: string, value: any) { this.filters.push({ col, op: 'gt', value }); return this; }
  gte(col: string, value: any) { this.filters.push({ col, op: 'gte', value }); return this; }
  lt(col: string, value: any) { this.filters.push({ col, op: 'lt', value }); return this; }
  lte(col: string, value: any) { this.filters.push({ col, op: 'lte', value }); return this; }
  like(col: string, value: any) { this.filters.push({ col, op: 'like', value }); return this; }
  ilike(col: string, value: any) { this.filters.push({ col, op: 'ilike', value }); return this; }
  is(col: string, value: any) { this.filters.push({ col, op: 'is', value }); return this; }
  in(col: string, values: any[]) { this.filters.push({ col, op: 'in', value: values }); return this; }
  match(obj: Record<string, any>) { for (const [k, v] of Object.entries(obj)) this.eq(k, v); return this; }
  order(col: string, opts: { ascending?: boolean } = {}) { this.orders.push({ col, ascending: opts.ascending !== false }); return this; }
  limit(n: number) { this.limitN = n; return this; }
  single(): QueryBuilder<any> { this.singleMode = 'single'; this.returning = true; return this as unknown as QueryBuilder<any>; }
  maybeSingle(): QueryBuilder<any> { this.singleMode = 'maybeSingle'; this.returning = true; return this as unknown as QueryBuilder<any>; }

  private async execute(): Promise<{ data: R; error: ApiError | null }> {
    let body: any;
    switch (this.op) {
      case 'select': body = { columns: this.columns, filters: this.filters, order: this.orders, limit: this.limitN, single: this.singleMode }; break;
      case 'insert': body = { rows: this.rows, returning: this.returning }; break;
      case 'update': body = { values: this.values, filters: this.filters, returning: this.returning }; break;
      case 'delete': body = { filters: this.filters, returning: this.returning }; break;
    }
    try {
      const { status, json } = await request(`/api/db/${this.table}/${this.op}`, body);
      if (!json || (status >= 400 && !json.error)) return { data: null as unknown as R, error: { message: `Request failed (${status})`, code: String(status) } };
      if (json.error) return { data: null as unknown as R, error: json.error };
      if (json.changed) emitChanged(json.changed);
      let data = json.data;
      if (this.op !== 'select') {
        if (!this.returning) data = null;
        else if (this.singleMode) {
          const arr = Array.isArray(data) ? data : data ? [data] : [];
          if (this.singleMode === 'single' && arr.length !== 1) return { data: null as unknown as R, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } };
          data = arr[0] ?? null;
        }
      }
      return { data: data as R, error: null };
    } catch (e: any) {
      return { data: null as unknown as R, error: { message: e?.message || 'Network request failed', code: 'network' } };
    }
  }

  then<R1 = any, R2 = never>(
    onfulfilled?: ((value: { data: R; error: ApiError | null }) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: any) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// ------------------------------------------------------------------ auth api
const auth = {
  async getSession(): Promise<{ data: { session: Session | null }; error: ApiError | null }> {
    await loadSession();
    if (!currentSession) return { data: { session: null }, error: null };
    // Validate against the server (drops stale tokens after a redeploy / secret rotation).
    try {
      const res = await fetch(`${apiBaseUrl()}/api/auth/session`, { headers: { Authorization: `Bearer ${currentSession.access_token}` } });
      const json = await res.json();
      if (res.ok && json?.data?.session) { currentSession = json.data.session; await storageSet(JSON.stringify(currentSession)); }
      else if (res.ok && json?.data && json.data.session === null) { await setSession(null, 'SIGNED_OUT'); }
    } catch { /* offline: keep the cached session */ }
    return { data: { session: currentSession }, error: null };
  },
  onAuthStateChange(cb: (event: AuthChangeEvent, session: Session | null) => void) {
    authListeners.add(cb);
    return { data: { subscription: { unsubscribe: () => { authListeners.delete(cb); } } } };
  },
  async signUp({ email, password }: { email: string; password: string }) {
    const { json } = await request('/api/auth/signup', { email, password }, { auth: false });
    if (!json || json.error) return { data: null, error: json?.error || { message: 'Sign up failed' } };
    await setSession(json.data.session, 'SIGNED_IN');
    return { data: json.data, error: null };
  },
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const { json } = await request('/api/auth/login', { email, password }, { auth: false });
    if (!json || json.error) return { data: null, error: json?.error || { message: 'Sign in failed' } };
    await setSession(json.data.session, 'SIGNED_IN');
    return { data: json.data, error: null };
  },
  async signOut(): Promise<{ error: ApiError | null }> {
    try { await request('/api/auth/logout', {}); } catch {}
    await setSession(null, 'SIGNED_OUT');
    return { error: null };
  },
  async resetPasswordForEmail(email: string, _opts?: { redirectTo?: string }) {
    const { json } = await request('/api/auth/reset-password', { email }, { auth: false });
    if (!json || json.error) return { data: null, error: json?.error || { message: 'Could not send reset email' } };
    return { data: {}, error: null };
  },
  getUser(): User | null { return currentSession?.user ?? null; },
};

// ------------------------------------------------------------------ public client
export const supabase = {
  auth,
  from(table: string) { return new QueryBuilder<any[]>(table); },
  async rpc(fn: string, params: any = {}) {
    const { status, json } = await request(`/api/rpc/${fn}`, params);
    if (!json || json.error) return { data: null, error: json?.error || { message: `RPC failed (${status})` } };
    if (json.changed) emitChanged(json.changed);
    return { data: json.data, error: null };
  },
  channel(name: string) { return new RealtimeChannel(name); },
  removeChannel(ch: RealtimeChannel) { ch.unsubscribe(); return Promise.resolve('ok'); },
  removeAllChannels() { channels.clear(); return Promise.resolve([]); },
};

/** Authenticated POST helper for the non-table endpoints (AI, duplication). */
export async function apiPost<T = any>(path: string, body: any = {}): Promise<T> {
  const { status, json } = await request(path, body);
  if (json?.changed) emitChanged(json.changed);
  if (!json) throw new Error(`Request failed (${status})`);
  if (status >= 400 || json.error) {
    const err = json.error;
    throw new Error(typeof err === 'string' ? err : err?.message || `Request failed (${status})`);
  }
  return json as T;
}
