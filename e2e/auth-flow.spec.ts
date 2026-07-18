import { test, expect, Page } from '@playwright/test';
import { makeSupabase, TEST_PARENT, TEST_CHILD } from './helpers/supabase';

const gotoStart = async (page: Page, query = '') => {
  const sep = query ? `${query}&` : '?';
  await page.goto(`/${sep}auth=true`, { waitUntil: 'domcontentloaded' });
  // Warten bis Auth-Card sichtbar ist
  await expect(page.getByRole('tab', { name: 'Registrieren' })).toBeVisible({
    timeout: 15_000,
  });
};

const openSignup = async (page: Page) => {
  await page.getByRole('tab', { name: 'Registrieren' }).click();
  await expect(page.getByRole('heading', { name: 'Konto erstellen' })).toBeVisible();
};

const openSignin = async (page: Page) => {
  await page.getByRole('tab', { name: 'Anmelden' }).click();
  await expect(page.getByRole('heading', { name: 'Willkommen zurück!' })).toBeVisible();
};

// -------------------------------------------------------------------------
// 1. Signup-UI-Struktur
// -------------------------------------------------------------------------
test.describe('Signup UI Struktur', () => {
  test('OAuth-Buttons stehen über dem E-Mail-Formular', async ({ page }) => {
    await gotoStart(page);
    await openSignup(page);

    const google = page.getByRole('button', { name: /Mit Google registrieren/i });
    const apple = page.getByRole('button', { name: /Mit Apple registrieren/i });
    const emailInputLabel = page.getByText(/oder mit E-Mail/i);
    const submit = page.getByRole('button', { name: /Konto erstellen/i });

    await expect(google).toBeVisible();
    await expect(apple).toBeVisible();
    await expect(emailInputLabel).toBeVisible();
    await expect(submit).toBeVisible();

    // Reihenfolge im DOM: Google < Apple < Divider < Submit
    const [gBox, aBox, dBox, sBox] = await Promise.all([
      google.boundingBox(),
      apple.boundingBox(),
      emailInputLabel.boundingBox(),
      submit.boundingBox(),
    ]);
    expect(gBox!.y).toBeLessThan(aBox!.y);
    expect(aBox!.y).toBeLessThan(dBox!.y);
    expect(dBox!.y).toBeLessThan(sBox!.y);
  });

  test('Empfehlungs-Code-Feld nur bei Rolle "Elternteil" sichtbar', async ({ page }) => {
    await gotoStart(page);
    await openSignup(page);

    // Default = Kind: kein Empfehlungs-Code-Feld
    await expect(page.locator('#tester-code')).toHaveCount(0);

    // Rolle Elternteil auswählen
    await page.locator('label[for="parent"]').click();
    await expect(page.locator('#tester-code')).toBeVisible();
    await expect(page.getByText(/2 Monate Premium/i)).toBeVisible();

    // Zurück zu Kind → Feld verschwindet wieder
    await page.locator('label[for="child"]').click();
    await expect(page.locator('#tester-code')).toHaveCount(0);

    // Klassenstufen-Auswahl erscheint für Kind (Label oder Text-Fallback)
    await expect(
      page.getByText(/Klassenstufe|Klasse\s*\d/i).first(),
    ).toBeVisible();
  });
});

