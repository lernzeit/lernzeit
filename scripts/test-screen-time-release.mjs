/**
 * Prueft die Rechnung, an der die Gerätesperre aufgeht — oder eben nicht:
 *
 *   1. Eine genehmigte Anfrage wird GENAU EINMAL eingeloest.
 *   2. Scheitert das Entsperren, wird die Buchung zurueckgenommen — das Kind
 *      verliert keine verdiente Zeit.
 *   3. Eine laufende Freigabe wird nur dann nachgeholt, wenn das Geraet
 *      wirklich keine kennt. Sonst verdoppelt sich die Zeit, weil
 *      `releaseFor` verlaengert statt ersetzt.
 *
 * Warum ein eigenes Skript: Wie bei scripts/test-analytics.mjs gibt es fuer
 * `src/` keinen Unit-Runner. Diese drei Punkte sind aber genau die, bei denen
 * ein Fehler entweder ein Kind um seine Minuten bringt oder ihm das Telefon
 * stundenlang offen laesst.
 *
 *   node scripts/test-screen-time-release.mjs
 */
import * as esbuild from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const stubs = {
  name: 'stubs',
  setup(build) {
    build.onResolve({ filter: /^@\/lib\/supabase$/ }, () => ({ path: 'supabase', namespace: 'stub' }));
    build.onResolve({ filter: /^@\/services\/screenTime\/plugin$/ }, () => ({ path: 'plugin', namespace: 'stub' }));
    build.onResolve({ filter: /^sonner$/ }, () => ({ path: 'sonner', namespace: 'stub' }));
    build.onLoad({ filter: /.*/, namespace: 'stub' }, ({ path }) => ({
      loader: 'js',
      contents: {
        // Lazy: Die Ersatzobjekte stehen erst kurz vor jedem Testfall fest,
        // das Modul wird aber einmal am Anfang geladen.
        supabase: 'export const supabase = new Proxy({}, { get: (_, k) => globalThis.__sb[k] });',
        plugin: 'export const ScreenTime = new Proxy({}, { get: (_, k) => globalThis.__st[k] }); export const screenTimeSupportedPlatform = () => true;',
        sonner: 'export const toast = { success: (...a) => globalThis.__toasts.push(a) };',
      }[path],
    }));
  },
};

const dir = await mkdtemp(join(tmpdir(), 'lernzeit-release-'));
const bundle = join(dir, 'release.mjs');
await esbuild.build({
  entryPoints: ['src/services/screenTime/release.ts'],
  bundle: true,
  format: 'esm',
  outfile: bundle,
  plugins: [stubs],
  logLevel: 'error',
});

let fehler = 0;
const pruefe = (bedingung, text) => {
  console.log(`${bedingung ? 'OK   ' : 'FEHL '}${text}`);
  if (!bedingung) fehler++;
};

/** Baut einen Supabase-Ersatz, der feste Zeilen liefert und Aufrufe mitschreibt. */
function baueSupabase({ genehmigt = [], freigaben = [], antwort }) {
  const aufrufe = [];
  const kette = (zeilen) => {
    const selbst = {
      select: () => selbst, eq: () => selbst, gte: () => selbst,
      order: () => Promise.resolve({ data: zeilen }),
      then: (aufloesen) => Promise.resolve({ data: zeilen }).then(aufloesen),
    };
    return selbst;
  };
  return {
    aufrufe,
    from: (tabelle) => kette(tabelle === 'screen_time_requests' ? genehmigt : freigaben),
    functions: {
      invoke: async (name, optionen) => {
        aufrufe.push(optionen.body);
        return antwort(optionen.body);
      },
    },
  };
}

const { offeneGenehmigungen, nachzuholendeMinuten, gleicheFreigabenAb } = await import(bundle);

