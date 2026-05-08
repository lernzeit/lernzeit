import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  Database, 
  Zap,
  TrendingUp,
  LogOut,
  KeyRound,
  Loader2,
  Cpu,
  Activity,
  FlaskConical
} from 'lucide-react';
import { ApiStatusPanel } from './ApiStatusPanel';
import { CacheGroupItem } from './CacheGroupItem';
import { PromptRulesPanel } from './PromptRulesPanel';
import { AIModelConfigPanel } from './AIModelConfigPanel';
import { AIModelMetricsPanel } from './AIModelMetricsPanel';
import { AIModelPlayground } from './AIModelPlayground';

interface CacheStats {
  totalCached: number;
  uniqueCombinations: number;
  avgTimesServed: number;
  addedThisWeek: number;
}

interface CombinationStat {
  grade: number;
  subject: string;
  count: number;
  avg_served: number;
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    totalCached: 0,
    uniqueCombinations: 0,
    avgTimesServed: 0,
    addedThisWeek: 0
  });
  const [combinationStats, setCombinationStats] = useState<CombinationStat[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [{ data: cacheStatsData }, { count: recentCount }] = await Promise.all([
        supabase.rpc('get_cache_stats'),
        supabase.from('ai_question_cache').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo)
      ]);

      if (cacheStatsData && Array.isArray(cacheStatsData)) {
        const totalCached = cacheStatsData.reduce((sum, row) => sum + Number(row.total_questions), 0);
        const totalServed = cacheStatsData.reduce((sum, row) => sum + Number(row.avg_times_served) * Number(row.total_questions), 0);
        const avgTimesServed = totalCached > 0 ? totalServed / totalCached : 0;

        const combinationList: CombinationStat[] = cacheStatsData
          .map(row => ({
            grade: row.grade,
            subject: row.subject,
            count: Number(row.total_questions),
            avg_served: Math.round(Number(row.avg_times_served) * 10) / 10
          }))
          .sort((a, b) => b.count - a.count);

        setCacheStats({
          totalCached,
          uniqueCombinations: cacheStatsData.length,
          avgTimesServed: Math.round(avgTimesServed * 10) / 10,
          addedThisWeek: recentCount || 0
        });
        setCombinationStats(combinationList);
      }
    } catch (error) {
      console.error('Error loading cache stats:', error);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: 'Abmeldung fehlgeschlagen', description: error.message });
    } else {
      toast({ title: 'Abgemeldet' });
      navigate('/');
    }
  };

  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPw, setIsChangingPw] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: 'Fehler', description: 'Mindestens 8 Zeichen erforderlich.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Fehler', description: 'Passwörter stimmen nicht überein.', variant: 'destructive' });
      return;
    }
    setIsChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsChangingPw(false);
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Passwort geändert', description: 'Dein Passwort wurde erfolgreich aktualisiert.' });
      setNewPassword('');
      setConfirmPassword('');
      setPwDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              KI-System & Cache-Übersicht
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 flex-1 sm:flex-initial">
                  <KeyRound className="w-4 h-4" />
                  Passwort
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Passwort ändern</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <Input
                    type="password"
                    placeholder="Neues Passwort (min. 8 Zeichen)"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Passwort bestätigen"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                  <Button
                    onClick={handleChangePassword}
                    disabled={isChangingPw || !newPassword || !confirmPassword}
                    className="w-full"
                  >
                    {isChangingPw ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Passwort ändern
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2 flex-1 sm:flex-initial">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Main Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2 text-xs sm:text-sm py-2">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              Übersicht
            </TabsTrigger>
            <TabsTrigger value="cache" className="flex items-center gap-2 text-xs sm:text-sm py-2">
              <Database className="w-3 h-3 sm:w-4 sm:h-4" />
              Cache
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2 text-xs sm:text-sm py-2">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
              Regeln
            </TabsTrigger>
            <TabsTrigger value="ai-models" className="flex items-center gap-2 text-xs sm:text-sm py-2">
              <Cpu className="w-3 h-3 sm:w-4 sm:h-4" />
              KI-Modelle
            </TabsTrigger>
            <TabsTrigger value="ai-metrics" className="flex items-center gap-2 text-xs sm:text-sm py-2">
              <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
              Metriken
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                    <Database className="w-3 h-3 sm:w-4 sm:h-4" />
                    Fragen im Cache
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{cacheStats.totalCached.toLocaleString('de-DE')}</div>
                  <p className="text-xs text-muted-foreground">+{cacheStats.addedThisWeek} diese Woche</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                    Kombinationen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{cacheStats.uniqueCombinations}</div>
                  <p className="text-xs text-muted-foreground">Klasse × Fach</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                    Ø Nutzungen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{cacheStats.avgTimesServed}×</div>
                  <p className="text-xs text-muted-foreground">pro gecachter Frage</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                    <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                    KI-System
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">Aktiv</div>
                  <p className="text-xs text-muted-foreground">Gemini 3 Flash</p>
                </CardContent>
              </Card>
            </div>

            <ApiStatusPanel />
          </TabsContent>

          {/* Cache Tab */}
          <TabsContent value="cache" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Cache-Verteilung nach Klasse & Fach
                </CardTitle>
              </CardHeader>
              <CardContent>
                {combinationStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Noch keine Fragen im Cache. Der Cache füllt sich automatisch wenn Nutzer spielen.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {combinationStats.map((stat, i) => (
                      <CacheGroupItem
                        key={i}
                        grade={stat.grade}
                        subject={stat.subject}
                        count={stat.count}
                        avgServed={stat.avg_served}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          {/* Prompt Rules Tab */}
          <TabsContent value="rules" className="space-y-4">
            <PromptRulesPanel />
          </TabsContent>
          <TabsContent value="ai-models" className="space-y-4">
            <AIModelConfigPanel />
          </TabsContent>
          <TabsContent value="ai-metrics" className="space-y-4">
            <AIModelMetricsPanel />
          </TabsContent>
          <TabsContent value="ai-playground" className="space-y-4">
            <AIModelPlayground />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
