import { useState, useEffect, useRef } from 'react';
import { Check, Trophy, Smile, Clock, Settings, Eye, BarChart3, Gamepad2, Award, Lightbulb } from 'lucide-react';

const childFeatures = [
  { icon: Gamepad2, text: 'Spielerisch lernen mit Achievements und Streaks' },
  { icon: Clock, text: 'Eigene Bildschirmzeit verdienen – pro richtige Antwort' },
  { icon: Lightbulb, text: 'KI-Erklärungen bei Fehlern – mit Vorlese-Funktion' },
];

const parentFeatures = [
  { icon: Clock, text: 'Tägliches Zeitlimit festlegen (Wochentag / Wochenende)' },
  { icon: Settings, text: 'Belohnung pro Aufgabe je Fach individuell einstellen' },
  { icon: Eye, text: 'Fächer sichtbar/unsichtbar schalten und Schwerpunkte setzen' },
  { icon: BarChart3, text: 'Lernfortschritte verfolgen' },
];

const PhoneMockup = ({ activeTab }: { activeTab: 'parent' | 'child' }) => (
  <div className="relative">
    <div className="w-[280px] sm:w-[300px] bg-card rounded-[2.5rem] border-[6px] border-foreground/10 shadow-2xl p-4 transition-all duration-500">
      <div className="bg-muted rounded-[2rem] overflow-hidden">
        {activeTab === 'parent' ? (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-primary" />
              <span className="font-bold text-sm">Eltern-Dashboard</span>
            </div>
            <div className="bg-card rounded-xl p-3 border">
              <div className="text-xs text-muted-foreground mb-1">Tägliches Limit</div>
              <div className="text-2xl font-bold text-primary">60 min</div>
              <div className="text-xs text-muted-foreground">Wochentag</div>
            </div>
            <div className="bg-card rounded-xl p-3 border">
              <div className="text-xs text-muted-foreground mb-2">Belohnung / Aufgabe</div>
              <div className="space-y-2">
                {[['Mathe', '30'], ['Deutsch', '25'], ['Englisch', '20']].map(([f, s]) => (
                  <div key={f} className="flex justify-between text-sm">
                    <span>{f}</span>
                    <span className="font-semibold text-primary">{s} Sek.</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card rounded-xl p-3 border">
              <div className="text-xs text-muted-foreground mb-1">Lernfortschritt</div>
              <div className="flex gap-1 mt-2">
                {[80, 60, 90, 45, 70].map((h, i) => (
                  <div key={i} className="flex-1 bg-primary/20 rounded-full overflow-hidden" style={{ height: 40 }}>
                    <div className="bg-primary rounded-full w-full transition-all" style={{ height: `${h}%`, marginTop: `${100 - h}%` }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Smile className="w-5 h-5 text-secondary" />
              <span className="font-bold text-sm">Mein Lernbereich</span>
            </div>
            <div className="bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-xl p-3 border">
              <div className="text-xs text-muted-foreground mb-1">Verdiente Zeit heute</div>
              <div className="text-2xl font-bold text-secondary">12:30 min</div>
              <div className="w-full bg-secondary/20 rounded-full h-2 mt-2">
                <div className="bg-secondary rounded-full h-2 w-3/5 transition-all" />
              </div>
            </div>
            <div className="bg-card rounded-xl p-3 border">
              <div className="text-xs text-muted-foreground mb-2">Fach wählen</div>
              <div className="grid grid-cols-2 gap-2">
                {['Mathe', 'Deutsch', 'Englisch', 'Bio'].map(f => (
                  <div key={f} className="bg-muted rounded-lg p-2 text-center text-xs font-medium hover:bg-secondary/10 transition-colors cursor-pointer">
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card rounded-xl p-3 border">
              <div className="text-xs text-muted-foreground mb-2">Achievements</div>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <Award className="w-4 h-4 text-accent" />
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-primary" />
                </div>
                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                  <Gamepad2 className="w-4 h-4 text-secondary" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    <div className={`absolute -z-10 -top-8 -right-8 w-32 h-32 rounded-full blur-2xl transition-colors duration-500 ${
      activeTab === 'parent' ? 'bg-primary/20' : 'bg-secondary/20'
    }`} />
    <div className={`absolute -z-10 -bottom-8 -left-8 w-24 h-24 rounded-full blur-2xl transition-colors duration-500 ${
      activeTab === 'parent' ? 'bg-accent/20' : 'bg-primary/20'
    }`} />
  </div>
);

const TargetAudience = () => {
  const [activeTab, setActiveTab] = useState<'parent' | 'child'>('parent');
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => e.isIntersecting && e.target.classList.add('animate-in')),
      { threshold: 0.1 }
    );
    sectionRef.current?.querySelectorAll('.scroll-fade').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const features = activeTab === 'parent' ? parentFeatures : childFeatures;

  return (
    <section ref={sectionRef} className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Mobile: stacked (heading → phone → text). Desktop: side-by-side */}
        <div className="scroll-fade opacity-0 translate-y-4 transition-all duration-700">

          {/* ── Heading + Tab switcher (always on top on mobile, part of text col on desktop) ── */}
          <div className="md:hidden text-center mb-8">
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight mb-2">
              Eine App.
              <br />
              <span className={`bg-gradient-to-r ${activeTab === 'parent' ? 'from-primary to-primary/70' : 'from-secondary to-secondary/70'} bg-clip-text text-transparent transition-colors duration-300`}>
                Zwei Ansichten.
              </span>
            </h2>
            <div className="inline-flex bg-muted rounded-full p-1 mt-4">
              <button
                onClick={() => setActiveTab('parent')}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'parent'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Elternmodus
              </button>
              <button
                onClick={() => setActiveTab('child')}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'child'
                    ? 'bg-secondary text-secondary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Kindermodus
              </button>
            </div>
          </div>

          {/* ── Phone mockup (on top on mobile, right side on desktop) ── */}
          <div className="flex justify-center mb-10 md:hidden">
            <PhoneMockup activeTab={activeTab} />
          </div>

          {/* ── Two-column grid for desktop ── */}
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Text side */}
            <div>
              {/* Desktop-only heading + switcher */}
              <div className="hidden md:block">
                <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-2">
                  Eine App.
                  <br />
                  <span className={`bg-gradient-to-r ${activeTab === 'parent' ? 'from-primary to-primary/70' : 'from-secondary to-secondary/70'} bg-clip-text text-transparent transition-colors duration-300`}>
                    Zwei Ansichten.
                  </span>
                </h2>
                <div className="inline-flex bg-muted rounded-full p-1 mb-8 mt-4">
                  <button
                    onClick={() => setActiveTab('parent')}
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                      activeTab === 'parent'
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Elternmodus
                  </button>
                  <button
                    onClick={() => setActiveTab('child')}
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                      activeTab === 'child'
                        ? 'bg-secondary text-secondary-foreground shadow-md'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Kindermodus
                  </button>
                </div>
              </div>

              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                {activeTab === 'parent'
                  ? 'Deine Eltern-Ansicht mit voller Kontrolle. Stelle Zeitlimits, Belohnungen und Fächersichtbarkeit individuell ein.'
                  : 'In der Kinder-Ansicht können Aufgaben gelöst und Bildschirmzeit verdient werden – spielerisch und motivierend.'}
              </p>

              <ul className="space-y-4">
                {features.map((f) => (
                  <li key={f.text} className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      activeTab === 'parent' ? 'bg-primary/10' : 'bg-secondary/10'
                    }`}>
                      <f.icon className={`w-4.5 h-4.5 ${activeTab === 'parent' ? 'text-primary' : 'text-secondary'}`} />
                    </div>
                    <span className="text-base pt-1.5">{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Desktop-only phone mockup */}
            <div className="hidden md:flex justify-center">
              <PhoneMockup activeTab={activeTab} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .animate-in { opacity: 1 !important; transform: translateY(0) !important; }
      `}</style>
    </section>
  );
};

export default TargetAudience;
