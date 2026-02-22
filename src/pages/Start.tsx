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
    <div className="min-h-screen bg-gradient-bg">
      <HeroSection />
      <HowItWorks />
      <USPSection />
      <TargetAudience />
      <PricingComparison />

      {/* Footer CTA */}
      <section className="py-16 px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          Jetzt kostenlos starten
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Melde dich an und teste alle Funktionen – die ersten 4 Wochen sind kostenlos.
        </p>
        <Button
          onClick={() => navigate('/?auth=true')}
          size="lg"
          className="h-14 px-8 text-lg font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        >
          Kostenlos registrieren
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </section>

      <LegalFooter className="pb-8" />
    </div>
  );
};

export default Start;
