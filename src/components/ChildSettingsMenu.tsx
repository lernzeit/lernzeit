
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Settings, 
  LogOut, 
  Users, 
  Shield, 
  Clock, 
  ArrowLeft,
  User,
  Trophy,
  Star,
  Target,
  Check,
  X,
  AlertCircle,
  Loader2,
  Bell
, ChevronRight } from 'lucide-react';
import { ChildLinking } from '@/components/ChildLinking';
import { ScreenTimeWidget } from '@/components/ScreenTimeWidget';
import { ScreenTimeTestPanel } from '@/components/screenTime/ScreenTimeTestPanel';
import { ScreenTimeSetup } from '@/components/screenTime/ScreenTimeSetup';
import { ScreenTimeRequestWidget } from '@/components/ScreenTimeRequestWidget';
import { supabase } from '@/lib/supabase';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';
import { useChildSettings } from '@/hooks/useChildSettings';
import { useAchievements } from '@/hooks/useAchievements';
import { AchievementDisplay } from '@/components/AchievementDisplay';
import { AccountDeleteSection } from '@/components/AccountDeleteSection';
import { NotificationSettings } from '@/components/NotificationSettings';
import { unregisterPushDevice } from '@/hooks/useOneSignal';

interface ChildSettingsMenuProps {
  user: any;
  profile: any;
  onSignOut: () => void;
  onBack: () => void;
  initialSection?: string; // Add optional initial section parameter
}

interface ParentInfo {
  id: string;
  name: string;
  email: string;
  role?: string;
  displayName?: string;
}

