import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, MessageSquareHeart, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

type Status = 'open' | 'read' | 'done';
type Category = 'bug' | 'wish' | 'praise' | 'other';

interface FeedbackRow {
  id: string;
  user_id: string;
  category: Category;
  message: string;
  contact_email: string | null;
  app_version: string | null;
  platform: string | null;
  status: Status;
  admin_note: string | null;
  created_at: string;
}

const CATEGORY_LABEL: Record<Category, string> = {
  bug: 'Fehler',
  wish: 'Wunsch',
  praise: 'Lob',
  other: 'Sonstiges',
};

const STATUS_LABEL: Record<Status, string> = {
  open: 'Offen',
  read: 'Gelesen',
  done: 'Erledigt',
};

const PAGE_SIZE = 50;

export function FeedbackInbox() {
  const { toast } = useToast();
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<FeedbackRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('parent_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      if (categoryFilter !== 'all') q = q.eq('category', categoryFilter);
      const { data, error } = await q;
      if (error) throw error;
      setRows((data ?? []) as FeedbackRow[]);
    } catch (err: any) {
      toast({ title: 'Fehler', description: err?.message ?? 'Laden fehlgeschlagen', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter, categoryFilter, page]);

  const updateStatus = async (id: string, status: Status) => {
    const { error } = await supabase.from('parent_feedback').update({ status }).eq('id', id);
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast({ title: 'Kopiert' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquareHeart className="w-4 h-4" />
          Eltern-Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setPage(0); setStatusFilter(v as any); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="open">Offen</SelectItem>
              <SelectItem value="read">Gelesen</SelectItem>
              <SelectItem value="done">Erledigt</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={(v) => { setPage(0); setCategoryFilter(v as any); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Kategorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Kategorien</SelectItem>
              <SelectItem value="bug">Fehler</SelectItem>
              <SelectItem value="wish">Wunsch</SelectItem>
              <SelectItem value="praise">Lob</SelectItem>
              <SelectItem value="other">Sonstiges</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load}>Aktualisieren</Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Kein Feedback gefunden.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between gap-3 rounded border p-3 hover:bg-accent cursor-pointer"
                onClick={() => setSelected(r)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="secondary">{CATEGORY_LABEL[r.category]}</Badge>
                    <Badge variant={r.status === 'open' ? 'default' : 'outline'}>{STATUS_LABEL[r.status]}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString('de-DE')}
                    </span>
                    {r.platform && <span className="text-xs text-muted-foreground">· {r.platform}</span>}
                  </div>
                  <p className="text-sm line-clamp-2">{r.message}</p>
                </div>
                <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v as Status)}>
                  <SelectTrigger className="w-32" onClick={(e) => e.stopPropagation()}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Offen</SelectItem>
                    <SelectItem value="read">Gelesen</SelectItem>
                    <SelectItem value="done">Erledigt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Zurück
          </Button>
          <span className="text-xs text-muted-foreground">Seite {page + 1}</span>
          <Button variant="outline" size="sm" disabled={rows.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>
            Weiter
          </Button>
        </div>
      </CardContent>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Feedback-Detail</SheetTitle>
                <SheetDescription>
                  {new Date(selected.created_at).toLocaleString('de-DE')}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{CATEGORY_LABEL[selected.category]}</Badge>
                  <Badge>{STATUS_LABEL[selected.status]}</Badge>
                  {selected.platform && <Badge variant="outline">{selected.platform}</Badge>}
                  {selected.app_version && <Badge variant="outline">v{selected.app_version}</Badge>}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Nachricht</div>
                  <p className="whitespace-pre-wrap text-sm">{selected.message}</p>
                </div>
                {selected.contact_email && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">E-Mail</div>
                    <div className="flex items-center gap-2">
                      <a className="text-sm underline" href={`mailto:${selected.contact_email}`}>
                        {selected.contact_email}
                      </a>
                      <Button variant="ghost" size="icon" onClick={() => copy(selected.contact_email!)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-muted-foreground mb-1">User-ID</div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs">{selected.user_id}</code>
                    <Button variant="ghost" size="icon" onClick={() => copy(selected.user_id)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  {(['open', 'read', 'done'] as Status[]).map((s) => (
                    <Button
                      key={s}
                      variant={selected.status === s ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateStatus(selected.id, s)}
                    >
                      {STATUS_LABEL[s]}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}