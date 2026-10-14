import { $, V, E, toast, modal, closeM } from './ui.js';
import { LOGO } from './logo.js';
import * as db from './db.js';
import { downloadBlob, xlItems, xlSO, pdfItems, pdfSO, tplItems, needXLSX } from './export.js';
import { renderDash } from './dash.js';

let S = { items: [], so: [] };
let page = 'so', sel = null, cur = {}, pf = null, q = '', qs = '', off = innerWidth < 800;
let df = { from: '', to: '', gd: '' };
let qm = '';
let lastSig = '';

let itemMap = new Map();
const reindex = () => { itemMap = new Map(S.items.map((i) => [i.kode, i])); };
const itm = (k) => itemMap.get(k);
const nowL = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
const fmt = (t) => (t ? new Date(t).toLocaleString('id-ID') : '-');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const num = (n) => Number(n || 0).toLocaleString('id-ID');
const perio = (t) => String(t || '').slice(0, 7);
const sig = () => JSON.stringify(S.items) + '|' + JSON.stringify(S.so);

async function save(c, o) {
  const i = S[c].findIndex((x) => x.id == o.id);
  i < 0 ? S[c].push(o) : (S[c][i] = o);
  if (c == 'items') reindex();
  lastSig = sig();
  try { await db.save(c, o); } catch (e) { toast('Gagal menyimpan: ' + errMsg(e)); }
  go();
}
async function del(c, id) {
  S[c] = S[c].filter((x) => x.id != id);
  if (c == 'items') reindex();
  lastSig = sig();
  try { await db.del(c, id); } catch (e) { toast('Gagal menghapus: ' + errMsg(e)); }
  go();
}
const errMsg = (e) => {
  if (e && e.code == '23505') return 'Data duplikat — kode sudah ada';
  return (e && (e.message || e.hint || e.details || e.code)) || String(e || 'tidak diketahui');
};

