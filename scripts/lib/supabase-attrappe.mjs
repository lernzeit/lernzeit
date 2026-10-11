/**
 * Attrappe fuer Supabase — nur fuer Bildschirmaufnahmen der echten App
 * (scripts/nimm-app-bilder-auf.mjs).
 *
 * Playwright faengt jeden Aufruf an *.supabase.co ab und beantwortet ihn hier
 * aus festen Beispieldaten: eine Familie mit Mia (Klasse 3) und Anna. Nichts
 * geht an die echte Datenbank, nichts wird gelesen oder geschrieben, es
 * entsteht kein Konto. Die App merkt davon nichts: Sie zeigt ihre echten
 * Bildschirme, nur eben mit diesen Daten.
 *
 * Der kleine PostgREST-Nachbau kann, was die Bildschirme brauchen: Filter
 * (eq, neq, gt, gte, lt, lte, in, is), order, limit, Einzelzeilen
 * (Accept: vnd.pgrst.object) und Zaehlungen (Prefer: count). Edge Functions
 * antworten mit dem, was die Hooks erwarten (check-subscription,
 * screen-time-request), Datenbank-Funktionen aus `d.rpc` (z. B. tinte_stand).
 */
export const KIND = '11111111-1111-4111-8111-111111111111';
export const ELTERN = '22222222-2222-4222-8222-222222222222';

const tagIso = (vorTagen = 0) => new Date(Date.now() - vorTagen * 864e5).toISOString().slice(0, 10);
const um = (hhmm, vorTagen = 0) => `${tagIso(vorTagen)}T${hhmm}:00.000Z`;
const vorMinuten = (min) => new Date(Date.now() - min * 60000).toISOString();

const profil = (id, name, role, grade) => ({
  id, name, role, grade, avatar_id: null, avatar_color: null, username: role === 'child' ? 'mia' : null,
  created_at: '2026-09-01T10:00:00Z', updated_at: '2026-09-01T10:00:00Z', role_locked: true,
  daily_push_enabled: true, daily_summary_hour: 18, learning_reminder_hour: 16, is_founding_family: false,
  founding_family_at: null, last_platform: 'web', last_platform_at: null,
  // schon bewertet: keine Bitte um eine Store-Bewertung im Bild
  last_rating_prompt_at: '2026-09-20T10:00:00Z', rating_prompt_response: 'rated', referral_announce_sent_at: null,
});

const runde = (id, kategorie, hhmm, vorTagen, sekunden) => ({
  id, user_id: KIND, category: kategorie, grade: 3, correct_answers: 5, total_questions: 5, time_earned: 150,
  time_spent: sekunden, duration_seconds: sekunden, score: 5, session_date: um(hhmm, vorTagen), created_at: um(hhmm, vorTagen),
  learning_plan_id: null, question_source: 'pool',
});

