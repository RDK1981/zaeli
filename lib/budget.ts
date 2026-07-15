/**
 * lib/budget.ts — Our Budget persistence (Session 30 backend migration)
 *
 * Wires the 4 Budget state slices to Supabase. Every mutation in
 * our-budget.tsx routes through a save* / delete* helper here so nothing
 * is lost on restart, and Anna/Rich see each other's edits.
 *
 * Table shape lives in supabase-budget-tables.sql. RLS scopes everything
 * to the caller's family_id via public.current_family_id() (Session 21
 * pattern) — the client never has to filter manually.
 *
 * Types mirror the interfaces in our-budget.tsx exactly so the render
 * code needs no changes beyond the load / save call sites.
 */

import { supabase } from './supabase';
import { getFamilyId } from './family';

// ── UUID helper ─────────────────────────────────────────────────────────────
// RN's Hermes engine has no reliable crypto.randomUUID; same inline function
// used in app/(tabs)/index.tsx for calendar recurring events. Exported so
// callers can generate IDs that match the UUID column type in Postgres.
export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ── Types (mirror our-budget.tsx interfaces) ────────────────────────────────
export interface IncomeStream {
  id:            string;
  label:         string;
  type:          string;
  monthlyAmount: number;
  memberId?:     string;
}

export interface Category {
  id:              string;
  name:            string;
  emoji:           string;
  type:            'fixed' | 'variable';
  monthlyTarget?:  number;
  sortOrder:       number;
}

export interface LineItem {
  id:            string;
  categoryId:    string;
  label:         string;
  monthlyAmount: number;
}

export interface Goal {
  id:                    string;
  name:                  string;
  emoji:                 string;
  saved:                 number;
  target:                number;
  targetDate:            string;
  monthlyContribution:   number;
}

export interface BudgetState {
  streams:   IncomeStream[];
  categories: Category[];
  lineItems:  LineItem[];
  goals:      Goal[];
}

// ── Row → App mappers ───────────────────────────────────────────────────────
function rowToStream(r: any): IncomeStream {
  return {
    id:            r.id,
    label:         r.label,
    type:          r.type,
    monthlyAmount: Number(r.monthly_amount) || 0,
    memberId:      r.member_id ?? undefined,
  };
}
function rowToCategory(r: any): Category {
  return {
    id:            r.id,
    name:          r.name,
    emoji:         r.emoji,
    type:          r.type,
    monthlyTarget: r.monthly_target != null ? Number(r.monthly_target) : undefined,
    sortOrder:     Number(r.sort_order) || 0,
  };
}
function rowToLineItem(r: any): LineItem {
  return {
    id:            r.id,
    categoryId:    r.category_id,
    label:         r.label,
    monthlyAmount: Number(r.monthly_amount) || 0,
  };
}
function rowToGoal(r: any): Goal {
  return {
    id:                  r.id,
    name:                r.name,
    emoji:               r.emoji,
    saved:               Number(r.saved) || 0,
    target:              Number(r.target) || 0,
    targetDate:          r.target_date ?? '',
    monthlyContribution: Number(r.monthly_contribution) || 0,
  };
}

// ── LOAD ────────────────────────────────────────────────────────────────────
// Single call fetches all 4 slices in parallel. Empty result is expected for
// fresh families — the UI shows empty-state prompts (Add income, Add category
// etc). No auto-seed.
export async function loadBudget(): Promise<BudgetState> {
  const familyId = getFamilyId();
  if (!familyId) {
    console.log('[budget] loadBudget: no familyId, returning empty state');
    return { streams: [], categories: [], lineItems: [], goals: [] };
  }
  const [streamsRes, catsRes, itemsRes, goalsRes] = await Promise.all([
    supabase.from('income_streams').select('*').eq('family_id', familyId).order('created_at'),
    supabase.from('budget_categories').select('*').eq('family_id', familyId).order('sort_order').order('created_at'),
    supabase.from('category_line_items').select('*').eq('family_id', familyId).order('created_at'),
    supabase.from('savings_goals').select('*').eq('family_id', familyId).order('created_at'),
  ]);
  if (streamsRes.error) console.log('[budget] streams load error:', streamsRes.error.message);
  if (catsRes.error)    console.log('[budget] categories load error:', catsRes.error.message);
  if (itemsRes.error)   console.log('[budget] line items load error:', itemsRes.error.message);
  if (goalsRes.error)   console.log('[budget] goals load error:', goalsRes.error.message);
  return {
    streams:    (streamsRes.data ?? []).map(rowToStream),
    categories: (catsRes.data ?? []).map(rowToCategory),
    lineItems:  (itemsRes.data ?? []).map(rowToLineItem),
    goals:      (goalsRes.data ?? []).map(rowToGoal),
  };
}

