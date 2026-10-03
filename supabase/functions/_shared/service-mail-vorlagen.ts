// Vorlagen der Service-Mails an Eltern (Funktion service-mails).
//
// Nur Service-Mails, keine Werbung und keine Feedback-Anfragen (BGH VI ZR 225/17):
// Hilfe beim Einrichten und Hinweis auf das Ende der Testphase. Jede Aussage
// muss durch docs/faktenpruefung.md gedeckt sein.
//
// Pflichtangaben der UG im Fuss (§ 35a GmbHG, § 37a HGB) — Stand Impressum.

export type Art = 'einrichtung' | 'testphase_endet';

export interface MailDaten {
  name: string | null;
  /** Nur bei testphase_endet. */
  testphaseEnde?: string | null;
}

export interface Mail {
  betreff: string;
  vorschau: string;
  html: string;
}

/**
 * Wer die UG vertritt, gehoert in jede geschaeftliche Mail. Solange hier
 * nichts steht, verweigert service-mails den echten Versand.
 */
export const GESCHAEFTSFUEHRUNG = '';

const APP_URL = 'https://lernzeit.app';
const FARBE = '#0e7490'; // dunkles Tuerkis: weisse Schrift darauf gut lesbar
const TEXT = '#1f2937';
const LEISE = '#6b7280';

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function anrede(name: string | null): string {
  const n = (name ?? '').trim();
  return n ? `Hallo ${esc(n)},` : 'Hallo,';
}

export function datumDeutsch(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin',
  }).format(new Date(iso));
}

const p = (html: string) =>
  `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${TEXT};">${html}</p>`;

const knopf = (text: string, href: string) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr><td style="border-radius:10px;background:${FARBE};">
    <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${text}</a>
  </td></tr>
</table>`;

const liste = (punkte: string[], nummeriert: boolean) => {
  const tag = nummeriert ? 'ol' : 'ul';
  return `<${tag} style="margin:0 0 16px;padding-left:22px;font-size:16px;line-height:1.6;color:${TEXT};">${
    punkte.map((x) => `<li style="margin:0 0 8px;">${x}</li>`).join('')
  }</${tag}>`;
};

const signatur = `
<p style="margin:24px 0 4px;font-size:16px;line-height:1.6;color:${TEXT};">Viele Grüße</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${TEXT};">Dein Kunden-Support von LernZeit</p>
<p style="margin:0;font-size:14px;line-height:1.6;color:${LEISE};">Fragen? Antworte einfach auf diese Mail oder schreib an <a href="mailto:info@lernzeit.app" style="color:${FARBE};">info@lernzeit.app</a>.</p>`;

function fuss(): string {
  const gf = GESCHAEFTSFUEHRUNG
    ? `Geschäftsführer: ${esc(GESCHAEFTSFUEHRUNG)}<br>`
    : '';
  return `
<tr><td style="padding:24px 28px 32px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.6;color:${LEISE};">
  <strong style="color:${TEXT};">LernZeit UG (haftungsbeschränkt)</strong><br>
  Drachengasse 10 · 99084 Erfurt · Deutschland<br>
  Sitz der Gesellschaft: Erfurt · Amtsgericht Jena, HRB 524759<br>
  ${gf}<a href="mailto:info@lernzeit.app" style="color:${LEISE};">info@lernzeit.app</a> · <a href="${APP_URL}" style="color:${LEISE};">lernzeit.app</a>
  <br><br>
  Du bekommst diese Nachricht, weil du ein Elternkonto bei LernZeit hast. Es sind Hinweise zu deinem Konto, keine Werbung.
  <a href="[unsubscribe_url]" style="color:${LEISE};">Diese Hinweise abbestellen</a> ·
  <a href="${APP_URL}/datenschutz" style="color:${LEISE};">Datenschutz</a> ·
  <a href="${APP_URL}/impressum" style="color:${LEISE};">Impressum</a>
</td></tr>`;
}

function rahmen(titel: string, vorschau: string, inhalt: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${esc(titel)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(vorschau)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
    <tr><td style="background:${FARBE};padding:20px 28px;">
      <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">LernZeit</span>
    </td></tr>
    <tr><td style="padding:28px 28px 8px;">
      <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:${TEXT};">${esc(titel)}</h1>
      ${inhalt}
    </td></tr>
    ${fuss()}
  </table>
</td></tr>
</table>
</body>
</html>`;
}

function einrichtung(d: MailDaten): Mail {
  const titel = 'So verbindest du LernZeit mit deinem Kind';
  const vorschau = 'Drei Schritte, dann kann dein Kind loslegen.';
  const inhalt = [
    p(anrede(d.name)),
    p('du hast dich bei LernZeit angemeldet – schön, dass du dabei bist. Mit deinem Konto ist noch kein Kind verbunden. So geht es:'),
    liste([
      'Öffne LernZeit und melde dich mit deinem Elternkonto an.',
      'Bei <strong>„Kind einladen“</strong> bestätigst du die Einwilligung und tippst auf <strong>„Code erstellen“</strong>.',
      'Tippe auf <strong>„Link teilen“</strong> und schick den Link an dein Kind. Es öffnet ihn auf seinem eigenen Handy. Alternativ gibt es den Code in der App ein.',
    ], true),
    p('Danach löst dein Kind Aufgaben und verdient damit Bildschirmzeit. Wenn es Zeit einlösen möchte, bekommst du eine Anfrage und entscheidest selbst.'),
    knopf('LernZeit öffnen', APP_URL),
    p('Der Einladungslink gilt 7 Tage. Ist er abgelaufen, erstellst du einfach einen neuen.'),
    signatur,
  ].join('\n');
  return { betreff: titel, vorschau, html: rahmen(titel, vorschau, inhalt) };
}

function testphaseEndet(d: MailDaten): Mail {
  const datum = d.testphaseEnde ? datumDeutsch(d.testphaseEnde) : 'in wenigen Tagen';
  const titel = `Deine Testphase endet am ${datum}`;
  const vorschau = 'Was danach kostenlos bleibt und was zu Premium gehört.';
  const inhalt = [
    p(anrede(d.name)),
    p(`deine kostenlose Testphase von LernZeit endet am <strong>${esc(datum)}</strong>. Damit dich nichts überrascht, hier kurz, was danach gilt.`),
    p('<strong>Kostenlos bleibt:</strong>'),
    liste([
      'Aufgaben lösen und damit Bildschirmzeit verdienen',
      'alle Fächer der Klassenstufe',
      'beliebig viele Kinderprofile',
    ], false),
    p('<strong>Zu Premium gehören:</strong>'),
    liste([
      'der KI-Lernplan für eine anstehende Klassenarbeit',
      'eine eigene Tagesobergrenze pro Kind',
      'die erweiterte Lernanalyse',
    ], false),
    p('Du hast für die Testphase keine Zahlungsdaten hinterlegt, deshalb wird nichts automatisch abgebucht. Wenn du Premium behalten möchtest, findest du es in der App unter <strong>„Abo“</strong>.'),
    knopf('LernZeit öffnen', APP_URL),
    signatur,
  ].join('\n');
  return { betreff: titel, vorschau, html: rahmen(titel, vorschau, inhalt) };
}

export function vorlage(art: Art, d: MailDaten): Mail {
  return art === 'einrichtung' ? einrichtung(d) : testphaseEndet(d);
}
