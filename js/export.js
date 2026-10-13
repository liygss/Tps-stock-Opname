import { toast } from './ui.js';

/* ================= CRC32 + ZIP (pembuat file .xlsx) ================= */
const CT = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc = (u) => {
  let c = -1;
  for (let i = 0; i < u.length; i++) c = CT[(c ^ u[i]) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
function zip(files) {
  const te = new TextEncoder(), parts = [], cd = [];
  let off = 0;
  for (const [n, data] of files) {
    const nb = te.encode(n);
    const d = data instanceof Uint8Array ? data : te.encode(data);
    const c = crc(d), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
    h.setUint16(12, 0x21, true); h.setUint32(14, c, true); h.setUint32(18, d.length, true);
    h.setUint32(22, d.length, true); h.setUint16(26, nb.length, true);
    parts.push(new Uint8Array(h.buffer), nb, d);
    const e = new DataView(new ArrayBuffer(46));
    e.setUint32(0, 0x02014b50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true);
    e.setUint16(8, 0x0800, true); e.setUint16(14, 0x21, true); e.setUint32(16, c, true);
    e.setUint32(20, d.length, true); e.setUint32(24, d.length, true); e.setUint16(28, nb.length, true);
    e.setUint32(42, off, true);
    cd.push(new Uint8Array(e.buffer), nb);
    off += 30 + nb.length + d.length;
  }
  const cl = cd.reduce((a, x) => a + x.length, 0), z = new DataView(new ArrayBuffer(22));
  z.setUint32(0, 0x06054b50, true); z.setUint16(8, files.length, true); z.setUint16(10, files.length, true);
  z.setUint32(12, cl, true); z.setUint32(16, off, true);
  return new Blob([...parts, ...cd, new Uint8Array(z.buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

const X = (s) => String(s ?? '').replace(/[&<>"\x00-\x08\x0b\x0c\x0e-\x1f]/g, (c) => (c == '&' ? '&amp;' : c == '<' ? '&lt;' : c == '>' ? '&gt;' : c == '"' ? '&quot;' : ''));
const CL = (i) => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s; };
const sr = (t) => { const d = new Date(t); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5) + 25569; };

const EMU = 9525; // 1 px = 9525 EMU
const H1 = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PREL = 'http://schemas.openxmlformats.org/package/2006/relationships';

function xlsx(sheet, title, sub, H, W, T, rows, images) {
  const n = H.length, last = CL(n - 1), NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
    cell = (r, c, v, s) => {
      const a = CL(c) + r;
      return typeof v === 'number'
        ? `<c r="${a}" s="${s}"><v>${v}</v></c>`
        : `<c r="${a}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${X(v)}</t></is></c>`;
    },
    fill = (r, s) => Array.from({ length: n - 1 }, (_, i) => `<c r="${CL(i + 1)}${r}" s="${s}"/>`).join('');
  let d = `<row r="1" ht="32" customHeight="1">${cell(1, 0, title, 1)}${fill(1, 1)}</row><row r="2" ht="24" customHeight="1">${cell(2, 0, sub, 2)}${fill(2, 2)}</row><row r="4" ht="26" customHeight="1">${H.map((h, i) => cell(4, i, h, 3)).join('')}</row>`;
  rows.forEach((row, j) => {
    const r = 5 + j, z = j % 2, img = images && images[j];
    const ht = img ? Math.max(30, Math.round(img.h * 0.75) + 10) : 30;
    d += `<row r="${r}" ht="${ht}" customHeight="1">${row.map((v, i) => { const t = T[i]; return cell(r, i, v, t == 'l' ? (z ? 7 : 5) : t == 'd' ? (z ? 9 : 8) : (z ? 6 : 4)); }).join('')}</row>`;
  });

  const imgs = [];
  if (images) images.forEach((img, j) => { if (img && img.bytes) imgs.push({ ...img, row: 4 + j, id: imgs.length + 1 }); });

  const ctDefaultImg = imgs.length ? '<Default Extension="jpeg" ContentType="image/jpeg"/>' : '';
  const ctOverrideDraw = imgs.length ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : '';
  const rNs = imgs.length ? ` xmlns:r="${R}"` : '';
  const drawingTag = imgs.length ? '<drawing r:id="rId1"/>' : '';

  const al = (h) => `<alignment horizontal="${h}" vertical="center" wrapText="1"/>`,
    xf = (nf, f, fi, b, h) => `<xf numFmtId="${nf}" fontId="${f}" fillId="${fi}" borderId="${b}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${al(h)}</xf>`,
    fo = (sz, b, c) => `<font>${b ? '<b/>' : ''}<sz val="${sz}"/><color rgb="FF${c}"/><name val="Calibri"/></font>`,
    fl = (c) => `<fill><patternFill patternType="solid"><fgColor rgb="FF${c}"/><bgColor indexed="64"/></patternFill></fill>`,
    sd = (t) => `<${t} style="thin"><color rgb="FFD9E2F3"/></${t}>`;

  const files = [
    ['[Content_Types].xml', H1 + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${ctDefaultImg}<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${ctOverrideDraw}</Types>`],
    ['_rels/.rels', H1 + `<Relationships xmlns="${PREL}"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', H1 + `<workbook ${NS} xmlns:r="${R}"><sheets><sheet name="${X(sheet)}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', H1 + `<Relationships xmlns="${PREL}"><Relationship Id="rId1" Type="${R}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${R}/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', H1 + `<styleSheet ${NS}><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><fonts count="4">${fo(10, 0, '202020')}${fo(11, 1, 'FFFFFF')}${fo(15, 1, 'FFFFFF')}${fo(10, 0, '44546A')}</fonts><fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${fl('17365D')}${fl('2F75B5')}${fl('F3F7FB')}${fl('D9EAF7')}</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border>${sd('left')}${sd('right')}${sd('top')}${sd('bottom')}<diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="10">${xf(0, 0, 0, 0, 'left')}${xf(0, 2, 2, 0, 'center')}${xf(0, 3, 5, 0, 'left')}${xf(0, 1, 3, 1, 'center')}${xf(0, 0, 0, 1, 'center')}${xf(0, 0, 0, 1, 'left')}${xf(0, 0, 4, 1, 'center')}${xf(0, 0, 4, 1, 'left')}${xf(164, 0, 0, 1, 'center')}${xf(164, 0, 4, 1, 'center')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
    ['xl/worksheets/sheet1.xml', H1 + `<worksheet ${NS}${rNs}><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${W.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${d}</sheetData><mergeCells count="2"><mergeCell ref="A1:${last}1"/><mergeCell ref="A2:${last}2"/></mergeCells><pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><pageSetup orientation="landscape"/>${drawingTag}</worksheet>`]
  ];

  if (imgs.length) {
    const anchors = imgs.map((im) => {
      const cx = Math.round(im.w * EMU), cy = Math.round(im.h * EMU);
      return `<xdr:oneCellAnchor><xdr:from><xdr:col>${im.col}</xdr:col><xdr:colOff>12000</xdr:colOff><xdr:row>${im.row}</xdr:row><xdr:rowOff>6000</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${im.id}" name="Foto${im.id}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="${R}" r:embed="rId${im.id}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
    }).join('');
    files.push(['xl/drawings/drawing1.xml', H1 + `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anchors}</xdr:wsDr>`]);
    files.push(['xl/drawings/_rels/drawing1.xml.rels', H1 + `<Relationships xmlns="${PREL}">${imgs.map((im) => `<Relationship Id="rId${im.id}" Type="${R}/image" Target="../media/image${im.id}.jpeg"/>`).join('')}</Relationships>`]);
    files.push(['xl/worksheets/_rels/sheet1.xml.rels', H1 + `<Relationships xmlns="${PREL}"><Relationship Id="rId1" Type="${R}/drawing" Target="../drawings/drawing1.xml"/></Relationships>`]);
    imgs.forEach((im) => files.push([`xl/media/image${im.id}.jpeg`, im.bytes]));
  }

  return zip(files);
}

/* ================= Persiapan gambar (thumbnail) ================= */
const THUMB_MAX = 120;
function blobToImage(blob) {
  return new Promise((ok, no) => {
    const img = new Image();
    const u = URL.createObjectURL(blob);
    img.onload = () => { URL.revokeObjectURL(u); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(u); no(new Error('decode')); };
    img.src = u;
  });
}
async function loadThumb(url) {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const blob = await res.blob();
  let src;
  try { src = await createImageBitmap(blob); }
  catch (e) { src = await blobToImage(blob); }
  const sw = src.width || src.naturalWidth, sh = src.height || src.naturalHeight;
  const scale = Math.min(THUMB_MAX / sw, THUMB_MAX / sh, 1);
  const w = Math.max(1, Math.round(sw * scale)), h = Math.max(1, Math.round(sh * scale));
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  cv.getContext('2d').drawImage(src, 0, 0, w, h);
  if (src.close) src.close();
  const dataUrl = cv.toDataURL('image/jpeg', 0.72);
  const bytes = new Uint8Array(await (await fetch(dataUrl)).arrayBuffer());
  return { bytes, dataUrl, w, h };
}
async function preloadFotos(list) {
  const map = new Map();
  const withFoto = list.filter((s) => s.foto);
  if (withFoto.length) toast('Memuat ' + withFoto.length + ' foto…');
  for (const s of withFoto) {
    try { map.set(s.id, await loadThumb(s.foto)); }
    catch (e) { map.set(s.id, null); }
  }
  return map;
}

/* ================= Unduhan ================= */
export function downloadBlob(name, blob, msg) {
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    const href = a.href;
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 4000);
    toast(msg || 'Mengunduh ' + name);
  } catch (e) {
    toast('Download tidak tersedia di tampilan ini');
  }
}

/* ================= Pemuatan library (CDN) ================= */
const lib = (u) => new Promise((ok, no) => {
  const e = document.createElement('script');
  e.src = u;
  e.onload = ok;
  e.onerror = () => no(new Error(u));
  document.head.appendChild(e);
});
const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/';
export async function needXLSX() { if (!window.XLSX) await lib(CDN + 'xlsx/0.18.5/xlsx.full.min.js'); }
export async function needPDF() {
  if (!window.jspdf) await lib(CDN + 'jspdf/2.5.1/jspdf.umd.min.js');
  if (!(window.jspdf && window.jspdf.jsPDF.API.autoTable)) await lib(CDN + 'jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
}

/* ================= Export Excel ================= */
export function xlItems(items) {
  downloadBlob('data-barang.xlsx', xlsx('Data Barang', 'DATA BARANG — PT TERMINAL PETIKEMAS SURABAYA', 'Dicetak: ' + new Date().toLocaleString('id-ID') + ' · ' + items.length + ' barang', ['No', 'Kode Barang', 'Kode Akun', 'Nama Barang', 'Kategori', 'Satuan', 'Gudang', 'Lokasi'], [7, 16, 16, 36, 18, 12, 24, 18], 'cccllccl', items.map((i, n) => [n + 1, i.kode, i.akun || '', i.nama, i.kat || '', i.satuan, i.gudang || '', i.lokasi || ''])));
}

export async function xlSO(soList, items) {
  const L = [...soList].sort((a, b) => a.tgl.localeCompare(b.tgl));
  const ak = (k) => items.find((i) => i.kode == k)?.akun || '';
  const fotos = await preloadFotos(L);
  const rows = L.map((s, i) => [i + 1, sr(s.tgl), s.akun || ak(s.kode), s.gudang, s.kode, s.nama, s.fisik, s.satuan, fotos.get(s.id) ? '' : (s.foto ? 'Ada' : '-')]);
  const images = L.map((s) => { const t = fotos.get(s.id); return t ? { col: 8, bytes: t.bytes, w: t.w, h: t.h } : null; });
  downloadBlob('stock-opname.xlsx', xlsx('Stock Opname', 'TEMPLATE STOCK OPNAME — PT TERMINAL PETIKEMAS SURABAYA', 'Hasil pemeriksaan fisik persediaan · Dicetak: ' + new Date().toLocaleString('id-ID') + ' · ' + L.length + ' data', ['Nomor', 'Tanggal', 'Kode Akun', 'Gudang', 'Kode', 'Nama Barang', 'Fisik', 'Satuan', 'Foto'], [10, 15, 18, 22, 18, 34, 14, 14, 32], 'cdccclccc', rows, images));
}

/* ================= Export PDF ================= */
async function pdf(name, title, sub, H, rows, cs, opts) {
  try { await needPDF(); } catch (e) { return toast('Library PDF gagal dimuat. Periksa koneksi internet.'); }
  const d = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  d.setFontSize(14); d.setFont(undefined, 'bold'); d.text(title, 40, 38);
  d.setFont(undefined, 'normal'); d.setFontSize(9); d.setTextColor(100); d.text(sub, 40, 54);
  const cfg = {
    head: [H], body: rows.length ? rows : [[{ content: 'Belum ada data', colSpan: H.length, styles: { halign: 'center' } }]], startY: 66, margin: { left: 40, right: 40, bottom: 36 },
    styles: { fontSize: 8, cellPadding: 4, valign: 'middle', lineColor: [217, 226, 243], lineWidth: .5 },
    headStyles: { fillColor: [20, 43, 74], textColor: 255, halign: 'center' }, alternateRowStyles: { fillColor: [243, 247, 251] }, columnStyles: cs || {}
  };
  if (opts && opts.images) {
    cfg.didDrawCell = (data) => {
      if (data.section !== 'body' || data.column.index !== opts.imageCol) return;
      const img = opts.images[data.row.index];
      if (!img) return;
      const pad = 2, bw = data.cell.width - pad * 2, bh = data.cell.height - pad * 2;
      const scale = Math.min(bw / img.w, bh / img.h, 1);
      const w = img.w * scale, h = img.h * scale;
      d.addImage(img.dataUrl, 'JPEG', data.cell.x + (data.cell.width - w) / 2, data.cell.y + (data.cell.height - h) / 2, w, h);
    };
  }
  d.autoTable(cfg);
  const n = d.getNumberOfPages(), w = d.internal.pageSize.getWidth(), h = d.internal.pageSize.getHeight();
  for (let i = 1; i <= n; i++) { d.setPage(i); d.setFontSize(8); d.setTextColor(120); d.text('Halaman ' + i + ' dari ' + n, w - 40, h - 18, { align: 'right' }); }
  downloadBlob(name, d.output('blob'), 'PDF diekspor');
}

export function pdfItems(items) {
  return pdf('data-barang.pdf', 'DATA BARANG — PT TERMINAL PETIKEMAS SURABAYA', 'Dicetak: ' + new Date().toLocaleString('id-ID') + ' · ' + items.length + ' barang', ['No', 'Kode Barang', 'Kode Akun', 'Nama Barang', 'Kategori', 'Satuan', 'Gudang', 'Lokasi'],
    items.map((i, n) => [n + 1, i.kode, i.akun || '', i.nama, i.kat || '', i.satuan || '', i.gudang || '', i.lokasi || '']), { 0: { halign: 'center', cellWidth: 32 }, 5: { halign: 'center' } });
}

export async function pdfSO(soList, items) {
  const L = [...soList].sort((a, b) => a.tgl.localeCompare(b.tgl));
  const ak = (k) => items.find((i) => i.kode == k)?.akun || '';
  const fotos = await preloadFotos(L);
  const body = L.map((s, i) => {
    const t = fotos.get(s.id);
    const fotoCell = t ? { content: '', styles: { minCellHeight: 56 } } : (s.foto ? 'Ada' : '-');
    return [i + 1, new Date(s.tgl).toLocaleDateString('id-ID'), s.akun || ak(s.kode), s.gudang || '', s.kode, s.nama, s.fisik, s.satuan, fotoCell];
  });
  const images = L.map((s) => { const t = fotos.get(s.id); return t ? { dataUrl: t.dataUrl, w: t.w, h: t.h } : null; });
  return pdf('stock-opname.pdf', 'TEMPLATE STOCK OPNAME — PT TERMINAL PETIKEMAS SURABAYA', 'Hasil pemeriksaan fisik persediaan · Dicetak: ' + new Date().toLocaleString('id-ID') + ' · ' + L.length + ' data', ['Nomor', 'Tanggal', 'Kode Akun', 'Gudang', 'Kode', 'Nama Barang', 'Fisik', 'Satuan', 'Foto'],
    body, { 0: { halign: 'center', cellWidth: 40 }, 1: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'center' }, 8: { halign: 'center', cellWidth: 60 } },
    { imageCol: 8, images });
}

/* ================= Template impor ================= */
export const IH = ['No', 'Kode Barang', 'Kode Akun', 'Nama Barang', 'Kategori', 'Satuan', 'Gudang', 'Lokasi'];
export function tplItems() {
  downloadBlob('template-impor-data-barang.xlsx', xlsx('Data Barang', 'TEMPLATE IMPOR DATA BARANG', 'Isi data mulai baris 5. Wajib: Kode Barang, Nama Barang, Satuan. Kolom No boleh dikosongkan.', IH, [7, 16, 16, 36, 18, 12, 24, 18], 'cccllccl', []), 'Template diunduh');
}
