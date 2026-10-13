# PT TPS Stock Opname (Supabase)

Aplikasi Stock Opname dengan database **Supabase** (Postgres + Storage).
Frontend statis di `public/`, skema database di `supabase/schema.sql`.

## Struktur

```
public/
  index.html          shell halaman
  css/style.css
  js/config.js        -> isi URL & anon key Supabase
  js/db.js            lapisan data (items, so, foto, realtime)
  js/export.js        export Excel/PDF + template impor
  js/ui.js            helper DOM + toast + modal
  js/logo.js          logo (base64)
  js/app.js           UI + logika aplikasi
supabase/
  schema.sql          tabel, index, RLS, bucket storage
```

## Setup

1. **Buat proyek di [supabase.com](https://supabase.com).**
2. Buka **SQL Editor**, tempel isi `supabase/schema.sql`, lalu **Run**.
   Ini membuat tabel `items` & `so`, mengaktifkan realtime, dan membuat bucket storage `foto`.
3. Buka **Project Settings > API**, salin **Project URL** dan **anon public key**.
4. Isi `public/js/config.js`:
   ```js
   export const SUPABASE_URL = 'https://xxxx.supabase.co';
   export const SUPABASE_ANON_KEY = 'eyJ...';
   ```

## Menjalankan

Aplikasi memakai ES modules, jadi harus diakses lewat web server (bukan `file://`):

```bash
npx serve public
# atau
python3 -m http.server 8080 --directory public
```

Lalu buka `http://localhost:8080` (atau port yang ditampilkan).

## Fitur

- **Data Barang**: tambah/ubah/hapus, impor Excel/CSV (dengan pratinjau), ekspor Excel/PDF.
- **Stock Opname**: input pemeriksaan fisik + foto, ekspor Excel/PDF.
- **Realtime**: perubahan data antar tab/perangkat tersinkron otomatis.
- Impor Excel & Ekspor PDF memuat library dari `cdnjs.cloudflare.com` (butuh internet).

## Keamanan

Saat ini memakai **anon key dengan RLS terbuka** (tanpa login). Siapa pun yang memiliki
URL + anon key dapat membaca/menulis data. Cocok untuk penggunaan internal sementara.
Untuk produksi, tambahkan **Supabase Auth** dan perketat policy RLS per user/role.
