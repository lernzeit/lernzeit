import { Link } from 'react-router-dom';
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
    <div className="lp-container grid gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-4">
        <h2 className="text-[2.25rem] font-extrabold sm:text-5xl">Häufige Fragen</h2>
        <Link
          to="/faq"
          className="mt-6 inline-block font-bold text-[var(--lp-blau)] underline decoration-[var(--lp-karo)] decoration-2 underline-offset-4 hover:decoration-[var(--lp-blau)]"
        >
          Alle Fragen und Antworten
        </Link>
      </div>
      <div className="lg:col-span-8">
        <Accordion type="single" collapsible className="w-full border-t border-[var(--lp-karo)]">
          {FAQ.map(({ f, a }, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-[var(--lp-karo)]">
              <AccordionTrigger className="py-6 text-left text-[1.0625rem] font-bold text-[var(--lp-tinte)] hover:no-underline sm:text-lg">
                {f}
              </AccordionTrigger>
              <AccordionContent className="pb-6 pr-8 text-base leading-relaxed text-[var(--lp-text)]">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  </section>
);

export default FaqSection;
