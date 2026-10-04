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
  <section data-abschnitt="faq" className="py-20 px-4">
    <div className="max-w-3xl mx-auto">
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center mb-10">Häufige Fragen</h2>
      <FaqListe />
    </div>
  </section>
);

export default FaqSection;
