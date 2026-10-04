/**
 * Zeit-Uhr auf dem Kind-Start (App-Redesign): Ein Strich je Minute bis zum
 * Tageslimit, verdiente Minuten gruen. Ueber 60 Minuten steht ein Strich fuer
 * mehrere Minuten, damit die Uhr lesbar bleibt.
 */
export function ZeitUhr({ verdient, limit }: { verdient: number; limit: number }) {
  const grenze = Math.max(1, limit);
  const striche = Math.min(grenze, 60);
  const proStrich = grenze / striche;
  const gefuellt = Math.min(striche, Math.floor(verdient / proStrich + 1e-9));
  const r1 = 74;
  const r2 = 90;
  return (
    <div className="relative mx-auto h-[200px] w-[200px]">
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        {Array.from({ length: striche }, (_, i) => {
          const w = ((i + 0.5) / striche) * 2 * Math.PI - Math.PI / 2;
          const an = i < gefuellt;
          return (
            <line
              key={i}
              x1={100 + r1 * Math.cos(w)}
              y1={100 + r1 * Math.sin(w)}
              x2={100 + r2 * Math.cos(w)}
              y2={100 + r2 * Math.sin(w)}
              stroke={an ? 'hsl(var(--gruen-hell))' : 'hsl(var(--karo))'}
              strokeWidth={striche > 40 ? 4 : 6.5}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center" role="img" aria-label={`Heute ${verdient} von ${grenze} Minuten verdient`}>
        <span className="tabular text-[3.25rem] font-extrabold leading-none tracking-tight text-tinte">{verdient}</span>
        <span className="mt-1 text-xs font-bold text-muted-foreground">von {grenze} Min. heute</span>
      </div>
    </div>
  );
}