// ── 1. Welche Genehmigungen sind offen ───────────────────────────────────
{
  const genehmigt = [
    { id: 'a', requested_minutes: 15 },
    { id: 'b', requested_minutes: 30 },
  ];
  const freigaben = [{ id: 'u1', request_id: 'a', expires_at: new Date().toISOString() }];
  const offen = offeneGenehmigungen(genehmigt, freigaben);
  pruefe(offen.length === 1 && offen[0].id === 'b', 'eingeloeste Genehmigung faellt raus');
  pruefe(offen[0].minutes === 30, 'die Minuten kommen aus der Anfrage');
  pruefe(offeneGenehmigungen([], freigaben).length === 0, 'ohne Genehmigung nichts offen');
  pruefe(offeneGenehmigungen(genehmigt, []).length === 2, 'ohne Freigaben ist alles offen');
  pruefe(
    offeneGenehmigungen(genehmigt, [{ id: 'u2', request_id: null, expires_at: '' }]).length === 2,
    'eine Auto-Freigabe ohne request_id loescht keine Genehmigung',
  );
}

// ── 2. Nachholen nur ohne laufende Freigabe ──────────────────────────────
{
  const jetzt = Date.parse('2026-09-20T12:00:00Z');
  const bis1230 = [{ id: 'u', request_id: 'a', expires_at: '2026-09-20T12:30:00Z' }];

  pruefe(nachzuholendeMinuten(bis1230, null, jetzt) === 30, 'ohne Freigabe am Geraet: 30 Minuten nachholen');
  pruefe(
    nachzuholendeMinuten(bis1230, '2026-09-20T12:30:00Z', jetzt) === 0,
    'laufende Freigabe am Geraet: nichts nachholen (sonst doppelte Zeit)',
  );
  pruefe(
    nachzuholendeMinuten(bis1230, '2026-09-20T11:00:00Z', jetzt) === 30,
    'abgelaufene Freigabe am Geraet zaehlt nicht als laufend',
  );
  pruefe(
    nachzuholendeMinuten([{ id: 'u', request_id: 'a', expires_at: '2026-09-20T11:00:00Z' }], null, jetzt) === 0,
    'abgelaufene Zeile wird nicht nachgeholt',
  );
  pruefe(
    nachzuholendeMinuten([{ id: 'u', request_id: 'a', expires_at: '2026-09-20T12:00:20Z' }], null, jetzt) === 1,
    'Restsekunden werden auf eine Minute aufgerundet',
  );
  pruefe(nachzuholendeMinuten([], null, jetzt) === 0, 'ohne Zeilen nichts nachzuholen');
  pruefe(
    nachzuholendeMinuten(
      [
        { id: 'u1', request_id: 'a', expires_at: '2026-09-20T12:10:00Z' },
        { id: 'u2', request_id: 'b', expires_at: '2026-09-20T12:40:00Z' },
      ],
      null,
      jetzt,
    ) === 40,
    'bei mehreren Zeilen zaehlt die spaeteste',
  );
}

// ── 3. Der Abgleich von Anfang bis Ende ──────────────────────────────────
async function laufAbgleich({ managing = true, releasedUntil = null, genehmigt, freigaben, releaseWirft = false, cancelled = false, antwort }) {
  globalThis.__toasts = [];
  const releases = [];
  globalThis.__st = {
    getStatus: async () => ({
      authorization: 'approved', managing, shieldAll: true,
      shieldedCount: 0, releasedUntil,
    }),
    releaseFor: async ({ minutes }) => {
      releases.push(minutes);
      if (releaseWirft) throw new Error('kein Geraet');
      return {
        authorization: 'approved', managing: true, shieldAll: true,
        shieldedCount: 0,
        releasedUntil: new Date(Date.now() + minutes * 60_000).toISOString(),
        cancelled, grantedMinutes: cancelled ? 0 : minutes,
      };
    },
  };
  const sb = baueSupabase({ genehmigt, freigaben, antwort });
  globalThis.__sb = sb;
  await gleicheFreigabenAb('kind-1');
  return { releases, aufrufe: sb.aufrufe, toasts: globalThis.__toasts };
}

const erfolg = (body) => ({
  data: body.action === 'redeem_unlock'
    ? { success: true, unlock: { id: 'u-neu', minutes: 15 } }
    : { success: true },
  error: null,
});

{
  const { releases, aufrufe, toasts } = await laufAbgleich({
    genehmigt: [{ id: 'a', requested_minutes: 15 }], freigaben: [], antwort: erfolg,
  });
  pruefe(aufrufe.length === 1 && aufrufe[0].action === 'redeem_unlock', 'offene Genehmigung wird gebucht');
  pruefe(releases.length === 1 && releases[0] === 15, 'danach wird fuer 15 Minuten entsperrt');
  pruefe(toasts.length === 1, 'das Kind bekommt eine Meldung');
}

