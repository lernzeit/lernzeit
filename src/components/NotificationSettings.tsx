import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface NotificationSettingsProps {
  userId: string;
  role: "parent" | "child";
}

export function NotificationSettings({ userId, role }: NotificationSettingsProps) {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("daily_push_enabled")
        .eq("id", userId)
        .maybeSingle();
      if (!cancelled) {
        setEnabled(data?.daily_push_enabled ?? true);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleToggle = async (next: boolean) => {
    setSaving(true);
    const prev = enabled;
    setEnabled(next);
    const { error } = await supabase
      .from("profiles")
      .update({ daily_push_enabled: next })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      setEnabled(prev);
      toast({ title: "Fehler", description: "Einstellung konnte nicht gespeichert werden.", variant: "destructive" });
      return;
    }
    toast({
      title: next ? "Benachrichtigungen aktiviert" : "Benachrichtigungen deaktiviert",
      description: next
        ? "Du erhältst wieder tägliche Push-Benachrichtigungen."
        : "Du erhältst keine täglichen Push-Benachrichtigungen mehr.",
    });
  };

  const description =
    role === "parent"
      ? "Tägliche Zusammenfassung um 18:00 Uhr über die Lernfortschritte deines Kindes."
      : "Tägliche Lern-Erinnerung um 16:00 Uhr, wenn du noch nicht gelernt hast.";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push-Benachrichtigungen
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="daily-push-toggle" className="flex-1 cursor-pointer">
            Tägliche Push-Benachrichtigung
          </Label>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              id="daily-push-toggle"
              checked={enabled}
              disabled={saving}
              onCheckedChange={handleToggle}
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Wichtige Benachrichtigungen (z.&nbsp;B. Bildschirmzeit-Anfragen oder -Antworten) werden weiterhin gesendet.
        </p>
      </CardContent>
    </Card>
  );
}
