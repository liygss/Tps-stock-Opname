export const $ = (s) => document.querySelector(s);
export const V = (id) => $('#' + id)?.value ?? '';
export const E = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function toast(m) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = m;
  t.style.display = 'block';
  clearTimeout(t.h);
  t.h = setTimeout(() => (t.style.display = 'none'), 3500);
}

export function closeM() {
  const m = $('#mdl');
  if (m) m.remove();
}

export function modal(title, body) {
  closeM();
  const d = document.createElement('div');
  d.id = 'mdl';
  d.className = 'mdl';
  d.onmousedown = (e) => { if (e.target == d) closeM(); };
  d.innerHTML = `<div class="mbox"><div class="mh"><h3>${title}</h3><button class="x" title="Tutup" aria-label="Tutup" onclick="closeM()">✕</button></div>${body}</div>`;
  document.body.appendChild(d);
}

addEventListener('keydown', (e) => { if (e.key == 'Escape') closeM(); });

window.closeM = closeM;