{
  const { releases, aufrufe } = await laufAbgleich({
    managing: false,
    genehmigt: [{ id: 'a', requested_minutes: 15 }], freigaben: [], antwort: erfolg,
  });
  pruefe(aufrufe.length === 0 && releases.length === 0, 'ohne Sperre auf dem Geraet passiert nichts');
}

{
  const { releases, aufrufe } = await laufAbgleich({
    genehmigt: [{ id: 'a', requested_minutes: 15 }],
    freigaben: [{ id: 'u1', request_id: 'a', expires_at: new Date(Date.now() - 60_000).toISOString() }],
    antwort: erfolg,
  });
  pruefe(aufrufe.length === 0, 'eine bereits eingeloeste Genehmigung wird nicht erneut gebucht');
  pruefe(releases.length === 0, 'und nicht erneut entsperrt');
}

{
  const { releases, aufrufe } = await laufAbgleich({
    genehmigt: [], freigaben: [{ id: 'u1', request_id: 'a', expires_at: new Date(Date.now() + 10 * 60_000).toISOString() }],
    antwort: erfolg,
  });
  pruefe(releases.length === 1 && releases[0] === 10, 'eine verlorene Freigabe wird nachgeholt');
  pruefe(aufrufe.length === 0, 'ohne dass dafuer neu gebucht wird');
}

{
  const { releases } = await laufAbgleich({
    releasedUntil: new Date(Date.now() + 10 * 60_000).toISOString(),
    genehmigt: [], freigaben: [{ id: 'u1', request_id: 'a', expires_at: new Date(Date.now() + 10 * 60_000).toISOString() }],
    antwort: erfolg,
  });
  pruefe(releases.length === 0, 'laeuft die Freigabe am Geraet schon, wird nichts nachgeholt');
}

{
  const { aufrufe } = await laufAbgleich({
    genehmigt: [{ id: 'a', requested_minutes: 15 }], freigaben: [], antwort: erfolg, releaseWirft: true,
  });
  pruefe(
    aufrufe.length === 2 && aufrufe[1].action === 'revoke_unlock' && aufrufe[1].unlockId === 'u-neu',
    'scheitert das Entsperren, wird die Buchung zurueckgenommen',
  );
}

{
  const { aufrufe } = await laufAbgleich({
    genehmigt: [{ id: 'a', requested_minutes: 15 }], freigaben: [], antwort: erfolg, cancelled: true,
  });
  pruefe(
    aufrufe.length === 2 && aufrufe[1].action === 'revoke_unlock',
    'ein abgebrochenes Entsperren zaehlt genauso — die Minuten bleiben dem Kind',
  );
}

{
  const { releases, toasts } = await laufAbgleich({
    genehmigt: [{ id: 'a', requested_minutes: 15 }], freigaben: [],
    antwort: () => ({ data: { success: true, alreadyRedeemed: true }, error: null }),
  });
  pruefe(releases.length === 0 && toasts.length === 0, '"schon eingeloest" entsperrt nicht noch einmal');
}

{
  const { releases } = await laufAbgleich({
    genehmigt: [{ id: 'a', requested_minutes: 15 }], freigaben: [],
    antwort: () => ({ data: null, error: { message: 'zu alt' } }),
  });
  pruefe(releases.length === 0, 'eine abgelehnte Buchung entsperrt nicht');
}

{
  const { releases, aufrufe } = await laufAbgleich({
    genehmigt: [{ id: 'a', requested_minutes: 15 }, { id: 'b', requested_minutes: 20 }],
    freigaben: [], antwort: erfolg,
  });
  pruefe(
    aufrufe.filter((a) => a.action === 'redeem_unlock').length === 2 && releases.length === 2,
    'mehrere offene Genehmigungen werden einzeln eingeloest',
  );
}

await rm(dir, { recursive: true, force: true });
console.log(fehler === 0 ? '\nAlle Pruefungen bestanden.' : `\n${fehler} Pruefung(en) fehlgeschlagen.`);
process.exit(fehler === 0 ? 0 : 1);
