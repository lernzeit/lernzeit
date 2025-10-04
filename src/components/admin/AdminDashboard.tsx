import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  FileText, 
  Zap,
  Target,
  LogOut
} from 'lucide-react';
import { ApiStatusPanel } from './ApiStatusPanel';
import { TemplateBankDashboard } from './TemplateBankDashboard';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalTemplates: 0,
    activeTemplates: 0,
    avgQuality: 0,
    recentGenerated: 0,
    cronJobActive: false,
    hoursSinceLastGeneration: 0
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Load all templates
      const { data: allTemplates } = await supabase
        .from('templates')
        .select('quality_score, created_at, status');

      // Load active templates
      const { data: activeTemplates } = await supabase
        .from('templates')
        .select('quality_score, created_at')
        .eq('status', 'ACTIVE');

      if (allTemplates && activeTemplates) {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentCount = activeTemplates.filter(t => 
          new Date(t.created_at) > weekAgo
        ).length;

        const avgQuality = activeTemplates.length > 0
          ? activeTemplates.reduce((sum, t) => sum + (t.quality_score || 0), 0) / activeTemplates.length
          : 0;

        // Check cron job status
        const lastCreated = activeTemplates[0]?.created_at;
        const hoursSinceLastCreation = lastCreated 
          ? (Date.now() - new Date(lastCreated).getTime()) / 1000 / 60 / 60
          : 999;

        setStats({
          totalTemplates: allTemplates.length,
          activeTemplates: activeTemplates.length,
          avgQuality,
          recentGenerated: recentCount,
          cronJobActive: hoursSinceLastCreation < 2,
          hoursSinceLastGeneration: Math.round(hoursSinceLastCreation * 10) / 10
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
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
  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Template Management & Quality Control
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2 w-full sm:w-auto">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Main Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2 text-xs sm:text-sm py-2">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Übersicht</span>
              <span className="xs:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2 text-xs sm:text-sm py-2">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Template Management</span>
              <span className="xs:hidden">Templates</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                    <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                    Aktive Templates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{stats.activeTemplates.toLocaleString('de-DE')}</div>
                  <p className="text-xs text-muted-foreground">+{stats.recentGenerated} diese Woche</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                    <Target className="w-3 h-3 sm:w-4 sm:h-4" />
                    Durchschn. Qualität
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">
                    {(stats.avgQuality * 100).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">Template Quality Score</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                    <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                    Cron Job Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-xl sm:text-2xl font-bold ${stats.cronJobActive ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.cronJobActive ? 'Aktiv' : 'Inaktiv'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.cronJobActive 
                      ? `Letzte Gen.: vor ${stats.hoursSinceLastGeneration}h` 
                      : `Inaktiv seit ${stats.hoursSinceLastGeneration}h`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                    Gesamt Templates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{stats.totalTemplates.toLocaleString('de-DE')}</div>
                  <p className="text-xs text-muted-foreground">Aktiv + Inaktiv</p>
                </CardContent>
              </Card>
            </div>

            <ApiStatusPanel />
          </TabsContent>

          {/* Template Bank Tab */}
          <TabsContent value="templates">
            <TemplateBankDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}