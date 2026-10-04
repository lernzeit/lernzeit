import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";

interface UseOneSignalOptions {
  userId?: string;
  enabled?: boolean;
  appId: string;
  /**
   * Wenn false, wird die Push-Erlaubnis NICHT beim Start abgefragt.
   * Für Eltern fragen wir sie erst beim Teilen des Einladungslinks ab.
   */
  autoPrompt?: boolean;
}

let oneSignalRef: any = null;

/**
 * Fragt die Push-Erlaubnis zum passenden Zeitpunkt ab (z. B. beim Teilen des
 * Einladungslinks). No-op auf Web bzw. wenn OneSignal nicht initialisiert ist.
 */
export async function requestPushPermissionNow(): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;
    await oneSignalRef?.Notifications?.requestPermission?.(true);
  } catch (e) {
    console.warn("requestPushPermissionNow failed", e);
  }
}

/**
 * Vor dem Abmelden aufrufen: Das Gerät bekommt danach keine Pushes mehr für
 * dieses Konto. Ohne das landeten z. B. Eltern-Meldungen weiter auf einem
 * Telefon, auf dem inzwischen das Kind angemeldet ist.
 */
export async function unregisterPushDevice(userId?: string): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform() || !oneSignalRef || !userId) return;
    const playerId = oneSignalRef.User?.pushSubscription?.id;
    if (playerId) {
      await supabase.from("push_tokens").delete().eq("user_id", userId).eq("player_id", playerId);
    }
    oneSignalRef.logout?.();
  } catch (e) {
    console.warn("unregisterPushDevice failed", e);
  }
}

/**
 * Initializes OneSignal on native platforms (Android/iOS) and registers
 * the device's player ID against the authenticated user. On web this hook
 * is a no-op — push notifications there are handled by usePushNotifications.
 */
export function useOneSignal({ userId, enabled = true, appId, autoPrompt = true }: UseOneSignalOptions) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !userId || !appId) return;
    if (!Capacitor.isNativePlatform()) return;
    if (initializedRef.current) return;

    let cancelled = false;

    const setup = async () => {
      try {
        // Dynamic import keeps web bundle clean
        const mod = await import("onesignal-cordova-plugin");
        // Cordova plugins are exposed via window after deviceready
        const OneSignal = (window as any).plugins?.OneSignalPlugin || (mod as any).default || (mod as any);

        if (!OneSignal) {
          console.warn("OneSignal plugin unavailable");
          return;
        }

        OneSignal.initialize(appId);
        oneSignalRef = OneSignal;

        // Push-Erlaubnis nur abfragen, wenn der Nutzen bereits erkennbar ist.
        if (autoPrompt) {
          OneSignal.Notifications.requestPermission(true);
        }

        // Login user → external_id
        OneSignal.login(userId);

        const savePlayerId = async () => {
          try {
            const id = await OneSignal.User.pushSubscription.getIdAsync?.();
            const playerId = id || OneSignal.User.pushSubscription.id;
            if (!playerId || cancelled) return;

            const platform = Capacitor.getPlatform() as "android" | "ios" | "web";
            const { error } = await supabase
              .from("push_tokens")
              .upsert(
                { user_id: userId, player_id: playerId, platform },
                { onConflict: "user_id,player_id" },
              );
            if (error) console.error("Failed to save push token:", error);
            else console.log("✅ OneSignal player registered:", playerId);
          } catch (e) {
            console.error("savePlayerId error:", e);
          }
        };

        // Try immediately + on subscription change
        setTimeout(savePlayerId, 1500);
        OneSignal.User.pushSubscription.addEventListener?.("change", savePlayerId);

        initializedRef.current = true;
      } catch (e) {
        console.error("OneSignal setup failed:", e);
      }
    };

    setup();

    return () => {
      cancelled = true;
    };
  }, [enabled, userId, appId, autoPrompt]);
}
