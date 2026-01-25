import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, Building2 } from 'lucide-react';

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
      </div>
      <p className={`text-center text-xs mt-2 ${variant === 'dark' ? 'text-gray-500' : 'text-muted-foreground/60'}`}>
        © {new Date().getFullYear()} LernZeit. Alle Rechte vorbehalten.
      </p>
    </footer>
  );
};

export default LegalFooter;
