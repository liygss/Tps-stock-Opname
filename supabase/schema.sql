-- ============================================================
--  PT TPS Stock Opname — skema Supabase
--  Jalankan seluruh isi file ini di Supabase SQL Editor.
-- ============================================================

-- ---------- Tabel: Data Barang ----------
create table if not exists public.items (
  id       text primary key,          -- = kode barang
  kode     text not null unique,
  akun     text default '',
  nama     text not null,
  kat      text default '',
  satuan   text not null,
  gudang   text default '',
  lokasi   text default '',
  upd      timestamptz default now()
);

-- ---------- Tabel: Stock Opname ----------
create table if not exists public.so (
  id       text primary key,
  no       text not null,
  tgl      timestamptz not null default now(),
  akun     text default '',
  gudang   text not null default '',
  kode     text not null,
  nama     text,
  satuan   text,
  fisik    numeric not null default 0,
  foto     text default '',
  foto_id  text default ''
);

create index if not exists so_kode_idx on public.so (kode);
create index if not exists so_no_idx   on public.so (no);
create index if not exists so_tgl_idx  on public.so (tgl desc);

-- Kode barang hanya boleh 1 entri per BULAN (periode YYYY-MM dari tgl).
-- Hapus aturan unik global lama (bila pernah terpasang):
drop index if exists public.so_kode_uidx;

-- Buat unique per (kode, bulan). Amankan bila masih ada dobel di bulan sama.
do $$
begin
  if not exists (
    select 1 from public.so
    group by kode, to_char(tgl at time zone 'UTC', 'YYYY-MM')
    having count(*) > 1
  ) then
    create unique index if not exists so_kode_periode_uidx
      on public.so (kode, (to_char(tgl at time zone 'UTC', 'YYYY-MM')));
  else
    raise notice 'Unique (kode, bulan) dilewati: masih ada kode dobel di bulan yang sama.';
  end if;
end $$;

-- ---------- Row Level Security (akses terbuka utk anon) ----------
alter table public.items enable row level security;
alter table public.so    enable row level security;

drop policy if exists "items anon all" on public.items;
create policy "items anon all" on public.items
  for all to anon using (true) with check (true);

drop policy if exists "so anon all" on public.so;
create policy "so anon all" on public.so
  for all to anon using (true) with check (true);

-- ---------- Realtime ----------
do $$
begin
  begin
    alter publication supabase_realtime add table public.items;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.so;
  exception when duplicate_object then null;
  end;
end $$;

-- ---------- Storage bucket "foto" ----------
insert into storage.buckets (id, name, public)
values ('foto', 'foto', true)
on conflict (id) do update set public = true;

drop policy if exists "foto public read"  on storage.objects;
create policy "foto public read" on storage.objects
  for select using (bucket_id = 'foto');

drop policy if exists "foto anon insert" on storage.objects;
create policy "foto anon insert" on storage.objects
  for insert to anon with check (bucket_id = 'foto');

drop policy if exists "foto anon update" on storage.objects;
create policy "foto anon update" on storage.objects
  for update to anon using (bucket_id = 'foto');

drop policy if exists "foto anon delete" on storage.objects;
create policy "foto anon delete" on storage.objects
  for delete to anon using (bucket_id = 'foto');
