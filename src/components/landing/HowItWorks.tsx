import { BookOpen, Brain, Clock } from 'lucide-react';

const steps = [
  {
    icon: BookOpen,
    number: '01',
    title: 'Fach wählen',
    description: 'Mathe, Deutsch, Englisch und viele weitere Fächer – von Klasse 1 bis 10.',
    gradient: 'from-primary to-primary/70',
  },
  {
    icon: Brain,
    number: '02',
    title: 'Aufgaben lösen',
    description: 'Altersgerechte Fragen beantworten – bei Fehlern hilft der KI-Tutor mit Erklärungen.',
    gradient: 'from-secondary to-secondary/70',
  },
  {
    icon: Clock,
    number: '03',
    title: 'Zeit verdienen',
    description: 'Pro richtige Antwort erhalten Kinder Bildschirmzeit – Eltern legen die Sekunden pro Fach fest.',
    gradient: 'from-accent to-accent/70',
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">So einfach geht's</span>
          <h2 className="text-4xl sm:text-5xl font-extrabold mt-3 tracking-tight">
            In drei Schritten zur{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              verdienten Zeit
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div
              key={step.title}
              className="group relative bg-card rounded-3xl p-8 border shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2"
            >
              <span className="text-6xl font-black text-muted/60 absolute top-4 right-6">
                {step.number}
              </span>
              <div className={`w-14 h-14 bg-gradient-to-br ${step.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <step.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-xl mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