/** Beispieldaten. Heute: 3 Runden je 5 Aufgaben, alle richtig (3 x 150 s). Davor 6 Tage je eine Runde. */
export function beispieldaten() {
  const fruehere = [1, 2, 3, 4, 5, 6].map((t) => runde(`v${t}`, ['math', 'german', 'english'][t % 3], '15:10', t, 150));
  const mia = { ...profil(KIND, 'Mia', 'child', 3), avatar_id: 'fox', avatar_color: '#fde68a' };
  const fehler = (i, text, optionen, richtig, fach = 'math') => ({
    id: `r${i}`, user_id: KIND, question_text: text, correct_answer: richtig, question_type: 'MULTIPLE_CHOICE', options: optionen,
    subject: fach, grade: 3, hint: null, next_review_at: um('08:00', 1), review_count: 0, max_reviews: 3, is_retired: false,
    was_reported: false, created_at: um('15:00', 2), updated_at: um('15:00', 2),
  });
  return {
    profiles: [mia, profil(ELTERN, 'Anna', 'parent', null)],
    // Klecksis Heftrand-Reise: Seite 4, sechs Felder; drei Seiten im Regal
    kind_reise_felder: [
      ['math', 'runde'], ['german', 'runde'], ['english', 'lernplan'], ['english', 'lernplan'], ['math', 'schwerpunkt'], ['math', 'schwerpunkt'],
    ].map(([fach, quelle], i) => ({ child_id: KIND, seite: 4, feld: i + 1, fach, quelle, sitzung_id: null, created_at: um('13:00', 1) })),
    kind_reise_seiten: [
      { child_id: KIND, seite: 1, faltung: 'papierflieger', bunt: true, bonus_minuten: 0, fertig_am: '2026-09-20T15:00:00Z' },
      { child_id: KIND, seite: 2, faltung: 'hund', bunt: false, bonus_minuten: 0, fertig_am: '2026-09-27T15:00:00Z' },
      { child_id: KIND, seite: 3, faltung: 'becher', bunt: true, bonus_minuten: 5, fertig_am: '2026-10-05T15:00:00Z' },
    ],
    kind_freigeschaltet: [{ child_id: KIND, art: 'avatar', ding: 'lion', created_at: '2026-10-01T15:00:00Z' }],
    child_subject_visibility: ['math', 'german', 'english', 'science', 'geography', 'history', 'physics', 'biology', 'chemistry', 'latin'].map((fach) => ({
      id: `v-${fach}`, parent_id: ELTERN, child_id: KIND, subject: fach,
      is_visible: ['math', 'german', 'english', 'science'].includes(fach), is_priority: fach === 'math',
    })),
    learning_plans: [{
      id: '66666666-6666-4666-8666-666666666661', parent_id: ELTERN, child_id: KIND, child_name: 'Mia', grade: 3, subject: 'english',
      topic: 'Farben und Zahlen', test_date: tagIso(-3), status: 'generated', lernstoff: null, gestartet_am: tagIso(1),
      plan_data: [{ focus: 'Farben' }, { focus: 'Zahlen bis 20' }, { focus: 'Wiederholung' }, { focus: 'Probetest' }],
      created_at: um('09:00', 2), updated_at: um('09:00', 2),
    }],
    review_queue: [
      fehler(1, 'Was ist 7 · 8?', ['54', '56', '64', '48'], '56'),
      fehler(2, 'Was ist 36 : 4?', ['8', '9', '7', '6'], '9'),
      fehler(3, 'Welches Wort ist ein Nomen?', ['laufen', 'Haus', 'schnell', 'und'], 'Haus', 'german'),
    ],
    daily_challenges: [],
    rpc: { tinte_stand: 84 },
    parent_child_relationships: [{ id: '33333333-3333-4333-8333-333333333333', parent_id: ELTERN, child_id: KIND, created_at: '2026-09-02T10:00:00Z' }],
    child_settings: [{
      id: '44444444-4444-4444-8444-444444444444', child_id: KIND, parent_id: ELTERN,
      math_seconds_per_task: 30, german_seconds_per_task: 30, english_seconds_per_task: 30, science_seconds_per_task: 30,
      geography_seconds_per_task: 30, history_seconds_per_task: 30, physics_seconds_per_task: 30, biology_seconds_per_task: 30,
      chemistry_seconds_per_task: 30, latin_seconds_per_task: 30,
      weekday_max_minutes: 30, weekend_max_minutes: 60, screen_time_base_minutes: 0, screen_time_managed: false,
      screen_time_auto_release: false, screen_time_unlock_mode: 'manual', created_at: '2026-09-02T10:00:00Z', updated_at: '2026-09-02T10:00:00Z',
    }],
    game_sessions: [
      runde('g1', 'math', '13:05', 0, 140), runde('g2', 'german', '13:20', 0, 160), runde('g3', 'english', '13:40', 0, 120),
      ...fruehere,
    ],
    learning_sessions: [],
    // Hefte und Sticker (App-Redesign): Mia hat ihr Mathe-Heft lila gemacht
    kind_hefte: [
      { child_id: KIND, fach: 'math', farbe: 'lila', sticker: ['einhorn', 'stern'], updated_at: '2026-10-03T15:00:00Z' },
      { child_id: KIND, fach: 'german', farbe: 'rot', sticker: ['eule'], updated_at: '2026-10-03T15:00:00Z' },
    ],
    kind_sticker: ['einhorn', 'stern', 'eule', 'delfin', 'rakete'].map((sticker, i) => ({
      id: `st${i}`, child_id: KIND, sticker, quelle: 'alles_richtig', sitzung_id: null, created_at: `2026-09-2${i}T15:00:00Z`,
    })),
    screen_time_requests: [],
    user_achievements: [],
    subscriptions: [{
      id: 's1', user_id: ELTERN, plan: 'premium', status: 'active', trial_end: null, created_at: '2026-09-01T10:00:00Z',
      updated_at: '2026-09-01T10:00:00Z', current_period_end: null, current_period_start: null, cancel_at: null, quelle: null,
      store: null, store_produkt: null, stripe_customer_id: null, stripe_subscription_id: null, bezahlt_seit: null,
    }],
  };
}

/** Offene Anfrage von Mia an Anna, gestellt vor 3 Minuten. */
export const offeneAnfrage = (minuten = 8, nachricht = null) => ({
  id: '55555555-5555-4555-8555-555555555555', child_id: KIND, parent_id: ELTERN, requested_minutes: minuten,
  earned_minutes: minuten, status: 'pending', request_message: nachricht, parent_response: null, responded_at: null,
  created_at: vorMinuten(3), expires_at: new Date(Date.now() + 864e5).toISOString(),
});

