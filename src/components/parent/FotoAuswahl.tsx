import { useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';

/**
 * Fotos von Heft, Buch oder Arbeitsblatt fuer den KI-Lernplan (04.10.2026).
 *
 * Die Bilder werden schon auf dem Geraet verkleinert (lange Seite hoechstens
 * 1600 px, JPEG). Beim Neuzeichnen fallen alle Bildangaben weg, auch der
 * Aufnahmeort. Hochgeladen wird erst beim Erstellen des Plans; gespeichert
 * wird nur der Text, den die KI daraus liest.
 */
export const FOTOS_HOECHSTENS = 10;
const LANGE_SEITE = 1600;

export async function fotoVerkleinern(datei: File): Promise<string> {
  const bild = await createImageBitmap(datei);
  const faktor = Math.min(1, LANGE_SEITE / Math.max(bild.width, bild.height));
  const breite = Math.round(bild.width * faktor);
  const hoehe = Math.round(bild.height * faktor);
  const leinwand = document.createElement('canvas');
  leinwand.width = breite;
  leinwand.height = hoehe;
  const ctx = leinwand.getContext('2d');
  if (!ctx) throw new Error('Bild konnte nicht verarbeitet werden.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, breite, hoehe);
  ctx.drawImage(bild, 0, 0, breite, hoehe);
  bild.close?.();
  return leinwand.toDataURL('image/jpeg', 0.82);
}

export function FotoAuswahl({
  fotos,
  onChange,
  disabled,
}: {
  fotos: string[];
  onChange: (fotos: string[]) => void;
  disabled?: boolean;
}) {
  const eingabe = useRef<HTMLInputElement>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const hinzufuegen = async (dateien: FileList | null) => {
    if (!dateien?.length) return;
    setFehler(null);
    setLaedt(true);
    try {
      const frei = FOTOS_HOECHSTENS - fotos.length;
      const auswahl = Array.from(dateien).filter((d) => d.type.startsWith('image/')).slice(0, frei);
      const neu: string[] = [];
      for (const d of auswahl) {
        try {
          neu.push(await fotoVerkleinern(d));
        } catch {
          setFehler('Ein Bild konnte nicht gelesen werden. Bitte als JPEG oder PNG versuchen.');
        }
      }
      if (dateien.length > frei) setFehler(`Höchstens ${FOTOS_HOECHSTENS} Fotos pro Lernplan.`);
      onChange([...fotos, ...neu]);
    } finally {
      setLaedt(false);
      if (eingabe.current) eingabe.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {fotos.map((f, i) => (
          <div key={i} className="relative h-20 w-16 overflow-hidden rounded-lg ring-1 ring-inset ring-karo">
            <img src={f} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(fotos.filter((_, j) => j !== i))}
              disabled={disabled}
              aria-label={`Foto ${i + 1} entfernen`}
              className="absolute right-0.5 top-0.5 grid h-6 w-6 place-items-center rounded-full bg-tinte/80 text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {fotos.length < FOTOS_HOECHSTENS && (
          <button
            type="button"
            onClick={() => eingabe.current?.click()}
            disabled={disabled || laedt}
            className="grid h-20 w-16 place-items-center rounded-lg border-[1.5px] border-dashed border-karo bg-card text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
            aria-label="Fotos hinzufügen"
          >
            {laedt ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
          </button>
        )}
      </div>
      <input
        ref={eingabe}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-label="Fotos auswählen"
        onChange={(e) => void hinzufuegen(e.target.files)}
      />
      {fehler && <p className="text-xs text-destructive">{fehler}</p>}
      <p className="text-xs text-muted-foreground">
        Heftseiten, Buchseiten oder Arbeitsblätter, gerade und gut beleuchtet. Die KI liest daraus den Stoff; die Fotos
        speichern wir nicht. Bitte keine Seiten mit Namen, Noten oder Bemerkungen der Lehrkraft, wenn es sich vermeiden
        lässt.
      </p>
    </div>
  );
}
