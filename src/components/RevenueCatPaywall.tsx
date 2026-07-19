import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Crown, Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  initRevenueCat,
  isRevenueCatSupported,
  PREMIUM_ENTITLEMENT_ID,
} from '@/services/revenueCat';
import { useAuth } from '@/hooks/useAuth';
import { usePremium } from '@/hooks/usePremium';
import { supabase } from '@/lib/supabase';
import { STRIPE_MONTHLY_PRICE_ID, STRIPE_YEARLY_PRICE_ID } from '@/config/pricing';

interface PkgLike {
  identifier: string;
  product: {
    priceString: string;
    title?: string;
    description?: string;
    identifier: string;
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchased?: () => void;
}

export function RevenueCatPaywall({ open, onOpenChange, onPurchased }: Props) {
  const { user } = useAuth();
  const { refresh } = usePremium();
  const [loading, setLoading] = useState(true);
  const [monthly, setMonthly] = useState<PkgLike | null>(null);
  const [annual, setAnnual] = useState<PkgLike | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [stripeFallbackLoading, setStripeFallbackLoading] = useState<string | null>(null);

  // Re-checks the RevenueCat entitlement directly and returns whether premium is active.
  const verifyEntitlementActive = async (): Promise<boolean> => {
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await Purchases.getCustomerInfo();
      return !!customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
    } catch (err) {
      console.warn('Entitlement re-check failed:', err);
      return false;
    }
  };