function passt(zeile, schluessel, ausdruck) {
  if (['select', 'order', 'limit', 'offset', 'columns', 'on_conflict', 'or', 'and'].includes(schluessel)) return true;
  const m = ausdruck.match(/^(not\.)?(eq|neq|gt|gte|lt|lte|in|is)\.(.*)$/s);
  if (!m) return true;
  const [, nicht, op, roh] = m;
  const v = zeile[schluessel];
  const s = v == null ? null : String(v);
  let ok;
  switch (op) {
    case 'eq': ok = s === roh; break;
    case 'neq': ok = s !== roh; break;
    case 'gt': ok = s != null && s > roh; break;
    case 'gte': ok = s != null && s >= roh; break;
    case 'lt': ok = s != null && s < roh; break;
    case 'lte': ok = s != null && s <= roh; break;
    case 'in': ok = roh.replace(/^\(|\)$/g, '').split(',').map((x) => x.replace(/^"|"$/g, '')).includes(s); break;
    case 'is': ok = roh === 'null' ? v == null : s === roh; break;
    default: ok = true;
  }
  return nicht ? !ok : ok;
}

/**
 * Beantwortet einen abgefangenen Supabase-Aufruf aus `d`. `d.ich` ist die
 * angemeldete Nutzer-ID. Gibt das Promise von route.fulfill zurueck.
 */
export function beantworte(route, d) {
  const q = route.request();
  const u = new URL(q.url());
  const accept = q.headers()['accept'] || '';
  const prefer = q.headers()['prefer'] || '';
  const cors = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range' };
  const json = (body, status = 200, kopf = {}) =>
    route.fulfill({ status, contentType: 'application/json', headers: { ...cors, ...kopf }, body: JSON.stringify(body) });

  if (u.pathname === '/auth/v1/user') return json(d.nutzer);
  if (u.pathname.startsWith('/auth/')) return json({});

  if (u.pathname.startsWith('/functions/v1/')) {
    const fn = u.pathname.split('/').pop();
    let k = {}; try { k = JSON.parse(q.postData() || '{}'); } catch { /* leer */ }
    if (fn === 'check-subscription') return json({ subscribed: true, plan: 'premium', status: 'active', subscription_end: new Date(Date.now() + 300 * 864e5).toISOString() });
    if (fn === 'screen-time-request') {
      if (k.action === 'get_requests') return json({ requests: d.screen_time_requests });
      if (k.action === 'create_request') {
        const neu = { ...offeneAnfrage(k.requestedMinutes, k.message ?? null), id: '66666666-6666-4666-8666-666666666666', parent_id: k.parentId, earned_minutes: k.earnedMinutes, created_at: new Date().toISOString() };
        d.screen_time_requests = [neu, ...d.screen_time_requests];
        return json({ success: true, request: neu });
      }
      if (k.action === 'respond_to_request') {
        d.screen_time_requests = d.screen_time_requests.map((r) => (r.id === k.requestId ? { ...r, status: k.status, responded_at: new Date().toISOString() } : r));
        return json({ success: true });
      }
    }
    return json({});
  }

  if (u.pathname.startsWith('/rest/v1/rpc/')) return json(d.rpc?.[u.pathname.split('/').pop()] ?? null);

  const tabelle = u.pathname.replace('/rest/v1/', '');
  if (['POST', 'PATCH', 'DELETE'].includes(q.method())) {
    let koerper = null; try { koerper = JSON.parse(q.postData() || 'null'); } catch { /* leer */ }
    const eintrag = Array.isArray(koerper) ? koerper[0] : koerper;
    return accept.includes('vnd.pgrst.object') ? json(eintrag ?? {}, 201) : json(eintrag ? [eintrag] : [], 201);
  }

  let treffer = (d[tabelle] || []).filter((z) => [...u.searchParams.entries()].every(([k, w]) => passt(z, k, w)));
  const ordnung = u.searchParams.get('order');
  if (ordnung) {
    const [spalte, richtung] = ordnung.split(',')[0].split('.');
    treffer = [...treffer].sort((a, b) => (String(a[spalte]) < String(b[spalte]) ? -1 : 1) * (richtung === 'desc' ? -1 : 1));
  }
  const limit = Number(u.searchParams.get('limit') || 0);
  if (limit) treffer = treffer.slice(0, limit);
  const zaehlung = prefer.includes('count=') ? { 'content-range': `0-${Math.max(0, treffer.length - 1)}/${treffer.length}` } : {};
  if (q.method() === 'HEAD') return route.fulfill({ status: 200, headers: { ...cors, ...zaehlung }, body: '' });
  if (accept.includes('vnd.pgrst.object')) {
    if (treffer.length === 1) return json(treffer[0], 200, zaehlung);
    return json({ code: 'PGRST116', details: `The result contains ${treffer.length} rows`, hint: null, message: 'JSON object requested, multiple (or no) rows returned' }, 406);
  }
  return json(treffer, 200, zaehlung);
}
