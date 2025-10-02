import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Settings, 
  BarChart3, 
  Users, 
  FileText, 
  Zap,
  Target,
  TrendingUp,
  CheckCircle,
  LogOut
} from 'lucide-react';
import { QualityDashboard } from './QualityDashboard';
import { QualityMonitoringDashboard } from './QualityMonitoringDashboard';
import { SystematicGenerationControl } from './SystematicGenerationControl';
import { TemplateBankDashboard } from './TemplateBankDashboard';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();
  const navigate = useNavigate();

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
              Systematic Template Generation & Quality Management System
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="w-3 h-3 text-green-600" />
              System Active
            </Badge>
            <Badge variant="secondary">Phase 4 Implementation</Badge>
            <Button 
              variant="default"
              onClick={async () => {
                toast({ title: '🧪 Teste Gemini-Anbindung...', description: 'Generiere 3 Test-Fragen' });
                try {
                  const response = await supabase.functions.invoke('direct-template-generator', {
                    body: { 
                      grade: 3, 
                      domain: 'Zahlen & Operationen', 
                      count: 3 
                    }
                  });
                  
                  if (response.error) throw response.error;
                  
                  const data = response.data;
                  toast({
                    title: '✅ Gemini funktioniert!',
                    description: `${data.generated_count} Fragen generiert, ${data.inserted_count} in DB gespeichert`
                  });
                  console.log('Gemini Test Response:', data);
                } catch (error: any) {
                  console.error('Gemini Test Error:', error);
                  toast({ 
                    title: '❌ Gemini-Test fehlgeschlagen', 
                    description: error.message,
                    variant: 'destructive'
                  });
                }
              }}
              className="flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Test Gemini
            </Button>
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  const response = await supabase.functions.invoke('cleanup-todays-templates', {
                    body: { action: 'analyze', days: 7 }
                  });
                  if (response.data?.analysis) {
                    const analysis = response.data.analysis;
                    toast({
                      title: `Template-Analyse (7 Tage)`,
                      description: `${analysis.total_templates} Templates im Zeitraum. ${analysis.problematic_count} problematisch.`
                    });
                  }
                } catch (error) {
                  toast({ title: 'Fehler bei Analyse', description: error.message });
                }
              }}
              className="flex items-center gap-2"
            >
              <Target className="w-4 h-4" />
              Template Analyse
            </Button>
              <Button 
                variant="destructive"
                onClick={async () => {
                  const input = prompt('Problematische Templates der letzten N Tage löschen. N =', '7');
                  const days = input ? Math.max(1, parseInt(input)) : 1;
                  if (confirm(`Wirklich alle problematischen Templates der letzten ${days} Tage löschen?`)) {
                    try {
                      const response = await supabase.functions.invoke('cleanup-todays-templates', {
                        body: { action: 'cleanup', days }
                      });
                      if (response.data?.cleanup_result) {
                        toast({
                          title: 'Bereinigung abgeschlossen',
                          description: `${response.data.cleanup_result.deleted_count} Templates gelöscht (Zeitraum: ${days} Tage)`
                        });
                      }
                    } catch (error: any) {
                      toast({ title: 'Fehler bei Bereinigung', description: error.message });
                    }
                  }
                }}
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Template Cleanup
              </Button>
            <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Main Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="quality" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Quality Dashboard
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Live Monitoring
            </TabsTrigger>
            <TabsTrigger value="generation" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Generation Control
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Template Bank
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Total Templates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2,847</div>
                  <p className="text-xs text-muted-foreground">+124 this week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Coverage Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">87%</div>
                  <p className="text-xs text-muted-foreground">Curriculum compliance</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Quality Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">8.4/10</div>
                  <p className="text-xs text-muted-foreground">Average quality</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Active Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,234</div>
                  <p className="text-xs text-muted-foreground">Learning this week</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Live Monitoring Tab */}
          <TabsContent value="monitoring">
            <QualityMonitoringDashboard />
          </TabsContent>

          {/* Quality Dashboard Tab */}
          <TabsContent value="quality">
            <QualityDashboard />
          </TabsContent>

          {/* Generation Control Tab */}
          <TabsContent value="generation">
            <SystematicGenerationControl />
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