/**
 * Maps known English Supabase error messages to user-friendly German translations.
 */
const errorMap: Record<string, string> = {
  'invalid login credentials': 'E-Mail oder Passwort ist falsch.',
  'user already registered': 'Diese E-Mail ist bereits registriert.',
  'email not confirmed': 'Bitte bestätige zuerst deine E-Mail-Adresse.',
  'password should be at least 6 characters': 'Das Passwort muss mindestens 6 Zeichen lang sein.',
  'signup requires a valid password': 'Bitte gib ein gültiges Passwort ein (mind. 6 Zeichen).',
  'user not found': 'Kein Konto mit dieser E-Mail gefunden.',
  'email rate limit exceeded': 'Zu viele Versuche. Bitte warte einen Moment.',
  'for security purposes, you can only request this after': 'Aus Sicherheitsgründen kannst du dies erst in einigen Sekunden erneut anfordern.',
  'new password should be different from the old password': 'Das neue Passwort muss sich vom alten unterscheiden.',
  'auth session missing': 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.',
  'invalid claim: missing sub claim': 'Sitzung ungültig. Bitte melde dich erneut an.',
  'token has expired or is invalid': 'Der Link ist abgelaufen oder ungültig. Bitte fordere einen neuen an.',
  'unable to validate email address: invalid format': 'Bitte gib eine gültige E-Mail-Adresse ein.',
  'rate limit exceeded': 'Zu viele Anfragen. Bitte versuche es später erneut.',
};

export function translateError(message: string): string {
  if (!message) return 'Ein unbekannter Fehler ist aufgetreten.';
  
  const lower = message.toLowerCase().trim();
  
  // Direct match
  if (errorMap[lower]) return errorMap[lower];
  
  // Partial match
  for (const [key, value] of Object.entries(errorMap)) {
    if (lower.includes(key)) return value;
  }
  
  // Fallback
  return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
}
