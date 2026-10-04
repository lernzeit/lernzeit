// Nahtlose Loops fuer die Landingpage (ohne Text im Bild).
//   window.szene = 'kind'   Kind-Handy: Aufgaben loesen, Muenzen, Zeitring (6 s)
//   window.szene = 'eltern' Eltern-Handy: Anfrage kommt, Freigeben, Haken (3,2 s)
// render(t) ist eine reine Funktion der Zeit; t = 0 und t = DAUER sehen gleich aus.

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const outCubic = (k) => 1 - Math.pow(1 - k, 3);
const inCubic = (k) => k * k * k;
const inOutCubic = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const outExpo = (k) => (k === 1 ? 1 : 1 - Math.pow(2, -10 * k));
const outBack = (k, s = 1.7) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
const feder = (k, f = 4.5, d = 6) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 - Math.exp(-d * k) * Math.cos(f * Math.PI * k));
const $ = (id) => document.getElementById(id);
const setz = (el, { x = 0, y = 0, s = 1, r = 0, o = 1 } = {}) => {
  el.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`;
  el.style.opacity = o;
};

const SZENE = new URLSearchParams(location.search).get('szene') || 'kind';
const DAUER = SZENE === 'kind' ? 6 : 3.2;
window.DAUER = DAUER;
const PX = 260, PY = 415; // Handy mittig auf 1080 × 1920

function hintergrund(t) {
  const w = (t / DAUER) * Math.PI * 2;
  setz($('blob1'), { x: -300 + Math.sin(w) * 120, y: 1100 + Math.cos(w) * 90 });
  setz($('blob2'), { x: 580 + Math.cos(w) * 110, y: 200 + Math.sin(w) * 120, o: 0.7 });
}

// ---------------------------------------------------------------- Kind
const AUFGABEN = [
  { a: '7 × 8', fach: 'Mathe · Klasse 3', r: ['54', '56', '63'], ok: 1 },
  { a: '9 + 6', fach: 'Mathe · Klasse 2', r: ['15', '14', '16'], ok: 0 },
  { a: '48 : 6', fach: 'Mathe · Klasse 3', r: ['6', '9', '8'], ok: 2 },
  { a: '12 × 3', fach: 'Mathe · Klasse 4', r: ['36', '33', '32'], ok: 0 },
];
const TREFFER = [0.9, 2.1, 3.3, 4.5];
const WECHSEL = [1.45, 2.65, 3.85, 5.45]; // danach naechste Aufgabe, nach der letzten wieder die erste

function kind(t) {
  $('handy-eltern').style.display = 'none';
  setz($('handy-kind'), { x: PX, y: PY });
  $('sperre').style.display = 'none';
  $('funken').style.display = 'none';

  let n = 0;
  for (const w of WECHSEL) if (t >= w) n++;
  const idx = n % AUFGABEN.length;
  const neuerDurchlauf = n === AUFGABEN.length; // erste Aufgabe kommt zurueck
  const auf = AUFGABEN[idx];
  $('aufgabe').textContent = auf.a;
  $('fach').textContent = auf.fach;
  const seitWechsel = n === 0 ? 9 : t - WECHSEL[n - 1];
  const kartenK = outExpo(clamp(seitWechsel / 0.25));
  setz($('karte'), { x: (1 - kartenK) * 80, o: 0.3 + 0.7 * kartenK });
  const trefferZeit = TREFFER[idx];
  for (let i = 0; i < 3; i++) {
    const k = $('a' + i);
    k.querySelector('span').textContent = auf.r[i];
    const richtig = !neuerDurchlauf && i === auf.ok && t >= trefferZeit;
    const druck = !neuerDurchlauf && i === auf.ok ? seg(t, trefferZeit - 0.06, trefferZeit + 0.12) : 0;
    k.style.background = richtig ? 'var(--gruen)' : '#fff';
    k.style.borderColor = richtig ? 'var(--gruen)' : '#E2E8F0';
    k.style.color = richtig ? '#fff' : 'var(--text)';
    const knopfEin = outBack(clamp((seitWechsel - 0.03 * i) / 0.22));
    setz(k, { s: (0.85 + 0.15 * knopfEin) * (1 - Math.sin(druck * Math.PI) * 0.08), o: clamp(knopfEin) });
  }
  const welle = $('welle');
  const wk = neuerDurchlauf || idx !== 0 ? 0 : seg(t, TREFFER[0], TREFFER[0] + 0.45);
  welle.style.transform = `scale(${wk * 9})`;
  welle.style.opacity = wk > 0 ? 1 - wk : 0;

  // Finger
  const ziel = (i) => ({ x: 40 + i * 145.3 + 61.7 - 48, y: 747 });
  let fo = 0, fx = 0, fy = 0, fs = 1;
  TREFFER.forEach((tt, m) => {
    const k = seg(t, tt - 0.32, tt + 0.25);
    if (k > 0 && k < 1) {
      const z = ziel(AUFGABEN[m].ok);
      const an = outCubic(seg(t, tt - 0.32, tt - 0.04));
      fx = z.x + (1 - an) * 120; fy = z.y + (1 - an) * 260;
      fo = Math.min(an * 1.4, 1 - seg(t, tt + 0.08, tt + 0.25));
      fs = 1 - Math.sin(seg(t, tt - 0.06, tt + 0.1) * Math.PI) * 0.25;
    }
  });
  setz($('finger'), { x: fx, y: fy, s: fs, o: fo });

  // Zeitring: +30 s je Treffer, am Ende sanft zurueck auf 0
  let guthaben = 0;
  TREFFER.forEach((tt) => { guthaben += outCubic(seg(t, tt + 0.5, tt + 0.75)) * 30; });
  guthaben *= 1 - inOutCubic(seg(t, 5.3, 5.9));
  const sek = Math.round(guthaben);
  $('ringtext').textContent = `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')}`;
  $('ringbogen').setAttribute('stroke-dashoffset', 276.46 * (1 - guthaben / 150));
  const puls = TREFFER.reduce((m, tt) => Math.max(m, Math.sin(seg(t, tt + 0.5, tt + 0.75) * Math.PI)), 0);
  setz($('ring'), { s: 1 + puls * 0.08 });

  // Muenzen
  TREFFER.forEach((tt, m) => {
    const el = $('m' + m);
    const k = seg(t, tt, tt + 0.55);
    if (k <= 0 || k >= 1) { el.style.opacity = 0; return; }
    const hx = PX + 18, hy = PY + 18;
    const sx = hx + 40 + AUFGABEN[m].ok * 156 + 20, sy = hy + 720;
    const zx = hx + 152, zy = hy + 150;
    const e = inOutCubic(k);
    const cx = sx + 300, cy = sy - 420;
    const x = (1 - e) * (1 - e) * sx + 2 * (1 - e) * e * cx + e * e * zx;
    const y = (1 - e) * (1 - e) * sy + 2 * (1 - e) * e * cy + e * e * zy;
    const s = outBack(clamp(k / 0.25)) * (1 - 0.5 * seg(k, 0.75, 1));
    setz(el, { x, y, s, r: Math.sin(k * Math.PI) * 10, o: 1 - seg(k, 0.88, 1) });
  });
}

