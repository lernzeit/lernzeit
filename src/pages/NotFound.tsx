import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Fehler: Seite nicht gefunden:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background pt-safe-top pb-safe-bottom px-safe">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold mb-4 text-primary">404</h1>
        <p className="text-xl text-muted-foreground mb-2">Seite nicht gefunden</p>
        <p className="text-sm text-muted-foreground mb-6">Diese Seite existiert nicht oder wurde verschoben.</p>
        <a href="/" className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition">
          Zur Startseite
        </a>
      </div>
    </div>
  );
};

export default NotFound;
