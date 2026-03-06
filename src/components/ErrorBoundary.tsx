import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onBack?: () => void;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: '' };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔴 ErrorBoundary caught:', error.message, errorInfo.componentStack);
    this.setState({ errorInfo: error.message });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
              <h2 className="text-lg font-bold mb-2">Etwas ist schiefgelaufen</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {this.props.fallbackMessage || 'Die Seite konnte nicht geladen werden. Bitte versuche es erneut.'}
              </p>
              {this.state.errorInfo && (
                <p className="text-xs text-muted-foreground/60 mb-4 font-mono break-all">
                  {this.state.errorInfo}
                </p>
              )}
              <div className="flex gap-3 justify-center">
                {this.props.onBack && (
                  <Button variant="outline" onClick={this.props.onBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Zurück
                  </Button>
                )}
                <Button onClick={this.handleRetry}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Nochmal versuchen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
