import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, Building2, LifeBuoy, Trash2, BookOpen, HelpCircle } from 'lucide-react';
import { sichtbareArtikel } from '@/content/ratgeber';

interface LegalFooterProps {
  className?: string;
  variant?: 'light' | 'dark';
}

const LegalFooter: React.FC<LegalFooterProps> = ({ className = '', variant = 'light' }) => {
  const textClass = variant === 'dark' 
    ? 'text-gray-400 hover:text-gray-200' 
    : 'text-muted-foreground hover:text-foreground';

  return (
    <footer className={`py-4 ${className}`}>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
        <Link 
          to="/datenschutz" 
          className={`flex items-center gap-1.5 transition-colors ${textClass}`}
        >
          <Shield className="w-3.5 h-3.5" />
          Datenschutz
        </Link>
        <span className={`hidden sm:inline ${variant === 'dark' ? 'text-gray-600' : 'text-muted'}`}>•</span>
        <Link 
          to="/nutzungsbedingungen" 
          className={`flex items-center gap-1.5 transition-colors ${textClass}`}
        >
          <FileText className="w-3.5 h-3.5" />
          Nutzungsbedingungen
        </Link>
        <span className={`hidden sm:inline ${variant === 'dark' ? 'text-gray-600' : 'text-muted'}`}>•</span>
        <Link 
          to="/impressum" 
          className={`flex items-center gap-1.5 transition-colors ${textClass}`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Impressum
        </Link>
        <span className={`hidden sm:inline ${variant === 'dark' ? 'text-gray-600' : 'text-muted'}`}>•</span>
        <Link to="/faq" className={`flex items-center gap-1.5 transition-colors ${textClass}`}>
          <HelpCircle className="w-3.5 h-3.5" />
          FAQ
        </Link>
        <span className={`hidden sm:inline ${variant === 'dark' ? 'text-gray-600' : 'text-muted'}`}>•</span>
        <Link
          to="/support"
          className={`flex items-center gap-1.5 transition-colors ${textClass}`}
        >
          <LifeBuoy className="w-3.5 h-3.5" />
          Support
        </Link>
        <span className={`hidden sm:inline ${variant === 'dark' ? 'text-gray-600' : 'text-muted'}`}>•</span>
        <Link
          to="/konto-loeschen"
          className={`flex items-center gap-1.5 transition-colors ${textClass}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Konto löschen
        </Link>
        {/* Ratgeber nur, wenn es sichtbare Artikel gibt */}
        {sichtbareArtikel().length > 0 && (
          <>
            <span className={`hidden sm:inline ${variant === 'dark' ? 'text-gray-600' : 'text-muted'}`}>•</span>
            <Link to="/ratgeber" className={`flex items-center gap-1.5 transition-colors ${textClass}`}>
              <BookOpen className="w-3.5 h-3.5" />
              Ratgeber
            </Link>
          </>
        )}
      </div>
      <p className={`text-center text-xs mt-2 ${variant === 'dark' ? 'text-gray-300' : 'text-muted-foreground'}`}>
        © {new Date().getFullYear()} LernZeit. Alle Rechte vorbehalten.
      </p>
    </footer>
  );
};

export default LegalFooter;
