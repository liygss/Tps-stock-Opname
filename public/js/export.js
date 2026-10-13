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
  for (const [n, t] of files) {
    const nb = te.encode(n), d = te.encode(t), c = crc(d), h = new DataView(new ArrayBuffer(30));
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

function xlsx(sheet, title, sub, H, W, T, rows) {
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
    const r = 5 + j, z = j % 2;
    d += `<row r="${r}" ht="30" customHeight="1">${row.map((v, i) => { const t = T[i]; return cell(r, i, v, t == 'l' ? (z ? 7 : 5) : t == 'd' ? (z ? 9 : 8) : (z ? 6 : 4)); }).join('')}</row>`;
  });
  const H1 = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n',
    R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    al = (h) => `<alignment horizontal="${h}" vertical="center" wrapText="1"/>`,
    xf = (nf, f, fi, b, h) => `<xf numFmtId="${nf}" fontId="${f}" fillId="${fi}" borderId="${b}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${al(h)}</xf>`,
    fo = (sz, b, c) => `<font>${b ? '<b/>' : ''}<sz val="${sz}"/><color rgb="FF${c}"/><name val="Calibri"/></font>`,
    fl = (c) => `<fill><patternFill patternType="solid"><fgColor rgb="FF${c}"/><bgColor indexed="64"/></patternFill></fill>`,
    sd = (t) => `<${t} style="thin"><color rgb="FFD9E2F3"/></${t}>`;
  return zip([
    ['[Content_Types].xml', H1 + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
    ['_rels/.rels', H1 + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', H1 + `<workbook ${NS} xmlns:r="${R}"><sheets><sheet name="${X(sheet)}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', H1 + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${R}/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', H1 + `<styleSheet ${NS}><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><fonts count="4">${fo(10, 0, '202020')}${fo(11, 1, 'FFFFFF')}${fo(15, 1, 'FFFFFF')}${fo(10, 0, '44546A')}</fonts><fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${fl('17365D')}${fl('2F75B5')}${fl('F3F7FB')}${fl('D9EAF7')}</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border>${sd('left')}${sd('right')}${sd('top')}${sd('bottom')}<diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="10">${xf(0, 0, 0, 0, 'left')}${xf(0, 2, 2, 0, 'center')}${xf(0, 3, 5, 0, 'left')}${xf(0, 1, 3, 1, 'center')}${xf(0, 0, 0, 1, 'center')}${xf(0, 0, 0, 1, 'left')}${xf(0, 0, 4, 1, 'center')}${xf(0, 0, 4, 1, 'left')}${xf(164, 0, 0, 1, 'center')}${xf(164, 0, 4, 1, 'center')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
    ['xl/worksheets/sheet1.xml', H1 + `<worksheet ${NS}><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${W.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${d}</sheetData><mergeCells count="2"><mergeCell ref="A1:${last}1"/><mergeCell ref="A2:${last}2"/></mergeCells><pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><pageSetup orientation="landscape"/></worksheet>`]
  ]);
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

export function xlSO(soList, items) {
  const L = [...soList].sort((a, b) => a.tgl.localeCompare(b.tgl));
  const ak = (k) => items.find((i) => i.kode == k)?.akun || '';
  downloadBlob('stock-opname.xlsx', xlsx('Stock Opname', 'TEMPLATE STOCK OPNAME — PT TERMINAL PETIKEMAS SURABAYA', 'Hasil pemeriksaan fisik persediaan · Dicetak: ' + new Date().toLocaleString('id-ID') + ' · ' + L.length + ' data', ['Nomor', 'Tanggal', 'Kode Akun', 'Gudang', 'Kode', 'Nama Barang', 'Fisik', 'Satuan', 'Foto'], [10, 15, 18, 22, 18, 34, 14, 14, 32], 'cdccclccc', L.map((s, i) => [i + 1, sr(s.tgl), s.akun || ak(s.kode), s.gudang, s.kode, s.nama, s.fisik, s.satuan, s.foto ? 'Ada' : '-'])));
}

/* ================= Export PDF ================= */
async function pdf(name, title, sub, H, rows, cs) {
  try { await needPDF(); } catch (e) { return toast('Library PDF gagal dimuat. Periksa koneksi internet.'); }
  const d = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  d.setFontSize(14); d.setFont(undefined, 'bold'); d.text(title, 40, 38);
  d.setFont(undefined, 'normal'); d.setFontSize(9); d.setTextColor(100); d.text(sub, 40, 54);
  d.autoTable({ head: [H], body: rows.length ? rows : [[{ content: 'Belum ada data', colSpan: H.length, styles: { halign: 'center' } }]], startY: 66, margin: { left: 40, right: 40, bottom: 36 }, styles: { fontSize: 8, cellPadding: 4, valign: 'middle', lineColor: [217, 226, 243], lineWidth: .5 }, headStyles: { fillColor: [20, 43, 74], textColor: 255, halign: 'center' }, alternateRowStyles: { fillColor: [243, 247, 251] }, columnStyles: cs || {} });
  const n = d.getNumberOfPages(), w = d.internal.pageSize.getWidth(), h = d.internal.pageSize.getHeight();
  for (let i = 1; i <= n; i++) { d.setPage(i); d.setFontSize(8); d.setTextColor(120); d.text('Halaman ' + i + ' dari ' + n, w - 40, h - 18, { align: 'right' }); }
  downloadBlob(name, d.output('blob'), 'PDF diekspor');
}

export function pdfItems(items) {
  pdf('data-barang.pdf', 'DATA BARANG — PT TERMINAL PETIKEMAS SURABAYA', 'Dicetak: ' + new Date().toLocaleString('id-ID') + ' · ' + items.length + ' barang', ['No', 'Kode Barang', 'Kode Akun', 'Nama Barang', 'Kategori', 'Satuan', 'Gudang', 'Lokasi'],
    items.map((i, n) => [n + 1, i.kode, i.akun || '', i.nama, i.kat || '', i.satuan || '', i.gudang || '', i.lokasi || '']), { 0: { halign: 'center', cellWidth: 32 }, 5: { halign: 'center' } });
}

export function pdfSO(soList, items) {
  const L = [...soList].sort((a, b) => a.tgl.localeCompare(b.tgl));
  const ak = (k) => items.find((i) => i.kode == k)?.akun || '';
  pdf('stock-opname.pdf', 'TEMPLATE STOCK OPNAME — PT TERMINAL PETIKEMAS SURABAYA', 'Hasil pemeriksaan fisik persediaan · Dicetak: ' + new Date().toLocaleString('id-ID') + ' · ' + L.length + ' data', ['Nomor', 'Tanggal', 'Kode Akun', 'Gudang', 'Kode', 'Nama Barang', 'Fisik', 'Satuan', 'Foto'],
    L.map((s, i) => [i + 1, new Date(s.tgl).toLocaleDateString('id-ID'), s.akun || ak(s.kode), s.gudang || '', s.kode, s.nama, s.fisik, s.satuan, s.foto ? 'Ada' : '-']),
    { 0: { halign: 'center', cellWidth: 40 }, 1: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'center' }, 8: { halign: 'center', cellWidth: 40 } });
}

/* ================= Template impor ================= */
export const IH = ['No', 'Kode Barang', 'Kode Akun', 'Nama Barang', 'Kategori', 'Satuan', 'Gudang', 'Lokasi'];
export function tplItems() {
  downloadBlob('template-impor-data-barang.xlsx', xlsx('Data Barang', 'TEMPLATE IMPOR DATA BARANG', 'Isi data mulai baris 5. Wajib: Kode Barang, Nama Barang, Satuan. Kolom No boleh dikosongkan.', IH, [7, 16, 16, 36, 18, 12, 24, 18], 'cccllccl', []), 'Template diunduh');
}
