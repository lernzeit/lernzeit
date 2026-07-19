import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Crown, Check, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  initRevenueCat,
  isRevenueCatSupported,
  PREMIUM_ENTITLEMENT_ID,
} from '@/services/revenueCat';
import { useAuth } from '@/hooks/useAuth';
import { usePremium } from '@/hooks/usePremium';

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

  useEffect(() => {
    if (!open) return;
    if (!isRevenueCatSupported()) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        await initRevenueCat(user?.id ?? null);
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        const { current } = await Purchases.getOfferings();
        if (current) {
          setMonthly((current.monthly as PkgLike) ?? null);
          setAnnual((current.annual as PkgLike) ?? null);
        }
      } catch (err) {
        console.error('Load offerings failed:', err);
        toast({
          title: 'Angebote konnten nicht geladen werden',
          description: 'Bitte prüfen Sie Ihre Internetverbindung.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, user?.id]);

  const purchase = async (pkg: PkgLike) => {
    setPurchasing(pkg.identifier);
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const result: any = await Purchases.purchasePackage({ aPackage: pkg as any });
      const active = !!result?.customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
      if (active) {
        toast({ title: 'Willkommen bei Premium!', description: 'Alle Funktionen sind jetzt freigeschaltet.' });
        await refresh();
        onPurchased?.();
        onOpenChange(false);
      }
    } catch (err: any) {
      if (!err?.userCancelled) {
        console.error('Purchase failed:', err);
        toast({
          title: 'Kauf fehlgeschlagen',
          description: 'Bitte versuchen Sie es erneut.',
          variant: 'destructive',
        });
      }
    } finally {
      setPurchasing(null);
    }
  };

  const restore = async () => {
    setRestoring(true);
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await Purchases.restorePurchases();
      const active = !!customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
      if (active) {
        toast({ title: 'Käufe wiederhergestellt', description: 'Premium ist wieder aktiv.' });
        await refresh();
        onOpenChange(false);
      } else {
        toast({ title: 'Keine aktiven Käufe gefunden' });
      }
    } catch (err) {
      console.error('Restore failed:', err);
      toast({ title: 'Wiederherstellung fehlgeschlagen', variant: 'destructive' });
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
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
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