  // Fallback: start a Stripe Checkout in an external browser tab when RevenueCat is unreachable.
  const startStripeFallback = async (plan: 'monthly' | 'yearly') => {
    setStripeFallbackLoading(plan);
    setActionError(null);
    try {
      const priceId = plan === 'yearly' ? STRIPE_YEARLY_PRICE_ID : STRIPE_MONTHLY_PRICE_ID;
      if (!priceId || !priceId.startsWith('price_')) {
        throw new Error('Preis ist derzeit nicht verfügbar.');
      }
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { price_id: priceId },
      });
      if (error) throw error;
      const url: string | undefined = data?.url;
      if (!url) throw new Error('Checkout konnte nicht gestartet werden.');
      // Open in the system browser so Stripe Checkout works even inside the app WebView.
      window.open(url, '_blank');
      toast({
        title: 'Checkout geöffnet',
        description: 'Schließen Sie den Kauf im Browser ab – der Status wird beim nächsten App-Wechsel aktualisiert.',
      });
    } catch (err: any) {
      setActionError(
        err?.message
          ? `Alternative Zahlung fehlgeschlagen: ${err.message}`
          : 'Alternative Zahlung fehlgeschlagen. Bitte versuchen Sie es später erneut.'
      );
    } finally {
      setStripeFallbackLoading(null);
    }
  };

  const loadOfferings = async () => {
    if (!open) return;
    if (!isRevenueCatSupported()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    setActionError(null);
    try {
      await initRevenueCat(user?.id ?? null);
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { current } = await Purchases.getOfferings();
      const m = (current?.monthly as PkgLike) ?? null;
      const a = (current?.annual as PkgLike) ?? null;
      setMonthly(m);
      setAnnual(a);
      if (!m && !a) {
        setLoadError('Derzeit sind keine Abo-Pakete verfügbar. Bitte versuchen Sie es später erneut.');
      }
    } catch (err: any) {
      console.error('Load offerings failed:', err);
      setLoadError(
        err?.message
          ? `Angebote konnten nicht geladen werden: ${err.message}`
          : 'Angebote konnten nicht geladen werden. Bitte prüfen Sie Ihre Internetverbindung.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOfferings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  const purchase = async (pkg: PkgLike) => {
    setPurchasing(pkg.identifier);
    setActionError(null);
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const result: any = await Purchases.purchasePackage({ aPackage: pkg as any });
      let active = !!result?.customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
      // Explicit re-check to guard against stale customerInfo in the purchase response.
      if (!active) active = await verifyEntitlementActive();
      await refresh();
      if (active) {
        toast({ title: 'Willkommen bei Premium!', description: 'Alle Funktionen sind jetzt freigeschaltet.' });
        onPurchased?.();
        onOpenChange(false);
      } else {
        setActionError('Kauf abgeschlossen, aber Premium konnte nicht aktiviert werden. Bitte versuchen Sie „Käufe wiederherstellen“.');
      }
    } catch (err: any) {
      if (!err?.userCancelled) {
        console.error('Purchase failed:', err);
        setActionError(
          err?.message
            ? `Kauf fehlgeschlagen: ${err.message}`
            : 'Kauf fehlgeschlagen. Bitte versuchen Sie es erneut.'
        );
      }
    } finally {
      setPurchasing(null);
    }
  };

  const restore = async () => {
    setRestoring(true);
    setActionError(null);
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await Purchases.restorePurchases();
      let active = !!customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
      if (!active) active = await verifyEntitlementActive();
      await refresh();
      if (active) {
        toast({ title: 'Käufe wiederhergestellt', description: 'Premium ist wieder aktiv.' });
        onOpenChange(false);
      } else {
        setActionError('Keine aktiven Käufe gefunden.');
      }
    } catch (err: any) {
      console.error('Restore failed:', err);
      setActionError(
        err?.message
          ? `Wiederherstellung fehlgeschlagen: ${err.message}`
          : 'Wiederherstellung fehlgeschlagen. Bitte versuchen Sie es erneut.'
      );
    } finally {
      setRestoring(false);
    }
  };

  if (!isRevenueCatSupported()) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Premium</DialogTitle>
            <DialogDescription>
              In-App-Käufe sind nur in der iOS-App verfügbar. Nutzen Sie im Web bitte die Stripe-Zahlung.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const features = [
    'Alle Fächer & Klassenstufen',
    'Individueller Lernplan',
    'Detaillierte Fortschrittsanalyse',
    'Bildschirmzeit-Belohnungen anpassen',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-warning" />
            <DialogTitle>LernZeit Premium</DialogTitle>
          </div>
          <DialogDescription>
            Schalten Sie alle Funktionen für Ihre Familie frei.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 py-2">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              {f}
            </li>
          ))}
        </ul>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Angebote werden geladen …</p>
          </div>
        ) : loadError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{loadError}</span>
            </div>
            <Button size="sm" variant="outline" className="w-full" onClick={() => void loadOfferings()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Erneut versuchen
            </Button>
            <div className="pt-2 border-t space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                Alternativ per Kreditkarte / SEPA bezahlen:
              </p>
              <Button
                size="sm"
                className="w-full"
                onClick={() => void startStripeFallback('yearly')}
                disabled={stripeFallbackLoading !== null}
              >
                {stripeFallbackLoading === 'yearly' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Jährlich – im Browser bezahlen
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => void startStripeFallback('monthly')}
                disabled={stripeFallbackLoading !== null}
              >
                {stripeFallbackLoading === 'monthly' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Monatlich – im Browser bezahlen
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {actionError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
            {annual && (
              <Card
                className="p-4 border-2 border-primary cursor-pointer hover:bg-accent transition"
                onClick={() => !purchasing && purchase(annual)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Jährlich</span>
                      <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                        Beliebt
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Bester Preis pro Monat</p>
                  </div>
                  <div className="text-right">
                    {purchasing === annual.identifier ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <span className="font-bold text-lg">{annual.product.priceString}</span>
                    )}
                  </div>
                </div>
              </Card>
            )}
            {monthly && (
              <Card
                className="p-4 border cursor-pointer hover:bg-accent transition"
                onClick={() => !purchasing && purchase(monthly)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold">Monatlich</span>
                    <p className="text-xs text-muted-foreground">Flexibel monatlich kündbar</p>
                  </div>
                  <div className="text-right">
                    {purchasing === monthly.identifier ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <span className="font-bold text-lg">{monthly.product.priceString}</span>
                    )}
                  </div>
                </div>
              </Card>
            )}
            {!annual && !monthly && (
              <p className="text-sm text-center text-muted-foreground py-4">
                Keine Angebote verfügbar.
              </p>
            )}
          </div>
        )}

        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={restore}
            disabled={restoring}
          >
            {restoring ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Käufe wiederherstellen
          </Button>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            Zahlung wird nach Bestätigung dem iTunes-Konto belastet. Abo verlängert sich automatisch, sofern es nicht mindestens 24 Stunden vor Ende des Zeitraums gekündigt wird.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}