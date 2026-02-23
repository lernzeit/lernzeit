import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HeroSection from '@/components/landing/HeroSection';
import HowItWorks from '@/components/landing/HowItWorks';
import USPSection from '@/components/landing/USPSection';
import TargetAudience from '@/components/landing/TargetAudience';
import PricingComparison from '@/components/landing/PricingComparison';
import LegalFooter from '@/components/layout/LegalFooter';

const Start = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <HowItWorks />
      <USPSection />
      <TargetAudience />
      <PricingComparison />

      {/* Footer CTA */}
      <section className="py-24 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
        <div className="relative">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
            Jetzt kostenlos starten
          </h2>
          <p className="text-muted-foreground mb-10 max-w-md mx-auto text-lg">
            Melde dich an und teste alle Funktionen – die ersten 4 Wochen sind kostenlos.
          </p>
          <Button
            onClick={() => navigate('/?auth=true')}
            size="lg"
            className="h-14 px-10 text-lg font-semibold rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            Kostenlos registrieren
            <ArrowRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </section>

      <LegalFooter className="pb-8" />
    </div>
  );
};

export default Start;