async function boot() {
  try {
    const data = await db.listAll();
    S.items = data.items;
    S.so = data.so;
    reindex();
    lastSig = sig();
  } catch (e) {
    toast('Gagal memuat data: ' + errMsg(e) + ' — periksa js/config.js');
  }
  db.subscribeAll(() => reload());
  setInterval(() => reload(), 15000);
  addEventListener('focus', () => reload());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) reload(); });
  go();
}
async function reload() {
  if (document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  try {
    const d = await db.listAll();
    const s = JSON.stringify(d.items) + '|' + JSON.stringify(d.so);
    if (s === lastSig) return;
    lastSig = s;
    S.items = d.items;
    S.so = d.so;
    reindex();
    go();
  } catch (e) {}
}

/* ================= Navigasi & kerangka ================= */
const ICO = {
  dash: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  items: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M21 8l-9 5-9-5"/></svg>',
  so: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6v3H9z"/><path d="M7 4h10v16H7z"/><path d="M9.5 13l1.7 1.7L14.5 11"/></svg>'
};
const NAV = [['dash', 'Dashboard'], ['items', 'Data Barang'], ['so', 'Stock Opname']];
function toggleNav() { off = !off; document.querySelector('aside')?.classList.toggle('off', off); }
function closeNav() { off = true; document.querySelector('aside')?.classList.add('off'); }

function go(p) {
  if (p) { page = p; sel = null; cur = {}; pf = null; }
  $('#app').innerHTML = `<aside class="${off ? 'off' : ''}"><div class="brand"><svg width="30" height="30" viewBox="0 0 34 34"><rect width="34" height="34" rx="7" fill="#8B2635"/><path d="M6 24h22l-3 4H9zM9 14h6v8H9zm7 0h6v8h-6zM23 8v14" stroke="#fff" stroke-width="2" fill="none"/></svg><div>Stock Opname<small>Inventory System · PT TPS</small></div><button class="x" title="Tutup menu" aria-label="Tutup menu" onclick="closeNav()">✕</button></div>${NAV.map((n) => `<a class="${n[0] == page ? 'on' : ''}" onclick="go('${n[0]}')">${ICO[n[0]]}<span>${n[1]}</span></a>`).join('')}</aside><main><header><button class="s" onclick="toggleNav()">☰</button><img class="logo" src="${LOGO}" alt="Pelindo TPS Surabaya"><h2>${NAV.find((n) => n[0] == page)[1]}</h2></header><div class="wrap">${page == 'dash' ? dash() : page == 'items' ? items() : so()}</div></main>`;
}

const fld = (l, id, v = '', t = 'text', x = '') => `<div><label>${l}</label><input id="${id}" type="${t}" value="${E(v)}" ${x}></div>`;
function tbl(h, rows) { return `<div class="tw"><table><tr>${h.map((x) => `<th>${x}</th>`).join('')}</tr>${rows.join('') || `<tr><td colspan="${h.length}" class="empty">Belum ada data</td></tr>`}</table></div>`; }

/* ================= Dashboard ================= */
function dashSet() { df.from = V('d_from'); df.to = V('d_to'); df.gd = V('d_gd'); go(); }
function dfReset() { df = { from: '', to: '', gd: '' }; go(); }
function dfPreset(n) {
  if (!n) { df.from = ''; df.to = ''; }
  else {
    const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const to = new Date(), from = new Date(to.getTime() - (n - 1) * 864e5);
    df.from = ymd(from); df.to = ymd(to);
  }
  go();
}
function dash() { return renderDash({ so: S.so, items: S.items, df }); }

/* ================= Data Barang ================= */
function editItem(kode) { sel = kode; go(); }
function newItem() { sel = ''; go(); }
function closeForm() { sel = null; go(); }
let qT;
function setQ(v) { q = v; clearTimeout(qT); qT = setTimeout(() => { go(); const e = $('#q'); if (e) { e.focus(); e.setSelectionRange(99, 99); } }, 200); }

function items() {
  if (sel !== null) {
    const it = itm(sel) || {}, nw = sel === '';
    return `<div class="card"><div class="ch"><h3>${nw ? 'Tambah Barang' : 'Ubah Barang'}</h3><button class="x" title="Kembali" aria-label="Kembali" onclick="closeForm()">✕</button></div><div class="form">${fld('Kode Barang (unik)', 'i_kode', it.kode, 'text', nw ? 'onchange="dupChk()"' : 'readonly')}${fld('Kode Akun', 'i_akun', it.akun)}${fld('Nama Barang', 'i_nama', it.nama)}${fld('Kategori', 'i_kat', it.kat)}${fld('Satuan', 'i_sat', it.satuan, 'text', 'placeholder="pcs, kg, unit…"')}${fld('Gudang', 'i_gd', it.gudang)}${fld('Lokasi Penyimpanan', 'i_lok', it.lokasi)}</div><div class="formfoot"><button onclick="saveItem(${nw})">Simpan</button><button class="s" onclick="closeForm()">Batal</button>${nw ? '' : `<button class="d" onclick="delItem()">Hapus</button>`}</div></div>`;
  }
  const L = S.items.filter((i) => !q || (i.kode + i.nama).toLowerCase().includes(q.toLowerCase()));
  return `<div class="card"><div class="bar"><input id="q" placeholder="Cari kode / nama barang" value="${E(q)}" oninput="setQ(this.value)"><button onclick="newItem()">+ Tambah Barang</button><button class="s" onclick="impOpen()">Impor</button><button class="g" onclick="expMenu('items')">Ekspor</button><button class="d" onclick="clearItems()">Hapus Semua</button></div>${tbl(['Kode', 'Kode Akun', 'Nama Barang', 'Kategori', 'Satuan', 'Gudang', 'Lokasi', ''], L.map((i) => `<tr><td>${E(i.kode)}</td><td>${E(i.akun)}</td><td>${E(i.nama)}</td><td>${E(i.kat)}</td><td>${E(i.satuan)}</td><td>${E(i.gudang)}</td><td>${E(i.lokasi)}</td><td><button class="s" onclick="editItem('${E(i.kode)}')">Ubah</button></td></tr>`))}<p class="hint">Impor menerima file Excel (.xlsx/.xls) atau CSV. Kolom: Kode Barang, Kode Akun, Nama Barang, Kategori, Satuan, Gudang, Lokasi. File hasil Ekspor bisa langsung diimpor kembali.</p></div>`;
}

function dupChk() { const k = V('i_kode').trim(), e = itm(k); if (e && confirm('Kode barang ' + k + ' sudah ada (' + e.nama + ').\nBuka barang tersebut untuk diedit?')) { sel = k; go(); } }
function saveItem(nw) {
  const g = (k) => V('i_' + k).trim(), kode = g('kode');
  if (!kode || !g('nama') || !g('sat')) return toast('Kode, nama, dan satuan wajib diisi');
  if (nw && itm(kode)) { dupChk(); return; }
  save('items', { id: nw ? kode : itm(kode).id, kode, akun: g('akun'), nama: g('nama'), kat: g('kat'), satuan: g('sat'), gudang: g('gd'), lokasi: g('lok'), upd: new Date().toISOString() });
  toast('Barang tersimpan'); sel = null; go();
}
function delItem() {
  if (S.so.some((s) => s.kode == sel)) return toast('Tidak dapat dihapus: barang sudah dipakai di Stock Opname');
  if (confirm('Hapus barang ' + sel + '?')) { del('items', itm(sel).id); sel = null; go(); }
}
async function clearItems() {
  const n = S.items.length;
  if (!n) return toast('Tidak ada data barang');
  if (!confirm('Hapus SEMUA ' + n + ' data barang? Tindakan ini tidak bisa dibatalkan.')) return;
  if (prompt('Ketik HAPUS (huruf besar) untuk konfirmasi:') !== 'HAPUS') return toast('Dibatalkan');
  try { await db.delAll('items'); } catch (e) { return toast('Gagal menghapus: ' + errMsg(e)); }
  S.items = []; reindex(); lastSig = sig(); go();
  toast(n + ' data barang dihapus');
}

/* ================= Export menu ================= */
function expMenu(k) { modal('Pilih Format Export', `<p class="hint">Pilih format file untuk ${k == 'so' ? 'data Stock Opname' : 'Data Barang'}.</p><div class="bar" style="margin-top:12px"><button class="g" onclick="doExp('${k}','x')">Export Excel (.xlsx)</button><button class="d" onclick="doExp('${k}','p')">Export PDF</button><button class="s" onclick="closeM()">Batal</button></div>`); }
function doExp(k, f) { closeM(); const p = k == 'so' ? (f == 'x' ? xlSO(S.so, S.items) : pdfSO(S.so, S.items)) : (f == 'x' ? xlItems(S.items) : pdfItems(S.items)); Promise.resolve(p).catch((e) => toast('Export gagal: ' + (e.message || e))); }

/* ================= Impor ================= */
const NK = { kode: ['kode', 'kodebarang'], akun: ['akun', 'kodeakun'], nama: ['nama', 'namabarang'], kat: ['kat', 'kategori'], satuan: ['satuan', 'sat'], gudang: ['gudang'], lokasi: ['lokasi', 'lokasipenyimpanan'] };
const nk = (v) => { const x = String(v ?? '').toLowerCase().replace(/[^a-z]/g, ''); for (const k in NK) if (NK[k].includes(x)) return k; return null; };
let IMP = null;

function csvRows(t) {
  t = t.replace(/^\uFEFF/, '');
  const f = t.split(/\r?\n/, 1)[0], dl_ = [',', ';', '\t'].map((d) => [d, f.split(d).length]).sort((a, b) => b[1] - a[1])[0][0], R = [];
  let r = [], c = '', qd = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (qd) { if (ch == '"' && t[i + 1] == '"') { c += '"'; i++; } else if (ch == '"') qd = false; else c += ch; }
    else if (ch == '"') qd = true;
    else if (ch == dl_) { r.push(c); c = ''; }
    else if (ch == '\n' || ch == '\r') { if (ch == '\r' && t[i + 1] == '\n') i++; r.push(c); R.push(r); r = []; c = ''; }
    else c += ch;
  }
  if (c !== '' || r.length) { r.push(c); R.push(r); }
  return R;
}

