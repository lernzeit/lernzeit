import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface GradeSelectorProps {
  onSelectGrade: (grade: number) => void;
}

const grades = [
  { grade: 1, description: 'Zahlen bis 10, Plus und Minus' },
  { grade: 2, description: 'Zahlen bis 100, Einmaleins' },
  { grade: 3, description: 'Einmaleins, Teilen' },
  { grade: 4, description: 'Große Zahlen, Brüche' },
  { grade: 5, description: 'Dezimalzahlen, Prozente' },
  { grade: 6, description: 'Negative Zahlen, Algebra' },
  { grade: 7, description: 'Gleichungen, Winkel' },
  { grade: 8, description: 'Terme, Funktionen' },
  { grade: 9, description: 'Quadratische Funktionen' },
  { grade: 10, description: 'Trigonometrie, Exponential' },
];

const youngGrades = grades.filter((g) => g.grade <= 4);
const teenGrades = grades.filter((g) => g.grade >= 5);

/**
 * Klassenwahl der Demo (App-Redesign): grosse Kaestchen mit der Klassenzahl,
 * ein Weg zurueck zur Startseite. Bis 04.10.2026 Emoji-Kacheln mit viermal
 * "Los geht's!".
 */
export function GradeSelector({ onSelectGrade }: GradeSelectorProps) {
  return (
    <div className="min-h-[100dvh] bg-background pt-safe-top pb-safe-bottom">
      <div className="mx-auto w-full max-w-2xl px-4 pb-12 pt-3">
        <Link
          to="/start"
          className="-ml-2 inline-flex h-11 items-center gap-1 rounded-full pl-1 pr-4 text-[0.9375rem] font-bold text-tinte transition-colors hover:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
          Zur Startseite
        </Link>

        <h1 className="mt-4 text-[2rem] font-extrabold leading-tight sm:text-[2.5rem]">In welche Klasse gehst du?</h1>
        <p className="mt-2 max-w-md text-muted-foreground">Probier fünf echte Aufgaben aus, ganz ohne Anmeldung.</p>

        <section aria-labelledby="grundschule" className="mt-8">
          <h2 id="grundschule" className="mb-3 text-base font-extrabold">Grundschule, Klasse 1 – 4</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {youngGrades.map((g) => (
              <li key={g.grade}>
                <button
                  type="button"
                  onClick={() => onSelectGrade(g.grade)}
                  aria-label={`Klasse ${g.grade}`}
                  className="heft-karo flex aspect-square w-full flex-col items-center justify-center rounded-[24px] bg-card ring-1 ring-inset ring-karo transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="text-sm font-bold text-muted-foreground">Klasse</span>
                  <span className="tabular text-[3.5rem] font-extrabold leading-none text-tinte">{g.grade}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="weiterfuehrend" className="mt-8">
          <h2 id="weiterfuehrend" className="mb-3 text-base font-extrabold">Weiterführende Schule, Klasse 5 – 10</h2>
          <ul className="divide-y divide-karo rounded-[20px] bg-card ring-1 ring-inset ring-karo">
            {teenGrades.map((g) => (
              <li key={g.grade}>
                <button
                  type="button"
                  onClick={() => onSelectGrade(g.grade)}
                  aria-label={`Klasse ${g.grade}`}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left"
                >
                  <span className="tabular grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted text-xl font-extrabold text-tinte">{g.grade}</span>
                  <span className="min-w-0">
                    <span className="block font-bold text-tinte">Klasse {g.grade}</span>
                    <span className="block truncate text-sm text-muted-foreground">{g.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
