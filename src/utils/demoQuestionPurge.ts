import { getAllDemoQuestionTexts } from '@/data/demoQuestions';

/**
 * Entfernt beim Auth-Wechsel (anonym → eingeloggt) konsequent jedes persistierte
 * Demo-Material, damit statische Demo-Fragen nicht über localStorage, IndexedDB
 * oder den Service-Worker-Cache zurückkommen.
 */

const RECENT_KEY_PREFIX = 'recent_questions_';
const DEMO_KEY_PATTERN = /demo/i;

const purgeLocalStorage = (demoTexts: Set<string>) => {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      // 1. Explizite Demo-Keys komplett entfernen
      if (DEMO_KEY_PATTERN.test(key)) {
        localStorage.removeItem(key);
        continue;
      }

      // 2. Aus der Wiederholungs-Historie alle Demo-Texte herausfiltern,
      //    damit echte Fragen nicht fälschlich als "schon gestellt" gelten.
      if (!key.startsWith(RECENT_KEY_PREFIX)) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '[]');
        if (!Array.isArray(parsed)) {
          localStorage.removeItem(key);
          continue;
        }
        const cleaned = parsed.filter((t) => typeof t === 'string' && !demoTexts.has(t));
        if (cleaned.length === 0) {
          localStorage.removeItem(key);
        } else if (cleaned.length !== parsed.length) {
          localStorage.setItem(key, JSON.stringify(cleaned));
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Storage kann in privaten Modi blockiert sein – ignorieren.
  }

  try {
    const sessionKeys = Object.keys(sessionStorage);
    for (const key of sessionKeys) {
      if (DEMO_KEY_PATTERN.test(key)) sessionStorage.removeItem(key);
    }
  } catch {
    // ignorieren
  }
};

const purgeIndexedDb = async () => {
  try {
    if (typeof indexedDB === 'undefined') return;
    const listDatabases = (indexedDB as IDBFactory & {
      databases?: () => Promise<{ name?: string }[]>;
    }).databases;
    if (typeof listDatabases !== 'function') return;

    const dbs = await listDatabases.call(indexedDB);
    await Promise.all(
      dbs
        .map((db) => db.name)
        .filter((name): name is string => !!name && (DEMO_KEY_PATTERN.test(name) || /questions?/i.test(name)))
        .map(
          (name) =>
            new Promise<void>((resolve) => {
              const req = indexedDB.deleteDatabase(name);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
            })
        )
    );
  } catch {
    // ignorieren
  }
};

const purgeCaches = async () => {
  try {
    if (typeof caches === 'undefined') return;
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => DEMO_KEY_PATTERN.test(name) || /question|supabase/i.test(name))
        .map((name) => caches.delete(name))
    );
  } catch {
    // ignorieren
  }
};

export const purgeDemoQuestionStorage = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  const demoTexts = getAllDemoQuestionTexts();
  purgeLocalStorage(demoTexts);
  await Promise.all([purgeIndexedDb(), purgeCaches()]);
  console.warn('🧹 Demo-Fragen aus persistentem Speicher entfernt');
};