function impOpen() {
  IMP = null;
  modal('Impor Data Barang', `<p class="hint">Pilih file Excel (.xlsx / .xls) atau CSV. Baris judul di atas tabel akan dilewati otomatis.</p><div class="bar"><input id="impf" type="file" accept=".xlsx,.xls,.csv" onchange="impRead(this.files[0])"><button class="s" onclick="tplItems()">Unduh Template Excel</button></div><label style="display:flex;gap:8px;align-items:center;font-weight:500;margin:6px 0"><input id="impo" type="checkbox" style="padding:0" onchange="impPrev()"> Timpa barang yang kodenya sudah ada (jika tidak dicentang, dilewati)</label><div id="impv"></div>`);
}

async function impRead(f) {
  if (!f) return;
  const v = $('#impv');
  v.innerHTML = '<p class="hint">Membaca file…</p>';
  let rows;
  try {
    if (/\.csv$/i.test(f.name)) rows = csvRows(await f.text());
    else { await needXLSX(); const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' }); }
  } catch (e) { v.innerHTML = '<p class="hint" style="color:var(--mar)">Gagal membaca file. Untuk Excel dibutuhkan koneksi internet (atau gunakan CSV).</p>'; return; }
  const hi = rows.findIndex((r) => { const m = r.map(nk); return m.includes('kode') && m.includes('nama'); });
  if (hi < 0) { v.innerHTML = '<p class="hint" style="color:var(--mar)">Header tidak ditemukan. Pastikan ada kolom <b>Kode Barang</b> dan <b>Nama Barang</b>.</p>'; return; }
  const m = rows[hi].map(nk), seen = new Set();
  IMP = [];
  for (const r of rows.slice(hi + 1)) {
    if (!r.some((x) => String(x).trim())) continue;
    const o = {};
    m.forEach((k, i) => { if (k && o[k] === undefined) o[k] = String(r[i] ?? '').trim(); });
    let st = 'n', msg = '';
    if (!o.kode) (st = 'e', msg = 'Kode kosong');
    else if (!o.nama) (st = 'e', msg = 'Nama kosong');
    else if (!o.satuan) (st = 'e', msg = 'Satuan kosong');
    else if (seen.has(o.kode)) (st = 'e', msg = 'Kode ganda di file');
    else { seen.add(o.kode); if (itm(o.kode)) st = 'u'; }
    IMP.push({ o, st, msg });
  }
  impPrev();
}

function impPrev() {
  const v = $('#impv');
  if (!v || !IMP) return;
  const ow = $('#impo')?.checked, c = { n: 0, u: 0, e: 0 };
  IMP.forEach((x) => c[x.st]++);
  const dup = IMP.filter((x) => x.msg == 'Kode ganda di file').length;
  const unik = IMP.length - c.e;
  const ok = c.n + (ow ? c.u : 0);
  const totals = `<div class="bar" style="margin-top:8px;gap:14px"><span class="hint">Terbaca <b>${num(IMP.length)}</b> baris</span><span class="hint">Unik <b>${num(unik)}</b></span><span class="hint">Duplikat <b>${num(dup)}</b></span><span class="hint">Error <b>${num(c.e)}</b></span></div>`;
  v.innerHTML = `${totals}<div class="bar" style="margin-top:2px"><span class="chip n">${c.n} baru</span><span class="chip u">${c.u} sudah ada ${ow ? '(ditimpa)' : '(dilewati)'}</span><span class="chip e">${c.e} error</span></div><div class="tw" style="max-height:38vh;overflow:auto">${tbl(['Status', 'Kode', 'Nama', 'Satuan', 'Keterangan'], IMP.slice(0, 100).map((x) => `<tr><td><span class="chip ${x.st}">${x.st == 'n' ? 'Baru' : x.st == 'u' ? (ow ? 'Timpa' : 'Lewati') : 'Error'}</span></td><td>${E(x.o.kode)}</td><td>${E(x.o.nama)}</td><td>${E(x.o.satuan)}</td><td>${E(x.msg)}</td></tr>`))}</div>${IMP.length > 100 ? `<p class="hint">Menampilkan 100 dari ${num(IMP.length)} baris.</p>` : ''}<div class="bar" style="margin-top:12px"><button ${ok ? '' : 'disabled'} onclick="impGo()">Impor ${num(ok)} barang</button><button class="s" onclick="closeM()">Batal</button></div>`;
}

let importing = false;
async function impGo() {
  if (importing) return;
  const ow = $('#impo')?.checked, now = new Date().toISOString();
  let n = 0, u = 0, sk = 0, er = 0;
  const rows = [], dups = [];
  for (const x of IMP) {
    if (x.st == 'e') { er++; if (x.msg == 'Kode ganda di file') dups.push(x.o.kode); continue; }
    const ex = itm(x.o.kode);
    if (ex && !ow) { sk++; continue; }
    rows.push({ id: ex ? ex.id : x.o.kode, kode: x.o.kode, akun: x.o.akun || '', nama: x.o.nama, kat: x.o.kat || '', satuan: x.o.satuan, gudang: x.o.gudang || '', lokasi: x.o.lokasi || '', upd: now });
    ex ? u++ : n++;
  }
  if (!rows.length) { closeM(); return toast('Tidak ada baris untuk diimpor'); }
  importing = true;
  const status = $('#impv');
  try {
    const res = await db.saveMany('items', rows, 250, (done, total) => { if (status) status.innerHTML = `<p class="hint">Menyimpan ${done}/${total}…</p>`; });
    // retry baris yang gagal sekali lagi
    if (res.failedIds && res.failedIds.length) {
      const byId = new Map(rows.map((r) => [r.id, r]));
      const retry = res.failedIds.map((id) => byId.get(id)).filter(Boolean);
      if (retry.length) { if (status) status.innerHTML = `<p class="hint">Mencoba ulang ${retry.length} baris…</p>`; await db.saveMany('items', retry, 100); }
    }
    const total = await db.count('items').catch(() => null);
    const d = await db.listAll();
    S.items = d.items; S.so = d.so; reindex(); lastSig = sig();
    const totalShown = total != null ? total : S.items.length;
    try { localStorage.setItem('tps_lastImport', JSON.stringify({ at: new Date().toISOString(), read: IMP.length, unik: IMP.length - er, dup: dups.length, dups: dups.slice(0, 500), error: er, baru: n, updated: u, skipped: sk, total: totalShown })); } catch (e) {}
    closeM();
    toast(n + ' baru, ' + u + ' diperbarui' + (sk ? ', ' + sk + ' dilewati' : '') + (er ? ', ' + er + ' error' : '') + (res.fail ? '. ' + res.fail + ' gagal' : '') + ' · Total: ' + num(totalShown));
  } catch (e) {
    toast('Impor gagal: ' + errMsg(e));
  } finally {
    importing = false;
  }
  go();
}

/* ================= Stock Opname ================= */
function closeSO() { cur = {}; pf = null; go(); }
function editSO(id) { cur = S.so.find((x) => x.id == id) || {}; pf = null; go(); scrollTo(0, 0); }
function setQs(v) { qs = v; go(); const e = $('#qs'); if (e) { e.focus(); e.setSelectionRange(99, 99); } }
function setQm(v) { qm = v; go(); }
function nextNo() {
  const d = new Date();
  const p = 'SO-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-';
  let max = 0;
  S.so.forEach((s) => { if (s.no && s.no.indexOf(p) == 0) { const n = parseInt(s.no.slice(p.length), 10); if (Number.isFinite(n) && n > max) max = n; } });
  return p + String(max + 1).padStart(3, '0');
}

function so() {
  const c = cur;
  const L = S.so.filter((s) => (!qm || perio(s.tgl) === qm) && (!qs || (s.kode + s.nama + s.no).toLowerCase().includes(qs.toLowerCase()))).sort((a, b) => b.tgl.localeCompare(a.tgl));
  const gd = [...new Set(S.items.map((i) => i.gudang).filter(Boolean))];
  const no = c.no || nextNo();
  return `<div class="card"><div class="ch"><h3>${c.id ? 'Ubah' : 'Form'} Stock Opname</h3>${c.id ? `<button class="x" title="Kembali" aria-label="Kembali" onclick="closeSO()">✕</button>` : ''}</div><div class="form">${fld('Nomor Stock Opname', 's_no', no)}${fld('Tanggal & Waktu', 's_tgl', c.tgl || nowL(), 'datetime-local', 'onchange="fill()"')}${fld('Kode Akun (otomatis dari Data Barang)', 's_akun', c.akun, 'text', 'readonly')}<div><label>Gudang</label><input id="s_gd" list="gl" value="${E(c.gudang)}"><datalist id="gl">${gd.map((g) => `<option value="${E(g)}">`).join('')}</datalist></div><div class="acbox"><label>Kode Barang</label><div class="rowin"><input id="s_kode" autocomplete="off" value="${E(c.kode)}" oninput="kodSug(this.value)" onchange="fill()" onblur="kodHide()" placeholder="Ketik kode / nama"><button type="button" class="s" onclick="pickOpen()">Pilih</button></div><div id="s_sug" class="sug" style="display:none"></div><div id="s_dup" class="hint" style="color:var(--mar);display:none"></div></div>${fld('Nama Barang', 's_nama', c.nama, 'text', 'readonly')}${fld('Satuan', 's_sat', c.satuan, 'text', 'readonly')}${fld('Stok Fisik', 's_fisik', c.fisik, 'number', 'min="0" step="any"')}<div><label>Foto Fisik Barang</label><input id="s_foto" type="file" accept="image/jpeg,image/png,image/webp" onchange="pv(this.files[0])"><img id="pv" src="${E(c.foto)}" style="margin-top:8px;max-height:130px;border-radius:6px;cursor:pointer;display:${c.foto ? 'block' : 'none'}" onclick="pvZoom()" title="Klik untuk perbesar"><div class="bar" style="margin-top:8px"><button type="button" class="s" onclick="dlFotoForm()">Download Foto</button></div></div></div><div class="formfoot"><button onclick="saveSO()">Simpan</button><button class="s" onclick="closeSO()">Baru / Batal</button></div></div>
  <div class="card"><div class="bar"><input id="qs" placeholder="Cari nomor / kode / nama" value="${E(qs)}" oninput="setQs(this.value)"><input id="qm" type="month" value="${E(qm)}" onchange="setQm(this.value)" title="Filter bulan"><button class="s" onclick="qm='';go()">Semua Bulan</button><button class="g" onclick="expMenu('so')">Export</button><button class="d" onclick="clearSO()">Hapus Semua</button></div>${tbl(['Nomor', 'Tanggal', 'Periode', 'Kode Akun', 'Gudang', 'Kode', 'Nama Barang', 'Fisik', 'Satuan', 'Foto', ''], L.map((s) => `<tr><td>${E(s.no)}</td><td>${fmt(s.tgl)}</td><td>${E(perio(s.tgl))}</td><td>${E(s.akun || itm(s.kode)?.akun)}</td><td>${E(s.gudang)}</td><td>${E(s.kode)}</td><td>${E(s.nama)}</td><td><b>${E(s.fisik)}</b></td><td>${E(s.satuan)}</td><td>${s.foto ? `<a href="${E(s.foto)}" onclick="viewFoto('${s.id}');return false" title="Lihat foto"><img class="thumb" src="${E(s.foto)}" alt="foto"></a>` : '-'}</td><td style="white-space:nowrap"><button class="s" onclick="editSO('${s.id}')">Ubah</button> <button class="d" onclick="delSO('${s.id}')">Hapus</button></td></tr>`))}</div>`;
}

function fill() {
  const kode = V('s_kode').trim();
  const it = itm(kode);
  $('#s_nama').value = it?.nama || '';
  $('#s_sat').value = it?.satuan || '';
  $('#s_akun').value = it?.akun || '';
  if (it?.gudang && !V('s_gd')) $('#s_gd').value = it.gudang;
  const per = perio(new Date(V('s_tgl')).toISOString());
  const dup = S.so.find((s) => s.kode == kode && s.id != cur.id && perio(s.tgl) === per);
  const w = $('#s_dup');
  if (w) {
    if (dup) { w.textContent = 'Kode ' + kode + ' sudah diinput untuk periode ' + per + ' (' + (dup.no || 'entri lain') + '). Satu kode hanya boleh 1 entri per bulan.'; w.style.display = 'block'; }
    else w.style.display = 'none';
  }
  if (!it && kode) toast('Kode barang tidak terdaftar di Data Barang');
}
function kodHide() { const b = $('#s_sug'); if (b) b.style.display = 'none'; }
function kodSug(v) {
  const box = $('#s_sug');
  if (!box) return;
  const s = String(v || '').trim().toLowerCase();
  if (!s) { box.style.display = 'none'; box.innerHTML = ''; return; }
  const per = perio(new Date(V('s_tgl')).toISOString());
  const used = new Set(S.so.filter((x) => x.id != cur.id && perio(x.tgl) === per).map((x) => x.kode));
  const out = [];
  for (const i of S.items) {
    if (i.kode.toLowerCase().includes(s) || (i.nama || '').toLowerCase().includes(s)) {
      out.push(i);
      if (out.length >= 30) break;
    }
  }
  if (!out.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
  box.innerHTML = out.map((i) => `<div class="sugitem" onmousedown="pickKode('${E(i.kode)}')"><b>${E(i.kode)}</b><span>${E(i.nama || '')}</span>${used.has(i.kode) ? '<em>sudah diinput</em>' : ''}</div>`).join('');
  box.style.display = 'block';
}
function pickKode(k) { const inp = $('#s_kode'); if (inp) inp.value = k; kodHide(); fill(); }

/* ================= Picker modal Data Barang ================= */
function pickOpen() {
  if (!S.items.length) return toast('Belum ada Data Barang. Impor dulu di menu Data Barang.');
  modal('Pilih Barang', `<input id="pk_q" placeholder="Cari kode / nama barang" oninput="pickSearch(this.value)" autocomplete="off" style="width:100%"><div id="pk_list" class="pklist"></div>`);
  const q = $('#pk_q');
  if (q) q.focus();
  pickSearch('');
}
function pickSearch(v) {
  const box = $('#pk_list');
  if (!box) return;
  const s = String(v || '').trim().toLowerCase();
  const per = perio(new Date(V('s_tgl')).toISOString());
  const used = new Set(S.so.filter((x) => x.id != cur.id && perio(x.tgl) === per).map((x) => x.kode));
  const out = [];
  for (const i of S.items) {
    if (!s || i.kode.toLowerCase().includes(s) || (i.nama || '').toLowerCase().includes(s)) {
      out.push(i);
      if (out.length >= 200) break;
    }
  }
  const total = S.items.length;
  if (!out.length) { box.innerHTML = '<p class="empty">Tidak ada barang cocok</p>'; return; }
  const hint = s ? `${out.length}${out.length >= 200 ? '+' : ''} hasil` : `Menampilkan ${out.length} dari ${num(total)} — ketik untuk mencari`;
  box.innerHTML = `<div class="pkhint">${hint}</div>` + out.map((i) => `<div class="pkitem${used.has(i.kode) ? ' used' : ''}" onmousedown="soPick('${E(i.kode)}')"><span class="pkkode">${E(i.kode)}</span>${used.has(i.kode) ? '<em>sudah diinput</em>' : ''}</div>`).join('');
}
function soPick(kode) { const inp = $('#s_kode'); if (inp) inp.value = kode; closeM(); fill(); }
function pv(f) { pf = f; const i = $('#pv'); if (f) { i.src = URL.createObjectURL(f); i.style.display = 'block'; } }

/* ================= Download foto ================= */
async function downloadPhoto(url, name) {
  try {
    toast('Mengunduh foto…');
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const b = await r.blob();
    const ext = (b.type.split('/')[1] || 'jpg').replace(/^jpeg$/, 'jpg');
    downloadBlob(String(name || 'foto').replace(/\.[^.]+$/, '') + '.' + ext, b, 'Foto diunduh');
  } catch (e) { toast('Gagal mengunduh foto: ' + (e.message || e)); }
}
function dlFotoForm() {
  if (pf) return downloadBlob(pf.name || 'foto.jpg', pf, 'Foto diunduh');
  if (cur.foto) return downloadPhoto(cur.foto, 'foto-' + (cur.no || cur.id || 'so'));
  toast('Belum ada foto');
}
function dlFotoSO(id) {
  const s = S.so.find((x) => x.id == id);
  if (s && s.foto) downloadPhoto(s.foto, 'foto-' + (s.no || id));
  else toast('Foto tidak tersedia');
}
function fotoModal(title, url, onDl, origUrl) {
  modal(title, `<img src="${E(url)}" alt="foto" style="max-width:100%;max-height:62vh;border-radius:8px;display:block;margin:0 auto"><div class="bar" style="justify-content:center;margin-top:12px"><button class="g" onclick="${onDl};closeM()">Download</button>${origUrl ? `<a class="abtn" href="${E(origUrl)}" target="_blank" rel="noopener">Buka Asli</a>` : ''}<button class="s" onclick="closeM()">Tutup</button></div>`);
}
function viewFoto(id) {
  const s = S.so.find((x) => x.id == id);
  if (!s || !s.foto) return toast('Foto tidak tersedia');
  fotoModal('Foto — ' + (s.no || s.kode || ''), s.foto, `dlFotoSO('${s.id}')`, s.foto);
}
function pvZoom() {
  const url = pf ? URL.createObjectURL(pf) : (cur.foto || '');
  if (!url) return toast('Belum ada foto');
  fotoModal('Preview Foto', url, 'dlFotoForm()', cur.foto || '');
}

async function saveSO() {
  const kode = V('s_kode').trim(), it = itm(kode), no = V('s_no').trim(), fs = V('s_fisik');
  if (!it) return toast('Pilih kode barang yang terdaftar di Data Barang');
  if (!V('s_gd').trim()) return toast('Gudang wajib diisi');
  if (fs === '' || Number(fs) < 0) return toast('Isi stok fisik dengan benar');
  if (S.so.some((s) => s.no == no && s.id != cur.id)) return toast('Nomor Stock Opname sudah dipakai');
  const tglIso = new Date(V('s_tgl')).toISOString();
  const per = perio(tglIso);
  const dup = S.so.find((s) => s.kode == kode && s.id != cur.id && perio(s.tgl) === per);
  if (dup) return toast('Kode ' + kode + ' sudah diinput untuk periode ' + per + ' (' + (dup.no || 'entri lain') + ')');
  let foto = cur.foto || '', foto_id = cur.foto_id || '';
  if (pf) {
    if (!/^image\/(jpeg|png|webp)$/.test(pf.type)) return toast('Foto harus JPG, PNG, atau WEBP');
    if (pf.size > 10 * 1048576) return toast('Foto maksimal 10 MB');
    try { const r = await db.uploadFoto(pf); foto = r.url; foto_id = r.id; }
    catch (e) { return toast('Upload foto gagal: ' + (e.message || '')); }
  }
  await save('so', { id: cur.id || uid(), no, tgl: tglIso, akun: V('s_akun').trim(), gudang: V('s_gd').trim(), kode, nama: it.nama, satuan: it.satuan, fisik: Number(fs), foto, foto_id });
  toast('Stock opname tersimpan'); cur = {}; pf = null; go();
}
async function delSO(id) {
  const s = S.so.find((x) => x.id == id);
  if (!confirm('Hapus ' + s.no + '?')) return;
  if (s.foto_id) try { await db.deleteFoto(s.foto_id); } catch (e) {}
  del('so', id);
}
async function clearSO() {
  const n = S.so.length;
  if (!n) return toast('Tidak ada data opname');
  if (!confirm('Hapus SEMUA ' + n + ' entri Stock Opname? Termasuk semua fotonya.')) return;
  if (prompt('Ketik HAPUS (huruf besar) untuk konfirmasi:') !== 'HAPUS') return toast('Dibatalkan');
  const ids = S.so.map((s) => s.foto_id).filter(Boolean);
  try {
    await db.delAll('so');
    if (ids.length) await db.deleteFotoMany(ids);
  } catch (e) { return toast('Gagal menghapus: ' + errMsg(e)); }
  S.so = []; lastSig = sig(); go();
  toast(n + ' entri opname dihapus');
}

/* ================= Ekspos handler inline ================= */
Object.assign(window, {
  go, toggleNav, closeNav, dashSet, dfReset, dfPreset,
  editItem, newItem, closeForm, setQ, dupChk, saveItem, delItem, clearItems,
  expMenu, doExp, impOpen, impRead, impPrev, impGo, tplItems, closeM,
  closeSO, editSO, setQs, setQm, fill, pv, saveSO, delSO, clearSO, dlFotoForm, dlFotoSO, viewFoto, pvZoom, kodSug, kodHide, pickKode, pickOpen, pickSearch, soPick
});

boot();
