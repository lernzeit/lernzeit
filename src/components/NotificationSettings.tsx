import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Loader2, GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface LinkedChild {
  id: string;
  name: string | null;
}

interface NotificationSettingsProps {
  userId: string;
  /** "child" role kept for backwards compatibility but no longer renders here. */
  role: "parent" | "child";
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const formatHour = (h: number) => `${h.toString().padStart(2, "0")}:00`;

export function NotificationSettings({ userId, role }: NotificationSettingsProps) {
  const [enabled, setEnabled] = useState(true);
  const [summaryHour, setSummaryHour] = useState<number>(18);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [childHours, setChildHours] = useState<Record<string, number>>({});
  const [savingChild, setSavingChild] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Load own profile (toggle + summary hour for parents, reminder hour for children)
      const { data: profile } = await supabase
        .from("profiles")
        .select("daily_push_enabled, daily_summary_hour, learning_reminder_hour")
        .eq("id", userId)
        .maybeSingle();

      if (!cancelled && profile) {
        setEnabled((profile as any).daily_push_enabled ?? true);
        if (role === "parent") {
          setSummaryHour((profile as any).daily_summary_hour ?? 18);
        } else {
          setSummaryHour((profile as any).learning_reminder_hour ?? 16);
        }
      }

      // Parents: load linked children + their reminder hours
      if (role === "parent") {
        const { data: rels } = await supabase
          .from("parent_child_relationships")
          .select("child_id")
          .eq("parent_id", userId);

        const childIds = (rels ?? []).map((r: any) => r.child_id).filter(Boolean);
        if (childIds.length > 0) {
          const { data: kids } = await supabase
            .from("profiles")
            .select("id, name, learning_reminder_hour")
            .in("id", childIds);

          if (!cancelled && kids) {
            setChildren(kids.map((k: any) => ({ id: k.id, name: k.name })));
            const hours: Record<string, number> = {};
            for (const k of kids as any[]) {
              hours[k.id] = k.learning_reminder_hour ?? 16;
            }
            setChildHours(hours);
          }
        }
      }

      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, role]);

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

  const handleSummaryHourChange = async (value: string) => {
    const next = parseInt(value, 10);
    const prev = summaryHour;
    setSummaryHour(next);
    setSaving(true);
    const field = role === "parent" ? "daily_summary_hour" : "learning_reminder_hour";
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: next })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      setSummaryHour(prev);
      toast({ title: "Fehler", description: "Uhrzeit konnte nicht gespeichert werden.", variant: "destructive" });
      return;
    }
    toast({
      title: "Uhrzeit gespeichert",
      description: `Benachrichtigung kommt jetzt um ${formatHour(next)} Uhr.`,
    });
  };

  const handleChildHourChange = async (childId: string, value: string) => {
    const next = parseInt(value, 10);
    const prev = childHours[childId];
    setChildHours((s) => ({ ...s, [childId]: next }));
    setSavingChild(childId);
    const { error } = await supabase
      .from("profiles")
      .update({ learning_reminder_hour: next })
      .eq("id", childId);
    setSavingChild(null);
    if (error) {
      setChildHours((s) => ({ ...s, [childId]: prev }));
      toast({ title: "Fehler", description: "Uhrzeit konnte nicht gespeichert werden.", variant: "destructive" });
      return;
    }
    toast({
      title: "Erinnerung gespeichert",
      description: `Lern-Erinnerung um ${formatHour(next)} Uhr eingestellt.`,
    });
  };

  const description =
    role === "parent"
      ? "Tägliche Zusammenfassung der Lernfortschritte deines Kindes."
      : "Tägliche Lern-Erinnerung, wenn du noch nicht gelernt hast.";

  return (
    <div className="space-y-4">
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
              {role === "parent" ? "Tägliche Zusammenfassung" : "Tägliche Lern-Erinnerung"}
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
                value={String(summaryHour)}
                onValueChange={handleSummaryHourChange}
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

      {role === "parent" && children.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Lern-Erinnerungen für Kinder
            </CardTitle>
            <CardDescription>
              Lege fest, wann dein Kind erinnert wird, falls es noch nicht gelernt hat.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {children.map((child) => (
              <div key={child.id} className="flex items-center justify-between gap-4">
                <Label htmlFor={`child-hour-${child.id}`} className="flex-1 truncate">
                  {child.name || "Kind"}
                </Label>
                <Select
                  value={String(childHours[child.id] ?? 16)}
                  onValueChange={(v) => handleChildHourChange(child.id, v)}
                  disabled={savingChild === child.id}
                >
                  <SelectTrigger id={`child-hour-${child.id}`} className="w-[110px]">
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
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Die Erinnerung wird nur gesendet, wenn das Kind an diesem Tag noch keine Lernsitzung gestartet hat.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
