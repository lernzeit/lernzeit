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
    recentGenerated: 0
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: templates } = await supabase
        .from('templates')
        .select('quality_score, created_at, status')
        .eq('status', 'ACTIVE');

      if (templates) {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentCount = templates.filter(t => 
          new Date(t.created_at) > weekAgo
        ).length;

        const avgQuality = templates.length > 0
          ? templates.reduce((sum, t) => sum + (t.quality_score || 0), 0) / templates.length
          : 0;

        setStats({
          totalTemplates: templates.length,
          activeTemplates: templates.length,
          avgQuality,
          recentGenerated: recentCount
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Template Management & Quality Control
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Main Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Übersicht
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Template Management
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Aktive Templates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeTemplates.toLocaleString('de-DE')}</div>
                  <p className="text-xs text-muted-foreground">+{stats.recentGenerated} diese Woche</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Durchschn. Qualität
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {(stats.avgQuality * 100).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">Template Quality Score</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Stündliche Generation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Aktiv</div>
                  <p className="text-xs text-muted-foreground">5 Templates pro Stunde</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Gesamt Erstellungen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTemplates.toLocaleString('de-DE')}</div>
                  <p className="text-xs text-muted-foreground">Alle Templates</p>
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