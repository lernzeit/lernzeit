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
 * screen-time-request).
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
  return {
    profiles: [profil(KIND, 'Mia', 'child', 3), profil(ELTERN, 'Anna', 'parent', null)],
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

  if (u.pathname.startsWith('/rest/v1/rpc/')) return json(null);

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
