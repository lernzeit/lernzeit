import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ArrowLeft, ArrowUp, MessageCircle, Loader2, Lightbulb, Send, Trash2, Plus,
} from 'lucide-react';

type Category = 'learning' | 'ui' | 'parental' | 'gamification' | 'other';
type Status = 'open' | 'planned' | 'in_progress' | 'completed' | 'declined';

interface Idea {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: Category;
  status: Status;
  vote_count: number;
  comment_count: number;
  created_at: string;
  author_name?: string | null;
}

interface Comment {
  id: string;
  idea_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string | null;
}

const CATEGORY_LABEL: Record<Category, string> = {
  learning: 'Lernen',
  ui: 'Bedienung',
  parental: 'Elternbereich',
  gamification: 'Gamification',
  other: 'Sonstiges',
};

const STATUS_LABEL: Record<Status, string> = {
  open: 'Offen',
  planned: 'Geplant',
  in_progress: 'In Arbeit',
  completed: 'Umgesetzt',
  declined: 'Abgelehnt',
};

const STATUS_STYLE: Record<Status, string> = {
  open: 'bg-muted text-foreground',
  planned: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  in_progress: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  declined: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const ideaSchema = z.object({
  title: z.string().trim().min(3, 'Mindestens 3 Zeichen').max(120, 'Maximal 120 Zeichen'),
  description: z.string().trim().min(5, 'Mindestens 5 Zeichen').max(2000, 'Maximal 2000 Zeichen'),
  category: z.enum(['learning', 'ui', 'parental', 'gamification', 'other']),
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function IdeaForum() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<'top' | 'new'>('top');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [isParent, setIsParent] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('learning');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/start');
      return;
    }
    void loadRole();
    void loadIdeas();
  }, [authLoading, user]);

  const loadRole = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    setIsParent(data?.role === 'parent');
  };

  const loadIdeas = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feature_ideas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      // Fetch author names in a second query (profiles is separate)
      const userIds = Array.from(new Set((data ?? []).map((i: any) => i.user_id)));
      const nameMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, name').in('id', userIds);
        (profs ?? []).forEach((p: any) => nameMap.set(p.id, p.name || 'Familie'));
      }

      setIdeas((data ?? []).map((i: any) => ({ ...i, author_name: nameMap.get(i.user_id) ?? 'Familie' })));

      const { data: votes } = await supabase
        .from('feature_idea_votes')
        .select('idea_id')
        .eq('user_id', user.id);
      setMyVotes(new Set((votes ?? []).map((v: any) => v.idea_id)));
    } catch (err: any) {
      toast({ title: 'Fehler', description: err?.message ?? 'Ideen konnten nicht geladen werden.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredSorted = useMemo(() => {
    let list = ideas.slice();
    if (statusFilter !== 'all') list = list.filter((i) => i.status === statusFilter);
    if (categoryFilter !== 'all') list = list.filter((i) => i.category === categoryFilter);
    if (sort === 'top') list.sort((a, b) => b.vote_count - a.vote_count || b.created_at.localeCompare(a.created_at));
    else list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return list;
  }, [ideas, sort, statusFilter, categoryFilter]);

  const toggleVote = async (idea: Idea) => {
    if (!user) return;
    if (!isParent) {
      toast({ title: 'Nur für Eltern', description: 'Voting steht nur Eltern-Accounts zur Verfügung.', variant: 'destructive' });
      return;
    }
    const hasVoted = myVotes.has(idea.id);
    // Optimistic update
    setMyVotes((prev) => {
      const next = new Set(prev);
      if (hasVoted) next.delete(idea.id);
      else next.add(idea.id);
      return next;
    });
    setIdeas((prev) => prev.map((i) => (i.id === idea.id ? { ...i, vote_count: i.vote_count + (hasVoted ? -1 : 1) } : i)));

    if (hasVoted) {
      const { error } = await supabase
        .from('feature_idea_votes')
        .delete()
        .eq('idea_id', idea.id)
        .eq('user_id', user.id);
      if (error) {
        toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
        void loadIdeas();
      }
    } else {
      const { error } = await supabase
        .from('feature_idea_votes')
        .insert({ idea_id: idea.id, user_id: user.id });
      if (error) {
        toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
        void loadIdeas();
      }
    }
  };

  const submitIdea = async () => {
    if (!user) return;
    const parsed = ideaSchema.safeParse({ title: newTitle, description: newDesc, category: newCategory });
    if (!parsed.success) {
      toast({ title: 'Prüfe deine Eingabe', description: parsed.error.issues[0]?.message ?? 'Ungültig', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('feature_ideas').insert({
        user_id: user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
      });
      if (error) throw error;
      toast({ title: 'Idee eingereicht', description: 'Danke, dass du LernZeit mitgestaltest!' });
      setNewTitle('');
      setNewDesc('');
      setNewCategory('learning');
      setCreateOpen(false);
      await loadIdeas();
    } catch (err: any) {
      toast({ title: 'Fehler', description: err?.message ?? 'Konnte nicht gespeichert werden.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteIdea = async (idea: Idea) => {
    if (!user || idea.user_id !== user.id) return;
    if (!confirm('Diese Idee wirklich löschen?')) return;
    const { error } = await supabase.from('feature_ideas').delete().eq('id', idea.id);
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
      return;
    }
    setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
    if (selectedIdea?.id === idea.id) setSelectedIdea(null);
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <Helmet>
        <title>Ideen-Forum – LernZeit</title>
        <meta name="description" content="Reiche Ideen für die Weiterentwicklung von LernZeit ein, stimme über Vorschläge anderer Familien ab und diskutiere gemeinsam." />
      </Helmet>

      <header className="border-b border-border/50 bg-card/50 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-1" />Zurück</Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Ideen-Forum
            </h1>
            <p className="text-xs text-muted-foreground">Community-driven Weiterentwicklung – deine Stimme zählt.</p>
          </div>
          {isParent && (
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" />Neue Idee
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              <Select value={sort} onValueChange={(v) => setSort(v as any)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Beliebteste zuerst</SelectItem>
                  <SelectItem value="new">Neueste zuerst</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  {Object.entries(STATUS_LABEL).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Kategorie" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kategorien</SelectItem>
                  {Object.entries(CATEGORY_LABEL).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : filteredSorted.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Noch keine Ideen. {isParent && 'Sei die erste Stimme!'}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredSorted.map((idea) => {
              const voted = myVotes.has(idea.id);
              return (
                <Card key={idea.id} className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <button
                        onClick={() => toggleVote(idea)}
                        disabled={!isParent}
                        className={`flex flex-col items-center justify-center min-w-[56px] rounded-lg border px-2 py-2 transition-colors ${
                          voted
                            ? 'bg-primary/15 border-primary text-primary'
                            : 'bg-card border-border hover:border-primary/50 hover:text-primary'
                        } ${!isParent ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                        aria-label="Voten"
                      >
                        <ArrowUp className="w-4 h-4" />
                        <span className="text-sm font-semibold mt-0.5">{idea.vote_count}</span>
                      </button>
                      <div className="flex-1 min-w-0">
                        <button
                          className="text-left w-full"
                          onClick={() => setSelectedIdea(idea)}
                        >
                          <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                            {idea.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{idea.description}</p>
                        </button>
                        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                          <Badge variant="outline">{CATEGORY_LABEL[idea.category]}</Badge>
                          <Badge variant="outline" className={STATUS_STYLE[idea.status]}>{STATUS_LABEL[idea.status]}</Badge>
                          <span className="text-muted-foreground">{idea.author_name}</span>
                          <span className="text-muted-foreground">· {formatDate(idea.created_at)}</span>
                          <button
                            onClick={() => setSelectedIdea(idea)}
                            className="flex items-center gap-1 text-muted-foreground hover:text-foreground ml-auto"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            {idea.comment_count}
                          </button>
                          {user?.id === idea.user_id && (
                            <button
                              onClick={() => deleteIdea(idea)}
                              className="text-muted-foreground hover:text-red-400"
                              aria-label="Löschen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Neue Idee einreichen</DialogTitle>
            <DialogDescription>Beschreibe kurz, was LernZeit besser machen könnte.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="idea-title">Titel</Label>
              <Input
                id="idea-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value.slice(0, 120))}
                placeholder="z. B. Wochenrückblick per E-Mail"
                maxLength={120}
              />
              <p className="text-xs text-muted-foreground text-right">{newTitle.length}/120</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="idea-category">Kategorie</Label>
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as Category)}>
                <SelectTrigger id="idea-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABEL).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="idea-desc">Beschreibung</Label>
              <Textarea
                id="idea-desc"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value.slice(0, 2000))}
                placeholder="Warum wäre das nützlich? Für wen?"
                rows={6}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">{newDesc.length}/2000</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Abbrechen</Button>
            <Button onClick={submitIdea} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Einreichen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog with comments */}
      <IdeaDetailDialog
        idea={selectedIdea}
        onClose={() => setSelectedIdea(null)}
        currentUserId={user?.id ?? null}
        isParent={isParent}
        onCommentCountChange={(id, delta) => {
          setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, comment_count: Math.max(0, i.comment_count + delta) } : i)));
          setSelectedIdea((prev) => (prev && prev.id === id ? { ...prev, comment_count: Math.max(0, prev.comment_count + delta) } : prev));
        }}
      />
    </div>
  );
}

/* -------------- Detail dialog -------------- */

function IdeaDetailDialog({
  idea,
  onClose,
  currentUserId,
  isParent,
  onCommentCountChange,
}: {
  idea: Idea | null;
  onClose: () => void;
  currentUserId: string | null;
  isParent: boolean;
  onCommentCountChange: (id: string, delta: number) => void;
}) {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!idea) return;
    void loadComments();
  }, [idea?.id]);

  const loadComments = async () => {
    if (!idea) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feature_idea_comments')
        .select('*')
        .eq('idea_id', idea.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const userIds = Array.from(new Set((data ?? []).map((c: any) => c.user_id)));
      const nameMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, name').in('id', userIds);
        (profs ?? []).forEach((p: any) => nameMap.set(p.id, p.name || 'Familie'));
      }
      setComments((data ?? []).map((c: any) => ({ ...c, author_name: nameMap.get(c.user_id) ?? 'Familie' })));
    } catch (err: any) {
      toast({ title: 'Fehler', description: err?.message ?? 'Kommentare konnten nicht geladen werden.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const post = async () => {
    if (!idea || !currentUserId) return;
    const content = newComment.trim();
    if (content.length < 1 || content.length > 1000) {
      toast({ title: 'Ungültig', description: '1–1000 Zeichen erlaubt.', variant: 'destructive' });
      return;
    }
    if (!isParent) {
      toast({ title: 'Nur für Eltern', description: 'Kommentare stehen nur Eltern-Accounts zur Verfügung.', variant: 'destructive' });
      return;
    }
    setPosting(true);
    try {
      const { data, error } = await supabase
        .from('feature_idea_comments')
        .insert({ idea_id: idea.id, user_id: currentUserId, content })
        .select('*')
        .single();
      if (error) throw error;
      setComments((prev) => [...prev, { ...(data as any), author_name: 'Du' }]);
      setNewComment('');
      onCommentCountChange(idea.id, 1);
    } catch (err: any) {
      toast({ title: 'Fehler', description: err?.message ?? 'Kommentar fehlgeschlagen.', variant: 'destructive' });
    } finally {
      setPosting(false);
    }
  };

  const deleteComment = async (c: Comment) => {
    if (!idea || c.user_id !== currentUserId) return;
    if (!confirm('Kommentar löschen?')) return;
    const { error } = await supabase.from('feature_idea_comments').delete().eq('id', c.id);
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
      return;
    }
    setComments((prev) => prev.filter((x) => x.id !== c.id));
    onCommentCountChange(idea.id, -1);
  };

  return (
    <Dialog open={!!idea} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {idea && (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="outline">{CATEGORY_LABEL[idea.category]}</Badge>
                <Badge variant="outline" className={STATUS_STYLE[idea.status]}>{STATUS_LABEL[idea.status]}</Badge>
                <span className="text-xs text-muted-foreground">von {idea.author_name} · {formatDate(idea.created_at)}</span>
              </div>
              <DialogTitle className="text-xl">{idea.title}</DialogTitle>
              <DialogDescription className="whitespace-pre-wrap text-foreground/80 pt-2">
                {idea.description}
              </DialogDescription>
            </DialogHeader>

            <div className="pt-4 border-t border-border">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Kommentare ({comments.length})
              </h4>

              {loading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Noch keine Kommentare. Sag als Erste:r etwas dazu.</p>
              ) : (
                <div className="space-y-3 mb-4">
                  {comments.map((c) => (
                    <div key={c.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{c.author_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{formatDate(c.created_at)}</span>
                          {c.user_id === currentUserId && (
                            <button onClick={() => deleteComment(c)} className="text-muted-foreground hover:text-red-400" aria-label="Löschen">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {isParent ? (
                <div className="space-y-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value.slice(0, 1000))}
                    placeholder="Schreib einen Kommentar…"
                    rows={3}
                    maxLength={1000}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{newComment.length}/1000</span>
                    <Button size="sm" onClick={post} disabled={posting || newComment.trim().length === 0}>
                      {posting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                      Senden
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Nur Eltern-Accounts können kommentieren.</p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}