// ── INCOME STREAMS ──────────────────────────────────────────────────────────
// Upsert semantics: caller passes the app-shape object. We map to DB shape
// and let Postgres decide insert-vs-update by primary key. Returns the saved
// row (with any server defaults applied) so the caller can update local state.
export async function saveIncomeStream(s: IncomeStream): Promise<IncomeStream | null> {
  const familyId = getFamilyId();
  if (!familyId) return null;
  const row = {
    id:              s.id,
    family_id:       familyId,
    label:           s.label,
    type:            s.type,
    monthly_amount:  s.monthlyAmount,
    member_id:       s.memberId ?? null,
    updated_at:      new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('income_streams')
    .upsert(row, { onConflict: 'id' })
    .select()
    .maybeSingle();
  if (error) { console.log('[budget] saveIncomeStream error:', error.message); return null; }
  return data ? rowToStream(data) : null;
}

export async function deleteIncomeStream(id: string): Promise<boolean> {
  const { error } = await supabase.from('income_streams').delete().eq('id', id);
  if (error) { console.log('[budget] deleteIncomeStream error:', error.message); return false; }
  return true;
}

// ── CATEGORIES ──────────────────────────────────────────────────────────────
export async function saveCategory(c: Category): Promise<Category | null> {
  const familyId = getFamilyId();
  if (!familyId) return null;
  const row = {
    id:              c.id,
    family_id:       familyId,
    name:            c.name,
    emoji:           c.emoji,
    type:            c.type,
    monthly_target:  c.monthlyTarget ?? null,
    sort_order:      c.sortOrder,
    updated_at:      new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('budget_categories')
    .upsert(row, { onConflict: 'id' })
    .select()
    .maybeSingle();
  if (error) { console.log('[budget] saveCategory error:', error.message); return null; }
  return data ? rowToCategory(data) : null;
}

export async function deleteCategory(id: string): Promise<boolean> {
  // ON DELETE CASCADE on category_line_items.category_id handles item cleanup.
  const { error } = await supabase.from('budget_categories').delete().eq('id', id);
  if (error) { console.log('[budget] deleteCategory error:', error.message); return false; }
  return true;
}

// ── LINE ITEMS ──────────────────────────────────────────────────────────────
export async function saveLineItem(li: LineItem): Promise<LineItem | null> {
  const familyId = getFamilyId();
  if (!familyId) return null;
  const row = {
    id:              li.id,
    family_id:       familyId,
    category_id:     li.categoryId,
    label:           li.label,
    monthly_amount:  li.monthlyAmount,
    updated_at:      new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('category_line_items')
    .upsert(row, { onConflict: 'id' })
    .select()
    .maybeSingle();
  if (error) { console.log('[budget] saveLineItem error:', error.message); return null; }
  return data ? rowToLineItem(data) : null;
}

export async function deleteLineItem(id: string): Promise<boolean> {
  const { error } = await supabase.from('category_line_items').delete().eq('id', id);
  if (error) { console.log('[budget] deleteLineItem error:', error.message); return false; }
  return true;
}

// ── GOALS ───────────────────────────────────────────────────────────────────
export async function saveGoal(g: Goal): Promise<Goal | null> {
  const familyId = getFamilyId();
  if (!familyId) return null;
  const row = {
    id:                     g.id,
    family_id:              familyId,
    name:                   g.name,
    emoji:                  g.emoji,
    saved:                  g.saved,
    target:                 g.target,
    target_date:            g.targetDate || null,
    monthly_contribution:   g.monthlyContribution,
    updated_at:             new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('savings_goals')
    .upsert(row, { onConflict: 'id' })
    .select()
    .maybeSingle();
  if (error) { console.log('[budget] saveGoal error:', error.message); return null; }
  return data ? rowToGoal(data) : null;
}

export async function deleteGoal(id: string): Promise<boolean> {
  const { error } = await supabase.from('savings_goals').delete().eq('id', id);
  if (error) { console.log('[budget] deleteGoal error:', error.message); return false; }
  return true;
}
