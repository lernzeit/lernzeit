import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Brain, Clock } from 'lucide-react';

const steps = [
  {
    icon: BookOpen,
    title: '1. Fach wählen',
    description: 'Mathe, Deutsch, Englisch und viele weitere Fächer – von Klasse 1 bis 10.',
    gradient: 'from-blue-500 to-purple-600',
  },
  {
    icon: Brain,
    title: '2. Aufgaben lösen',
    description: 'Altersgerechte Fragen beantworten – bei Fehlern hilft der KI-Tutor mit Erklärungen.',
    gradient: 'from-green-500 to-emerald-600',
  },
  {
    icon: Clock,
    title: '3. Zeit verdienen',
    description: 'Pro richtige Antwort erhalten Kinder Bildschirmzeit – Eltern legen die Sekunden pro Fach fest.',
    gradient: 'from-orange-500 to-red-600',
  },
];

const HowItWorks = () => {
  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
          So funktioniert's
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          In drei einfachen Schritten zur verdienten Bildschirmzeit.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <Card
              key={step.title}
              className="shadow-card border-0 backdrop-blur-sm bg-card/80 hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 bg-gradient-to-r ${step.gradient} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
