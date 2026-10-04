import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Seo from '@/components/Seo';
import { RechtsKasten, RechtsSeite } from '@/components/landing/RechtsSeite';
import { VertragsErklaerung } from '@/components/recht/VertragsErklaerung';

/**
 * Widerrufsbelehrung nach dem Muster der Anlage 1 zu Art. 246a § 1 Abs. 2
 * Satz 2 EGBGB in der Fassung ab 19.06.2026 (Gestaltungshinweise [1] a, [2],
 * [3] Widerrufsfunktion, [6] Dienstleistung), Muster-Widerrufsformular nach
 * Anlage 2 und die elektronische Widerrufsfunktion nach § 356a BGB:
 * "Vertrag widerrufen" oeffnet das Formular, "Widerruf bestätigen" sendet.
 * Wortlaut am 04.10.2026 von buzer.de/gesetze-im-internet.de uebernommen.
 */
const Widerruf = () => {
  const { hash } = useLocation();
  const [offen, setOffen] = useState(false);
  const formular = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hash === '#widerrufen') setOffen(true);
  }, [hash]);

  useEffect(() => {
    if (offen) setTimeout(() => formular.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [offen]);

  return (
    <RechtsSeite titel="Widerrufsbelehrung" stand="4. Oktober 2026">
      <Seo
        title="Widerrufsbelehrung – LernZeit"
        description="Widerrufsbelehrung und Muster-Widerrufsformular für LernZeit Premium. Vertrag direkt online widerrufen."
        path="/widerruf"
      />

      <div className="max-w-[44rem]">
        <p>
          Du hast LernZeit Premium auf unserer Website abgeschlossen und möchtest den Vertrag innerhalb von 14 Tagen
          widerrufen? Das geht direkt hier, auch ohne Anmeldung:
        </p>
        <button
          type="button"
          onClick={() => setOffen(true)}
          aria-expanded={offen}
          aria-controls="widerrufen"
          className="mt-5 inline-flex h-14 items-center justify-center rounded-full bg-[var(--lp-blau)] px-8 text-[1.0625rem] font-bold text-white transition-colors hover:bg-[var(--lp-tinte)]"
        >
          Vertrag widerrufen
        </button>
        <div id="widerrufen" ref={formular} className="scroll-mt-24">
          {offen && (
            <div className="mt-8 rounded-3xl bg-[var(--lp-heft)] p-5 sm:p-8">
              <VertragsErklaerung art="widerruf" />
            </div>
          )}
        </div>
        <p className="mt-6 text-[var(--lp-leise)]">
          Premium über den Apple App Store oder Google Play gekauft? Dann gelten die Widerrufs- und Erstattungsregeln
          des jeweiligen Stores. Kündigen statt widerrufen: <Link to="/kuendigen">Verträge hier kündigen</Link>.
        </p>
      </div>

      <section className="mt-10">
        <h2>Widerrufsbelehrung</h2>
        <h3>Widerrufsrecht</h3>
        <p>Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.</p>
        <p>Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.</p>
        <p>
          Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (LernZeit UG (haftungsbeschränkt), Drachengasse 10, 99084
          Erfurt, E-Mail: <a href="mailto:info@lernzeit.app">info@lernzeit.app</a>) mittels einer eindeutigen Erklärung
          (z.B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu
          widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht
          vorgeschrieben ist. Sie können Ihr Widerrufsrecht auch online unter{' '}
          <a href="https://lernzeit.app/widerruf#widerrufen">lernzeit.app/widerruf</a> (Schaltfläche „Vertrag
          widerrufen“) ausüben. Wenn Sie diese Online-Funktion nutzen, übermitteln wir Ihnen auf einem dauerhaften
          Datenträger (z. B. durch eine E-Mail) unverzüglich eine Eingangsbestätigung mit Informationen zum Inhalt der
          Widerrufserklärung sowie dem Datum und der Uhrzeit ihres Eingangs.
        </p>
        <p>
          Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts
          vor Ablauf der Widerrufsfrist absenden.
        </p>
        <h3>Folgen des Widerrufs</h3>
        <p>
          Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben,
          einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine
          andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich
          und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf
          dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie
          bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes
          vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.
        </p>
        <p>
          Haben Sie verlangt, dass die Dienstleistungen während der Widerrufsfrist beginnen soll, so haben Sie uns einen
          angemessenen Betrag zu zahlen, der dem Anteil der bis zu dem Zeitpunkt, zu dem Sie uns von der Ausübung des
          Widerrufsrechts hinsichtlich dieses Vertrags unterrichten, bereits erbrachten Dienstleistungen im Vergleich
          zum Gesamtumfang der im Vertrag vorgesehenen Dienstleistungen entspricht.
        </p>
      </section>

      <section>
        <h2>Muster-Widerrufsformular</h2>
        <RechtsKasten>
          <p>(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)</p>
          <p>
            – An LernZeit UG (haftungsbeschränkt), Drachengasse 10, 99084 Erfurt, E-Mail: info@lernzeit.app:
          </p>
          <p>
            – Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden
            Waren (*)/die Erbringung der folgenden Dienstleistung (*)
          </p>
          <p>– Bestellt am (*)/erhalten am (*)</p>
          <p>– Name des/der Verbraucher(s)</p>
          <p>– Anschrift des/der Verbraucher(s)</p>
          <p>– Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)</p>
          <p>– Datum</p>
          <p className="text-[var(--lp-leise)]">(*) Unzutreffendes streichen.</p>
        </RechtsKasten>
      </section>
    </RechtsSeite>
  );
};

export default Widerruf;