// ---------------------------------------------------------------- Eltern
function eltern(t) {
  $('handy-kind').style.display = 'none';
  $('muenzen').style.display = 'none';
  setz($('handy-eltern'), { x: PX, y: PY });
  const ein = outBack(clamp(seg(t, 0.25, 0.6)), 1.4);
  const aus = inCubic(seg(t, 2.55, 2.95));
  setz($('anfrage'), { y: (1 - ein) * 60 - aus * 40, s: 0.92 + 0.08 * ein, o: Math.min(ein, 1 - aus) });
  const tap = 1.45;
  const druck = seg(t, tap - 0.05, tap + 0.12);
  setz($('k-ja'), { s: 1 - Math.sin(druck * Math.PI) * 0.08 });
  const fk = outCubic(seg(t, tap - 0.3, tap - 0.03));
  setz($('finger2'), { x: 330 + (1 - fk) * 100, y: 640 + (1 - fk) * 200, s: 1 - Math.sin(druck * Math.PI) * 0.25, o: Math.min(fk * 1.4, 1 - seg(t, tap + 0.1, tap + 0.25)) });
  const haken = feder(seg(t, tap + 0.05, tap + 0.5), 2.5, 6);
  setz($('haken-gross'), { s: haken * (1 - aus * 0.3), o: Math.min(clamp(haken * 2), 1 - aus) });
  $('hakenpfad').setAttribute('stroke-dashoffset', 24 * (1 - outCubic(seg(t, tap + 0.15, tap + 0.4))));
  const k = seg(t, tap + 0.1, tap + 0.55);
  const cx = PX + 18 + 262, cy = PY + 18 + 920;
  for (let i = 0; i < 14; i++) {
    const w = (i / 14) * Math.PI * 2;
    const r = outCubic(k) * (180 + (i % 3) * 50);
    setz($('f' + i), { x: cx + Math.cos(w) * r, y: cy + Math.sin(w) * r, s: 1 - k * 0.6, o: k > 0 && k < 1 ? 1 - k : 0 });
  }
}

// ---------------------------------------------------------------- Aufbau
for (let i = 0; i < 4; i++) {
  const d = document.createElement('div');
  d.className = 'abs muenze'; d.id = 'm' + i; d.textContent = '+30 Sek.';
  $('muenzen').appendChild(d);
}
for (let i = 0; i < 14; i++) {
  const d = document.createElement('div');
  d.className = 'abs funke'; d.id = 'f' + i;
  d.style.background = ['#13C96A', '#3B82F6', '#F59E0B'][i % 3];
  $('funken').appendChild(d);
}

window.render = (t) => {
  hintergrund(t);
  if (SZENE === 'kind') kind(t); else eltern(t);
};
window.render(0);
window.bereit = document.fonts.ready.then(() => true);