export function ChildSettingsMenu({ user, profile, onSignOut, onBack, initialSection }: ChildSettingsMenuProps) {
  const istAndroid = Capacitor.getPlatform() === 'android';
  const [activeSection, setActiveSection] = useState<string | null>(initialSection || null);
  const [parentInfoList, setParentInfoList] = useState<ParentInfo[]>([]);
  const [loadingParentInfo, setLoadingParentInfo] = useState(true);
  const [checkingRelationship, setCheckingRelationship] = useState(false);
  const { toast } = useToast();
  
  // Use the existing useChildSettings hook 
  const { settings, loading: settingsLoading } = useChildSettings(user?.id || '');
  const { userAchievements, getCompletedAchievements, getTotalRewardMinutes, loading: achievementsLoading } = useAchievements(user?.id);

  useEffect(() => {
    console.log('🔍 ChildSettingsMenu useEffect triggered:', { 
      userId: user?.id, 
      settingsLoading, 
      userRole: user?.role || 'unknown' 
    });
    
    if (user?.id && !settingsLoading) {
      loadParentInfo();
    }
  }, [user?.id, settingsLoading]);

  const loadParentInfo = async () => {
    if (!user?.id) {
      console.log('❌ No user ID provided');
      setLoadingParentInfo(false);
      setParentInfoList([]);
      return;
    }
    
    setLoadingParentInfo(true);
    console.log('🔍 Loading parent info for child:', user.id);
    
    try {
      // Get ALL parent-child relationships
      const { data: relationships, error: relationshipError } = await supabase
        .from('parent_child_relationships')
        .select('parent_id')
        .eq('child_id', user.id);

      console.log('👥 Relationships query result:', { relationships, relationshipError });

      if (relationshipError) {
        console.error('❌ Error fetching relationships:', relationshipError);
        setParentInfoList([]);
        return;
      }

      if (relationships && relationships.length > 0) {
        const parentIds = relationships.map(r => r.parent_id).filter(Boolean) as string[];
        console.log('✅ Found parent relationships:', parentIds);
        
        // Load all parent profiles
        const { data: parentProfiles, error: parentError } = await supabase
          .from('profiles')
          .select('id, name, role')
          .in('id', parentIds);

        console.log('👨‍👩‍👧‍👦 Parent profiles query result:', { parentProfiles, parentError });

        if (parentProfiles && !parentError) {
          const parents: ParentInfo[] = parentProfiles.map(p => ({
            id: p.id,
            name: p.name || 'Elternteil',
            email: '',
            role: p.role || 'parent',
            displayName: p.name || 'Elternteil'
          }));
          console.log('✅ Setting parent info list:', parents);
          setParentInfoList(parents);
        } else {
          console.error('❌ Error fetching parent profiles:', parentError);
          // Fallback with IDs only
          setParentInfoList(parentIds.map(id => ({
            id,
            name: 'Elternteil',
            email: ''
          })));
        }
      } else {
        console.log('❌ No parent relationships found');
        setParentInfoList([]);
      }
    } catch (error) {
      console.error('❌ Unexpected error in loadParentInfo:', error);
      setParentInfoList([]);
      
      toast({
        title: "Fehler",
        description: "Verbindungsstatus konnte nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoadingParentInfo(false);
    }
  };

  // Determine if there's a parent link based on parentInfoList
  const hasParentLink = parentInfoList.length > 0;

  const handleUnlinkParent = async (parentId: string) => {
    if (!user?.id) return;
    
    try {
      console.log('🔥 Unlinking parent:', parentId, 'from child:', user.id);
      
      const { error } = await supabase
        .from('parent_child_relationships')
        .delete()
        .eq('child_id', user.id)
        .eq('parent_id', parentId);

      if (error) {
        console.error('❌ Error unlinking parent:', error);
        throw error;
      }

      console.log('✅ Successfully unlinked parent');
      setParentInfoList(prev => prev.filter(p => p.id !== parentId));
      
      toast({
        title: "Verknüpfung entfernt",
        description: "Die Verbindung wurde getrennt.",
      });
    } catch (error: any) {
      console.error('❌ Error in handleUnlinkParent:', error);
      toast({
        title: "Fehler",
        description: "Verknüpfung konnte nicht entfernt werden.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await unregisterPushDevice(user?.id);
    await supabase.auth.signOut();
    onSignOut();
  };

  const refreshParentLink = async () => {
    setCheckingRelationship(true);
    await loadParentInfo();
    setCheckingRelationship(false);
  };

  const menuItems = [
    {
      id: 'profile',
      title: 'Mein Profil',
      description: 'Deine Kontoinformationen',
      icon: User,
      color: 'text-primary',
      gradient: 'from-blue-500 to-purple-600'
    },
    {
      id: 'screen-time',
      title: 'Bildschirmzeit',
      description: 'Sieh deine verfügbare Zeit',
      icon: Clock,
      color: 'text-green-600',
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      id: 'family',
      title: 'Eltern-Verknüpfung',
      description: (settingsLoading || loadingParentInfo) ? 'Lade Status...' : (hasParentLink ? 'Verwalte deine Eltern-Verbindung' : 'Verbinde dein Konto mit deinen Eltern'),
      icon: Users,
      color: 'text-orange-600',
      gradient: 'from-orange-500 to-red-600'
    },
    {
      id: 'achievements',
      title: 'Erfolge',
      description: 'Deine Lernfortschritte',
      icon: Trophy,
      color: 'text-yellow-600',
      gradient: 'from-yellow-500 to-orange-600'
    }
  ];

  if (activeSection) {
    return (
        <div className="min-h-screen bg-gradient-bg py-4 pt-safe-top pb-safe-bottom px-safe">
          <div className="mx-auto w-full max-w-xl px-4 pt-4 pb-10">
          <Button
            variant="ghost"
            onClick={() => setActiveSection(null)}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Einstellungen
          </Button>
          
          {activeSection === 'family' && (
            <>
              {settingsLoading || loadingParentInfo ? (
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      Eltern-Verknüpfung
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      <div>
                        <div className="font-medium text-blue-800">Lade Informationen...</div>
                        <div className="text-sm text-blue-600">Verbindung wird überprüft</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : hasParentLink ? (
                <div className="space-y-6">
                  {/* Current Parent Links Display */}
                  <Card className="shadow-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        Aktuelle Verknüpfungen ({parentInfoList.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {parentInfoList.map((parent) => (
                        <div key={parent.id} className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <Check className="w-6 h-6 text-green-600 shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium text-green-800">
                              Verknüpft mit: <span className="font-semibold">{parent.displayName || parent.name}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                            onClick={() => handleUnlinkParent(parent.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <div className="space-y-3">
                        <h4 className="font-medium">Was bedeutet das?</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Deine Eltern können deine Lernfortschritte sehen</li>
                          <li>• Sie können deine Bildschirmzeit verwalten</li>
                          <li>• Du bekommst automatisch Zeit für gelöste Aufgaben</li>
                          <li>• Deine Eltern können Einstellungen anpassen</li>
                        </ul>
                      </div>
                      
                      <Button 
                        onClick={refreshParentLink}
                        variant="outline"
                        className="w-full"
                        disabled={checkingRelationship}
                      >
                        {checkingRelationship ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Überprüfe...
                          </>
                        ) : (
                          'Status aktualisieren'
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Multiple Parent Support */}
                  <Card className="shadow-card">
                    <CardHeader>
                      <CardTitle className="text-lg">Weitere Eltern hinzufügen</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Du kannst dich mit mehreren Erziehungsberechtigten verknüpfen
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div className="space-y-2">
                            <h4 className="font-medium text-blue-900">Mehrere Verknüpfungen</h4>
                            <p className="text-sm text-blue-800">
                              Du kannst dich mit mehreren Erziehungsberechtigten verknüpfen. 
                              Alle können dann deine Fortschritte sehen und Einstellungen verwalten.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <ChildLinking 
                        userId={user.id} 
                        onLinked={() => {
                          console.log('✅ Additional parent linked successfully');
                          loadParentInfo();
                          setActiveSection(null);
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <ChildLinking 
                  userId={user.id} 
                  onLinked={() => {
                    console.log('✅ Child linked successfully, refreshing parent info');
                    loadParentInfo();
                    setActiveSection(null);
                  }}
                />
              )}
            </>
          )}
          
          {activeSection === 'screen-time' && (
            <>
              <ScreenTimeWidget />
              <ScreenTimeRequestWidget userId={user.id} role="child" />
              {/*
                Einrichtung der Geraetesperre. Sie steht hier auf dem Geraet des
                KINDES, weil ein ApplicationToken geraetegebunden ist — welche
                Apps gesperrt werden, laesst sich nur dort auswaehlen, wo sie
                liegen. Ein Schalter im Eltern-Dashboard koennte technisch
                nichts bewirken.
                Die Aenderungen selbst sind hinter der Eltern-Huerde
                (ParentGate): Apple fragt nur beim ERSTEN Zustimmen nach der
                Bildschirmzeit-Kennung, danach nie wieder.
              */}
              {/* Auf Android gibt es keine Geraetesperre (Family Link bietet
                  Dritten keine Schnittstelle). Statt einer Karte, die nur
                  erklaert, dass es nicht geht, dort gar nichts. */}
              {!istAndroid && <ScreenTimeSetup childId={user.id} />}
              {/*
                Werkbank mit den Einzelschritten — nur zur Fehlersuche, hinter
                einer Build-Variablen. Zum Erproben VITE_SCREENTIME_UI=1 setzen:
                lokal in .env.local, fuer einen Testbuild in den
                Codemagic-Umgebungsvariablen. NICHT in codemagic.yaml — dort
                stand sie frueher fest und waere irgendwann in den Store
                gegangen.
              */}
              {!istAndroid && import.meta.env.VITE_SCREENTIME_UI === '1' && <ScreenTimeTestPanel />}
            </>
          )}
          
          {activeSection === 'profile' && (
            <>
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    Mein Profil
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">E-Mail:</span>
                      <span className="text-sm font-medium">{user.email}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="text-sm font-medium">{profile?.name || 'Nicht gesetzt'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">Klassenstufe:</span>
                      <span className="text-sm font-medium">Klasse {profile?.grade || 1}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="text-sm font-medium">
                        {loadingParentInfo ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Prüfe...
                          </span>
                        ) : hasParentLink ? (
                          `Mit ${parentInfoList.map(p => p.name).join(', ')} verbunden` 
                        ) : (
                          'Noch nicht mit Eltern verbunden'
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground text-center">
                      Klassenstufe kann nur von Eltern geändert werden
                    </p>
                  </div>
                </CardContent>
              </Card>

              <AccountDeleteSection
                onDeleted={() => window.location.href = '/'}
              />
            </>
          )}
          
          {activeSection === 'achievements' && (
            <AchievementDisplay userId={user.id} variant="full" />
          )}

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background pt-safe-top pb-safe-bottom px-safe">
      <div className="mx-auto w-full max-w-xl space-y-6 px-4 pb-10 pt-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Zurück">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-extrabold">Einstellungen</h1>
        </div>

        <ul className="divide-y divide-karo rounded-[20px] bg-card ring-1 ring-inset ring-karo">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <li key={item.id}>
                <button type="button" onClick={() => setActiveSection(item.id)} className="flex w-full items-center gap-4 px-4 py-4 text-left">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <IconComponent className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-tinte">{item.title}</span>
                    <span className="block text-sm text-muted-foreground">{item.description}</span>
                    {item.id === 'family' && hasParentLink && !loadingParentInfo && (
                      <span className="mt-0.5 flex items-center gap-1 text-xs font-bold text-gruen-text">
                        <Check className="h-3 w-3" /> Verbunden
                      </span>
                    )}
                  </span>
                  {item.id === 'family' && loadingParentInfo ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <Button variant="outline" onClick={handleSignOut} className="w-full" size="lg">
          <LogOut className="h-5 w-5" />
          Abmelden
        </Button>
      </div>
    </div>
  );
}
