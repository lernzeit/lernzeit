import { useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

/**
 * Erklaerung zum Aufklappen (14.10.2026): Wer weiss, wie Bildschirmzeit
 * eingestellt oder freigegeben wird, sieht nur die Knoepfe. Die Schritte
 * stehen hinter „So geht's“ und sind zu, bis man sie braucht.
 */
export function SoGehtEs({ titel = 'So geht’s', schritte, links = [], className }: {
  titel?: string;
  schritte: string[];
  links?: { text: string; url: string }[];
  className?: string;
}) {
  const [offen, setOffen] = useState(false);
  if (schritte.length === 0 && links.length === 0) return null;
  return (
    <Collapsible open={offen} onOpenChange={setOffen} className={className}>
      <CollapsibleTrigger className="inline-flex items-center gap-1 rounded-md text-sm font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        {titel}
        <ChevronDown className={cn('h-4 w-4 transition-transform motion-reduce:transition-none', offen && 'rotate-180')} aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {schritte.length > 0 && (
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            {schritte.map((schritt) => <li key={schritt}>{schritt}</li>)}
          </ol>
        )}
        {links.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  {link.text}
                </a>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
