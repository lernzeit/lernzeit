import { Info } from 'lucide-react';

const points = [
  'Die verdiente Zeit gibst du heute noch selbst in Family Link beziehungsweise Bildschirmzeit frei. Die automatische Übergabe ist für beide Plattformen in Arbeit.',
  'Die Aufgaben erzeugt eine KI passend zu Fach und Klassenstufe. In der Anfangsphase kann eine Frage danebenliegen – dafür gibt es die Feedback-Funktion in der App.',
  'Auf dem iPhone läuft LernZeit derzeit im Browser. Die native App ist bei Apple in Prüfung.',
];

const HonestyBlock = () => (
  <section className="py-20 px-4">
    <div className="max-w-3xl mx-auto bg-muted/40 border rounded-3xl p-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-background border rounded-xl flex items-center justify-center">
          <Info className="w-5 h-5 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Was heute noch nicht geht</h2>
      </div>
      <ul className="space-y-4">
        {points.map((point) => (
          <li key={point} className="flex gap-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export default HonestyBlock;
