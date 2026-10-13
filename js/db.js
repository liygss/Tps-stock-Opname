import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function listAll() {
  const [items, so] = await Promise.all([
    supabase.from('items').select('*'),
    supabase.from('so').select('*')
  ]);
  if (items.error) throw items.error;
  if (so.error) throw so.error;
  return { items: items.data ?? [], so: so.data ?? [] };
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
