import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Crown } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

interface PremiumGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  featureName?: string;
  showUpgradeButton?: boolean;
  onUpgradeClick?: () => void;
}

/**
 * Component that gates content behind a Premium subscription.
 * Shows upgrade prompt if user is not premium.
 */
export function PremiumGate({
  children,
  fallback,
  featureName = 'Diese Funktion',
  showUpgradeButton = true,
  onUpgradeClick,
}: PremiumGateProps) {
  const { isPremium, isTrialing, loading } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Allow access for premium or trialing users
  if (isPremium || isTrialing) {
    return <>{children}</>;
  }

  // Show upgrade prompt for free users
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="border-warning bg-warning/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-warning">
          <Crown className="h-5 w-5" />
          Premium erforderlich
        </CardTitle>
        <CardDescription>
          {featureName} ist nur mit LernZeit Premium verfügbar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upgraden Sie Ihren Account, um auf erweiterte Funktionen zuzugreifen und Ihrem Kind mehr
          Lernoptionen zu bieten.
        </p>
        {showUpgradeButton && (
          <Button
            onClick={onUpgradeClick}
            className="w-full bg-warning text-warning-foreground hover:bg-warning/90"
          >
            <Crown className="h-4 w-4 mr-2" />
            Zu Premium upgraden
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface PremiumFeatureProps {
  children: React.ReactNode;
  featureName?: string;
  onUpgradeClick?: () => void;
}

/**
 * Simpler wrapper that just disables content and shows an overlay with upgrade option.
 */
export function PremiumFeature({
  children,
  featureName = 'Diese Funktion',
  onUpgradeClick,
}: PremiumFeatureProps) {
  const { isPremium, isTrialing, loading } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isPremium || isTrialing) {
    return <>{children}</>;
  }

  return (
    <div className="relative rounded-lg border-2 border-dashed border-warning bg-warning/5 p-4">
      <div className="pointer-events-none opacity-40">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center rounded-lg">
        <div className="flex flex-col items-center gap-3 text-center">
          <Crown className="h-8 w-8 text-warning" />
          <div>
            <p className="font-medium text-foreground">{featureName}</p>
            <p className="text-xs text-muted-foreground">Premium erforderlich</p>
          </div>
          {onUpgradeClick && (
            <Button
              size="sm"
              onClick={onUpgradeClick}
              className="mt-2 bg-warning text-warning-foreground hover:bg-warning/90"
            >
              Upgraden
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface RequiresPremiumProps {
  children?: React.ReactNode;
  featureName?: string;
  onUpgradeClick?: () => void;
}

/**
 * Badge/indicator component showing that a feature requires Premium.
 */
export function RequiresPremiumBadge({
  featureName = 'Premium',
  onUpgradeClick,
}: RequiresPremiumProps) {
  return (
    <button
      onClick={onUpgradeClick}
      className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning hover:bg-warning/20"
    >
      <Crown className="h-3 w-3" />
      {featureName}
    </button>
  );
}
