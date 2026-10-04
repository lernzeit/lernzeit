import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FAQ } from '@/content/faq';

// Liste der häufigen Fragen. Das JSON-LD (FAQPage) gibt nur die Seite /faq aus.
export const FaqListe = () => (
  <Accordion type="single" collapsible className="w-full">
    {FAQ.map(({ f, a }, i) => (
      <AccordionItem key={i} value={`faq-${i}`}>
        <AccordionTrigger className="text-left text-base sm:text-lg font-semibold">{f}</AccordionTrigger>
        <AccordionContent className="text-base text-muted-foreground leading-relaxed">{a}</AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

const FaqSection = () => (
  <section data-abschnitt="faq" id="faq" className="scroll-mt-20 py-24 lg:py-32">
    <div className="lp-container grid gap-12 lg:grid-cols-12 lg:gap-8">
      <div data-zeigen className="lg:col-span-4">
        <p className="lp-eyebrow">FAQ</p>
        <h2 className="mt-4 text-[2.125rem] font-extrabold leading-[1.08] sm:text-5xl">Häufige Fragen</h2>
        <Link
          to="/faq"
          className="mt-6 inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-[var(--lp-blue)] hover:underline"
        >
          Alle Fragen und Antworten
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div data-zeigen className="lg:col-span-8">
        <Accordion type="single" collapsible className="w-full border-t border-slate-200">
          {FAQ.map(({ f, a }, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-slate-200">
              <AccordionTrigger className="lp-display py-6 text-left text-[1.0625rem] font-semibold text-[var(--lp-ink)] hover:no-underline sm:text-lg">
                {f}
              </AccordionTrigger>
              <AccordionContent className="pb-6 pr-8 text-[0.9375rem] leading-relaxed text-slate-600 sm:text-base">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  </section>
);

export default FaqSection;
