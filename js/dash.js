import { E } from './ui.js';

const num = (n) => Number(n || 0).toLocaleString('id-ID');
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const fmt = (t) => (t ? new Date(t).toLocaleString('id-ID') : '-');
const PALETTE = ['#176B9A', '#2d7a4f', '#b8860b', '#8B2635', '#5b6cc0', '#0e8a8a', '#c2603a', '#6b4c9a'];

const ICO = {
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M21 8l-9 5-9-5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  pie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.2 15.9A10 10 0 1 1 8.1 2.8"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>',
  trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="7"/><rect x="12" y="7" width="3" height="11"/><rect x="17" y="13" width="3" height="5"/></svg>'
};
const EMPTY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>';
const empty = (m) => `<div class="chartempty">${EMPTY}<span>${m}</span></div>`;

function panel(title, icon, body, delay = 0) {
  return `<section class="panel dash-anim" style="animation-delay:${delay}s"><div class="phead"><span class="pic">${icon}</span><h3>${title}</h3></div>${body}</section>`;
}
function kpi(icon, label, value, sub, accent, delay) {
  return `<div class="kpi dash-anim" style="--acc:${accent};animation-delay:${delay}s"><div class="kico">${icon}</div><div class="kbody"><div class="klbl">${label}</div><b>${value}</b>${sub ? `<div class="ksub">${sub}</div>` : ''}</div></div>`;
}
function ring(frac, txt) {
  const C = 2 * Math.PI * 52;
  const off = C * (1 - Math.max(0, Math.min(1, frac)));
  return `<div class="ringwrap"><svg class="ring" viewBox="0 0 120 120"><circle class="ring-track" cx="60" cy="60" r="52"/><circle class="ring-fill" cx="60" cy="60" r="52" style="--c:${C.toFixed(1)};--off:${off.toFixed(1)}"/></svg><div class="ringlab"><b>${txt}%</b><span>diopname</span></div></div>`;
}
function donut(segments, total) {
  if (!total) return empty('Belum ada data');
  let acc = 0;
  const stops = segments.filter((s) => s.value > 0).map((s) => {
    const start = (acc / total) * 100; acc += s.value; const end = (acc / total) * 100;
    return `${s.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
  }).join(',');
  return `<div class="donutwrap"><div class="donut" style="background:conic-gradient(${stops})"><div class="donut-hole"><b>${num(total)}</b><span>entri</span></div></div><div class="legend">${segments.filter((s) => s.value > 0).map((s) => `<div class="lg"><span class="dot" style="background:${s.color}"></span><span class="lglbl">${E(s.label)}</span><b>${num(s.value)}</b><span class="lgpct">${pct(s.value, total)}%</span></div>`).join('') || ''}</div></div>`;
}
function hbars(rows, fmtv = num) {
  if (!rows.length) return empty('Belum ada data');
  const max = Math.max(1, ...rows.map((r) => r.value));
  return `<div class="hbars">${rows.map((r) => `<div class="hbar"><div class="hbtop"><span class="hblbl" title="${E(r.label)}">${E(r.label)}</span><span class="hbval">${fmtv(r.value)}</span></div><div class="hbtrack"><i style="width:${Math.max(4, Math.round((r.value / max) * 100))}%;background:linear-gradient(90deg,${r.color},${r.color}bb)"></i></div></div>`).join('')}</div>`;
}
function trend(days) {
  if (!days.length) return empty('Belum ada data');
  const max = Math.max(1, ...days.map((d) => d.value));
  let maxIdx = -1; days.forEach((d, i) => { if (d.value === max && max > 1) maxIdx = i; });
  const showVal = days.length <= 20;
  const cols = days.map((d, i) => `<div class="tcol ${i === maxIdx ? 'max' : ''}" title="${d.k}: ${num(d.value)} entri"><span class="tval">${showVal && d.value ? num(d.value) : ''}</span><div class="tbarwrap"><i style="height:${d.value ? Math.max(4, Math.round((d.value / max) * 100)) : 0}%"></i></div><span class="tlab">${d.short}</span></div>`).join('');
  return `<div class="trendwrap"><div class="tyaxis"><span>${num(max)}</span><span>${Math.round(max / 2)}</span><span>0</span></div><div class="trendscroll"><div class="trend">${cols}</div></div></div>`;
}

function importPanel() {
  let r = null;
  try { r = JSON.parse(localStorage.getItem('tps_lastImport') || 'null'); } catch (e) {}
  if (!r) return '';
  const when = r.at ? new Date(r.at).toLocaleString('id-ID') : '-';
  const dupHtml = r.dup
    ? `<div class="minilist">${(r.dups || []).slice(0, 10).map((k) => `<div class="mi"><span class="micode">${E(k)}</span></div>`).join('')}</div>${r.dup > 10 ? `<p class="hint">+${r.dup - 10} lagi…</p>` : ''}`
    : `<div class="chartempty" style="padding:12px">Tidak ada duplikat</div>`;
  const stats = [['Terbaca', r.read], ['Unik', r.unik], ['Duplikat', r.dup], ['Error', r.error], ['Baru', r.baru], ['Diperbarui', r.updated], ['Total di DB', r.total]]
    .map(([l, v]) => `<div class="istat"><span class="klbl">${l}</span><b>${v != null ? num(v) : '-'}</b></div>`).join('');
  return panel('Impor Terakhir', ICO.list, `<div class="istats">${stats}</div><div class="subhead">Kode duplikat</div>${dupHtml}<p class="hint" style="margin-top:8px">Terakhir: ${when}</p>`, .22);
}

export function renderDash({ so, items, df }) {
  const inR = (s) => {
    if (df.gd && (s.gudang || '') != df.gd) return false;
    const t = String(s.tgl || '').slice(0, 10);
    if (df.from && t < df.from) return false;
    if (df.to && t > df.to) return false;
    return true;
  };
  const L = so.filter(inR);
  const gdAll = [...new Set(so.map((s) => s.gudang).filter(Boolean))].sort();

  const totalEntri = L.length;
  const withFoto = L.filter((s) => s.foto).length;

  const itemsTotal = items.length;
  const sudah = new Set(so.map((s) => s.kode).filter(Boolean)).size;
  const belum = Math.max(0, itemsTotal - sudah);
  const cov = pct(sudah, itemsTotal);
  const covTxt = itemsTotal ? Math.round((sudah / itemsTotal) * 1000) / 10 : 0;

  const hero = `<section class="hero dash-anim"><div class="hero-main"><div class="hero-eyebrow">Dashboard</div><h1>Ringkasan Stock Opname</h1><div class="hero-upd">Diperbarui ${new Date().toLocaleString('id-ID')}</div><div class="hero-stats"><div><b>${num(sudah)}</b><span>Sudah diopname</span></div><div><b>${num(belum)}</b><span>Belum</span></div><div><b>${num(itemsTotal)}</b><span>Total barang</span></div></div><div class="hero-prog"><i style="width:${cov}%"></i></div></div>${ring(sudah / (itemsTotal || 1), covTxt)}</section>`;

  const cards = [
    kpi(ICO.box, 'Total Barang', num(itemsTotal), 'di Data Barang', '#176B9A', .02),
    kpi(ICO.check, 'Sudah Diopname', num(sudah), covTxt + '% dari total', '#2d7a4f', .06),
    kpi(ICO.clock, 'Belum Diopname', num(belum), 'perlu diperiksa', '#b8860b', .1),
    kpi(ICO.list, 'Entri Opname', num(totalEntri), df.gd ? 'gudang: ' + df.gd : 'sesuai filter', '#8B2635', .14),
    kpi(ICO.cam, 'Entri Berfoto', num(withFoto), totalEntri ? pct(withFoto, totalEntri) + '% berfoto' : 'tanpa foto', '#0e8a8a', .18)
  ].join('');

  // per gudang
  const byGd = {};
  L.forEach((s) => { const g = s.gudang || '(tanpa gudang)'; byGd[g] = (byGd[g] || 0) + 1; });
  const gdSeg = Object.entries(byGd).sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }));

  // top barang
  const byKode = {};
  L.forEach((s) => { const k = s.kode; (byKode[k] ??= { nama: s.nama, f: 0 }); byKode[k].f += Number(s.fisik) || 0; });
  const top = Object.entries(byKode).sort((a, b) => b[1].f - a[1].f).slice(0, 8).map(([k, v], i) => ({ label: v.nama || k, value: v.f, color: PALETTE[i % PALETTE.length] }));

  // tren per hari (selalu rentang berkelanjutan)
  const map = {};
  L.forEach((s) => { const d = String(s.tgl || '').slice(0, 10); if (d) map[d] = (map[d] || 0) + 1; });
  const keys = Object.keys(map).sort();
  let end = df.to ? new Date(df.to + 'T00:00:00') : new Date();
  if (!df.to && keys.length) { const last = new Date(keys[keys.length - 1] + 'T00:00:00'); if (last > end) end = last; }
  const start = df.from ? new Date(df.from + 'T00:00:00') : new Date(end.getTime() - 13 * 864e5);
  const days = [];
  for (let d = new Date(start); d <= end && days.length < 93; d.setDate(d.getDate() + 1)) {
    const k = ymd(d); days.push({ k, value: map[k] || 0, short: k.slice(8) + '/' + k.slice(5, 7) });
  }

  // aktivitas terbaru
  const recent = [...L].sort((a, b) => String(b.tgl).localeCompare(String(a.tgl))).slice(0, 6);
  const actHtml = recent.length
    ? `<div class="acts">${recent.map((s) => `<div class="act"><div class="actthumb">${s.foto ? `<img class="thumb" src="${E(s.foto)}" alt="foto" onclick="viewFoto('${s.id}')">` : '<span class="nofoto">—</span>'}</div><div class="actbody"><b>${E(s.nama || s.kode)}</b><span>${E(s.no)} · ${E(s.kode)}${s.gudang ? ' · ' + E(s.gudang) : ''}</span><span class="muted">${fmt(s.tgl)}</span></div><div class="actval"><b>${E(s.fisik)}</b><span>${E(s.satuan || '')}</span></div></div>`).join('')}</div>`
    : empty('Belum ada data');

  const presets = `<div class="dseg"><button class="s" onclick="dfPreset(1)">Hari Ini</button><button class="s" onclick="dfPreset(7)">7 Hari</button><button class="s" onclick="dfPreset(30)">30 Hari</button><button class="s" onclick="dfPreset(0)">Semua</button></div>`;
  const filter = `<div class="dfilter dash-anim" style="animation-delay:.02s">${presets}<div><label>Dari Tanggal</label><input id="d_from" type="date" value="${E(df.from)}" onchange="dashSet()"></div><div><label>Sampai Tanggal</label><input id="d_to" type="date" value="${E(df.to)}" onchange="dashSet()"></div><div><label>Gudang</label><input id="d_gd" list="dgl" value="${E(df.gd)}" onchange="dashSet()" placeholder="Semua gudang"><datalist id="dgl">${gdAll.map((g) => `<option value="${E(g)}">`).join('')}</datalist></div><button class="s" onclick="dfReset()">Reset</button></div>`;

  return `${hero}
  ${filter}
  <div class="kpis">${cards}</div>
  <div class="dgrid">${panel('Entri per Gudang', ICO.pie, donut(gdSeg, totalEntri), .05)}${panel('Top Barang (Total Fisik)', ICO.chart, hbars(top), .1)}</div>
  ${panel('Tren Entri per Hari', ICO.trend, trend(days), .15)}
  ${importPanel()}
  ${panel('Aktivitas Terbaru', ICO.clock, actHtml, .2)}`;
}
