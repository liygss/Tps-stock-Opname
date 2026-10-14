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

// Upsert massal per batch (jauh lebih cepat & andal daripada per-baris).
export async function saveMany(table, rows, chunk = 500, onProgress) {
  let ok = 0, fail = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error } = await supabase.from(table).upsert(slice);
    if (error) fail += slice.length; else ok += slice.length;
    if (onProgress) onProgress(Math.min(i + chunk, rows.length), rows.length);
  }
  return { ok, fail };
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
