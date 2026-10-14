import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PAGE = 1000;

// Ambil SEMUA baris dengan paging (Supabase default membatasi 1000 baris/request).
export async function fetchAll(table) {
  let from = 0, out = [];
  for (;;) {
    const { data, error } = await supabase.from(table).select('*').order('id', { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw error;
    out = out.concat(data ?? []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
    if (from > 500000) break;
  }
  return out;
}

export async function listAll() {
  const [items, so] = await Promise.all([fetchAll('items'), fetchAll('so')]);
  return { items, so };
}

// Upsert massal per batch, tahan gagal: retry -> pecah 2 -> per-baris.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function upsertChunk(table, chunk) {
  const { error } = await supabase.from(table).upsert(chunk);
  if (error) throw error;
}
async function saveChunk(table, chunk, failed) {
  try { await upsertChunk(table, chunk); return chunk.length; }
  catch (e) {
    if (chunk.length === 1) { failed.push(chunk[0]); return 0; }
    const half = Math.ceil(chunk.length / 2);
    const a = await saveChunk(table, chunk.slice(0, half), failed);
    await sleep(120);
    const b = await saveChunk(table, chunk.slice(half), failed);
    return a + b;
  }
}
export async function saveMany(table, rows, chunk = 250, onProgress) {
  let ok = 0; const failed = [];
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    let done = 0;
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      try { await upsertChunk(table, slice); done = slice.length; }
      catch (e) { await sleep(200 * attempt); }
    }
    if (!done) done = await saveChunk(table, slice, failed);
    ok += done;
    if (onProgress) onProgress(Math.min(i + chunk, rows.length), rows.length);
    await sleep(100);
  }
  return { ok, fail: failed.length, failedIds: failed.map((r) => r.id) };
}

export async function count(table) {
  const { count: n, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
  if (error) throw error;
  return n ?? 0;
}

export function subscribeAll(onChange) {
  return supabase
    .channel('sync-tps')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'so' }, onChange)
    .subscribe();
}

export async function save(table, row) {
  const { error } = await supabase.from(table).upsert(row);
  if (error) throw error;
}

export async function del(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

export async function delAll(table) {
  const { error } = await supabase.from(table).delete().gte('id', '');
  if (error) throw error;
}

export async function uploadFoto(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, id: path };
}

export async function deleteFoto(path) {
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}

export async function deleteFotoMany(paths) {
  const list = (paths || []).filter(Boolean);
  for (let i = 0; i < list.length; i += 100) {
    await supabase.storage.from(BUCKET).remove(list.slice(i, i + 100));
  }
}
