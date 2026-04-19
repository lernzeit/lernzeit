import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface NotificationSettingsProps {
  userId: string;
  role: "parent" | "child";
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const formatHour = (h: number) => `${h.toString().padStart(2, "0")}:00`;

export function NotificationSettings({ userId, role }: NotificationSettingsProps) {
  const [enabled, setEnabled] = useState(true);
  const [hour, setHour] = useState<number>(role === "parent" ? 18 : 16);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const hourField = role === "parent" ? "daily_summary_hour" : "learning_reminder_hour";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select(`daily_push_enabled, ${hourField}`)
        .eq("id", userId)
        .maybeSingle();
      if (!cancelled && data) {
        setEnabled((data as any).daily_push_enabled ?? true);
        const v = (data as any)[hourField];
        if (typeof v === "number") setHour(v);
        setLoading(false);
      } else if (!cancelled) {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, hourField]);

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

  const handleHourChange = async (value: string) => {
    const next = parseInt(value, 10);
    const prev = hour;
    setHour(next);
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ [hourField]: next })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      setHour(prev);
      toast({ title: "Fehler", description: "Uhrzeit konnte nicht gespeichert werden.", variant: "destructive" });
      return;
    }
    toast({
      title: "Uhrzeit gespeichert",
      description: `Benachrichtigung kommt jetzt um ${formatHour(next)} Uhr.`,
    });
  };

  const description =
    role === "parent"
      ? "Tägliche Zusammenfassung der Lernfortschritte deines Kindes."
      : "Tägliche Lern-Erinnerung, wenn du noch nicht gelernt hast.";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push-Benachrichtigungen
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="daily-push-hour" className="flex-1">
            Uhrzeit (Europe/Berlin)
          </Label>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Select
              value={String(hour)}
              onValueChange={handleHourChange}
              disabled={saving || !enabled}
            >
              <SelectTrigger id="daily-push-hour" className="w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {HOUR_OPTIONS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {formatHour(h)} Uhr
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Wichtige Benachrichtigungen (z.&nbsp;B. Bildschirmzeit-Anfragen oder -Antworten) werden weiterhin sofort gesendet.
        </p>
      </CardContent>
    </Card>
  );
}
