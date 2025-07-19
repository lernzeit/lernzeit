import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFamilyLinking } from '@/hooks/useFamilyLinking';
import { ChildManagement } from '@/components/ChildManagement';
import { RefreshCw, Users, Clock, TrendingUp, BookOpen, Plus } from 'lucide-react';

interface ParentDashboardProps {
  userId: string;
}

export function ParentDashboard({ userId }: ParentDashboardProps) {
  const {
    loading,
    linkedChildren,
    invitationCodes,
    loadFamilyData,
  } = useFamilyLinking();

  // Load family data when component mounts
  useEffect(() => {
    console.log('🔄 ParentDashboard: Loading family data for userId:', userId);
    if (userId) {
      loadFamilyData(userId);
    }
  }, [userId, loadFamilyData]);

  // Event handlers
  const handleRefresh = () => {
    loadFamilyData(userId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Familien-Verwaltung</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Kinder nach dem Family Link Prinzip
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Child Management - Family Link Style */}
      <ChildManagement 
        linkedChildren={linkedChildren} 
        parentId={userId}
        onChildUpdate={() => loadFamilyData(userId)}
      />

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-primary" />
            <div className="ml-4">
              <div className="text-2xl font-bold">{linkedChildren.length}</div>
              <div className="text-sm text-muted-foreground">Verknüpfte Kinder</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <BookOpen className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <div className="text-2xl font-bold">Heute aktiv</div>
              <div className="text-sm text-muted-foreground">
                {linkedChildren.length > 0 ? 'Kinder haben gelernt' : 'Keine Aktivität'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}