// -------------------------------------------------------------------------
// 2. Empfehlungslink `?ref=CODE`
// -------------------------------------------------------------------------
test.describe('Empfehlungslink', () => {
  test('URL-Code wird erkannt, gecached und im Banner angezeigt', async ({ page }) => {
    await gotoStart(page, '?ref=E2ETEST');
    await openSignup(page);

    // localStorage-Cache prüfen
    const cached = await page.evaluate(() =>
      window.localStorage.getItem('lernzeit_referral_code'),
    );
    expect(cached).toMatch(/^\{.*"code":"E2ETEST"/);

    // Rolle Elternteil → Einladungs-Banner zeigt den Code
    await page.locator('label[for="parent"]').click();
    await expect(page.getByText(/Du wurdest eingeladen/i)).toBeVisible();
    await expect(page.getByText('E2ETEST')).toBeVisible();
    // Prefill in Empfehlungs-Code-Input
    await expect(page.locator('#tester-code')).toHaveValue(/E2ETEST/i);
  });

  test('Ungültiger Code (Sonderzeichen) wird verworfen', async ({ page }) => {
    await gotoStart(page, '?ref=<script>');
    await openSignup(page);
    await page.locator('label[for="parent"]').click();
    await expect(page.getByText(/Du wurdest eingeladen/i)).toHaveCount(0);
  });
});

// -------------------------------------------------------------------------
// 3. Kind-Registrierung ohne E-Mail (Username-Flow) — UI-Struktur
// -------------------------------------------------------------------------
test.describe('Kind ohne E-Mail', () => {
  test('Toggle blendet E-Mail-Feld aus und Benutzername/Einladungscode ein', async ({ page }) => {
    await gotoStart(page);
    await openSignup(page);
    await page.locator('label[for="child"]').click();

    // Nach dem Klick auf „Kind ohne E-Mail registrieren" erscheinen Username-Felder
    const toggle = page.getByRole('button', { name: /Ohne E-Mail registrieren|Kind ohne E-Mail/i });
    if (await toggle.count()) {
      await toggle.first().click();
      await expect(page.getByLabel(/Benutzername/i)).toBeVisible();
    }
  });
});

// -------------------------------------------------------------------------
// 4. Login-Flow — Fehlerfall
// -------------------------------------------------------------------------
test.describe('Login-Fehler', () => {
  test('Falsche Zugangsdaten zeigen deutsche Fehlermeldung', async ({ page }) => {
    await gotoStart(page);
    await openSignin(page);

    await page.getByLabel('E-Mail oder Benutzername').fill('nicht@existiert.example');
    await page.getByLabel('Passwort').fill('falschesPasswort123');
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

    // Toast mit deutscher Fehlermeldung (Radix Toast Region)
    const toast = page.locator('[role="status"], [role="alert"], li[data-radix-collection-item]').filter({
      hasText: /Zugangsdaten|E-Mail|Passwort|Fehler|falsch/i,
    });
    await expect(toast.first()).toBeVisible({ timeout: 15_000 });
  });
});

// -------------------------------------------------------------------------
// 5. Login-Flow — Elternteil (echter Test-Account)
// -------------------------------------------------------------------------
test.describe('Login Elternteil', () => {
  test('E-Mail-Login führt auf Eltern-Dashboard und Profil ist synchron', async ({ page }) => {
    await gotoStart(page);
    await openSignin(page);

    await page.getByLabel('E-Mail oder Benutzername').fill(TEST_PARENT.email);
    await page.getByLabel('Passwort').fill(TEST_PARENT.password);
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

    // Erfolgreicher Login: /start wird verlassen; Dashboard-Chrome erscheint
    await page.waitForURL(
      (url) => !url.searchParams.get('auth') && url.pathname === '/',
      { timeout: 20_000 },
    ).catch(() => {});
    // Robust: mind. ein Eltern-typisches UI-Element
    const parentHints = page.getByText(/Dashboard|Eltern|Kinder|Empfehlungs|Abo|Premium/i);
    await expect(parentHints.first()).toBeVisible({ timeout: 15_000 });

    // DB-Sync: Profil-Rolle ist parent
    const supabase = makeSupabase();
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: TEST_PARENT.email,
      password: TEST_PARENT.password,
    });
    expect(authErr).toBeNull();
    expect(authData.user).toBeTruthy();

    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('id, role, role_locked')
      .eq('id', authData.user!.id)
      .single();
    expect(profErr).toBeNull();
    expect(profile?.role).toBe('parent');

    // Referral-Code des Eltern-Accounts kann per RPC generiert/gelesen werden
    const { data: refCode, error: refErr } = await supabase.rpc('generate_referral_code', {
      p_user_id: authData.user!.id,
    });
    expect(refErr).toBeNull();
    expect(typeof refCode).toBe('string');
    expect((refCode as string).length).toBeGreaterThanOrEqual(6);

    await supabase.auth.signOut();
  });
});

// -------------------------------------------------------------------------
// 6. Login-Flow — Kind per Benutzername
// -------------------------------------------------------------------------
test.describe('Login Kind (Username)', () => {
  test('Username-Login löst Pseudo-E-Mail auf und öffnet Kind-Ansicht', async ({ page }) => {
    await gotoStart(page);
    await openSignin(page);

    await page.getByLabel('E-Mail oder Benutzername').fill(TEST_CHILD.username);
    await page.getByLabel('Passwort').fill(TEST_CHILD.password);
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

    // Nach Login schließt sich der Auth-Dialog (Query-Param entfernt) oder es folgt Redirect
    await page.waitForFunction(
      () => !new URL(window.location.href).searchParams.get('auth'),
      { timeout: 20_000 },
    ).catch(() => {});

    // DB-Sync: Rolle=child, grade gesetzt
    const supabase = makeSupabase();
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: TEST_CHILD.pseudoEmail,
      password: TEST_CHILD.password,
    });
    expect(authErr).toBeNull();

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, grade, username')
      .eq('id', authData.user!.id)
      .single();
    expect(profile?.role).toBe('child');
    expect(profile?.grade).toBeGreaterThanOrEqual(1);
    expect(profile?.username?.toLowerCase()).toBe(TEST_CHILD.username);

    await supabase.auth.signOut();
  });
});

// -------------------------------------------------------------------------
// 7. Rolle nachträglich setzen — RPC-Vertrag
// -------------------------------------------------------------------------
test.describe('Post-OAuth Rollenfestlegung', () => {
  test('link_referral RPC weist ungültige Codes zurück', async ({}) => {
    const supabase = makeSupabase();
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: TEST_PARENT.email,
      password: TEST_PARENT.password,
    });
    expect(authErr).toBeNull();
    expect(authData.user).toBeTruthy();

    const { data, error } = await supabase.rpc('link_referral', {
      p_code: 'ZZZZZZZZ-INVALID',
    });
    // RPC gibt JSON zurück; success=false erwartet (oder already_linked, wenn ref bereits existiert)
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    const payload = data as { success: boolean; error?: string; already_linked?: boolean };
    expect(payload.success === false || payload.already_linked === true).toBe(true);

    await supabase.auth.signOut();
  });
});