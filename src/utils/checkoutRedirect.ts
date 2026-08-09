import { Capacitor } from '@capacitor/core';

/**
 * Öffnet eine von Stripe erzeugte URL (Checkout oder Kundenportal).
 *
 * Warum nicht einfach window.open: Safari blockiert einen neuen Tab, sobald der
 * Aufruf nicht mehr im selben Verarbeitungsschritt liegt wie der auslösende
 * Klick. Genau das ist hier immer der Fall — die URL entsteht erst nach einem
 * `await` auf die Edge Function. Der Nutzer klickt auf „Jetzt Abo abschließen",
 * sieht bestenfalls einen Hinweis „Pop-ups blockiert", und der Kauf endet,
 * bevor er begonnen hat. Das trifft ausgerechnet den einen Klick, mit dem Geld
 * verdient wird.
 *
 * Im Web daher Weiterleitung im selben Tab; das ist auch Stripes eigene
 * Empfehlung und kann nicht blockiert werden. Nach Abschluss schickt Stripe
 * über success_url zurück in die App.
 *
 * Im nativen WebView bleibt window.open richtig: Der Checkout gehört dort in
 * den Systembrowser, nicht in die App-Ansicht. Aktuell erreicht kein nativer
 * Pfad diese Funktion (Apple und Google verlangen In-App-Käufe), die
 * Unterscheidung hält den Fall aber offen statt still falsch zu werden.
 */
export function openStripeUrl(url: string): void {
  if (Capacitor.isNativePlatform()) {
    window.open(url, '_blank');
    return;
  }
  window.location.href = url;
}

/** true, wenn openStripeUrl den aktuellen Tab verlässt (kein Toast sinnvoll). */
export function stripeUrlLeavesPage(): boolean {
  return !Capacitor.isNativePlatform();
}
