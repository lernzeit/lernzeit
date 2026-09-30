import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { GraduationCap, Save } from 'lucide-react';

interface Child {
  id: string;
  name: string;
  grade: number;
}

interface GradeManagementProps {
  linkedChildren: Child[];
  onGradeUpdate: () => void;
}

export function GradeManagement({ linkedChildren, onGradeUpdate }: GradeManagementProps) {
  const [gradeUpdates, setGradeUpdates] = useState<{ [childId: string]: number }>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleGradeChange = (childId: string, newGrade: number) => {
    setGradeUpdates(prev => ({
      ...prev,
      [childId]: newGrade
    }));
  };

  const saveGradeUpdates = async () => {
    if (Object.keys(gradeUpdates).length === 0) {
      toast({
        title: "Keine Änderungen",
        description: "Es wurden keine Klassenänderungen vorgenommen.",
      });
      return;
    }

    try {
      setSaving(true);
      
      for (const [childId, newGrade] of Object.entries(gradeUpdates)) {
        const { error } = await supabase
          .from('profiles')
          .update({ grade: newGrade })
          .eq('id', childId);

        if (error) throw error;
      }

      toast({
        title: "Klassen aktualisiert",
        description: "Die Klasseninformationen wurden erfolgreich gespeichert.",
      });

      setGradeUpdates({});
      onGradeUpdate();
    } catch (error: any) {
      console.error('Fehler beim Aktualisieren der Klassen:', error);
      toast({
        title: "Fehler",
        description: "Die Klassen konnten nicht aktualisiert werden.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getDisplayGrade = (child: Child) => {
    return gradeUpdates[child.id] ?? child.grade;
  };

  const hasChanges = Object.keys(gradeUpdates).length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Klassenmanagement
        </CardTitle>
        <CardDescription>
          Verwalte die Klassenstufen deiner verknüpften Kinder
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {linkedChildren.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Keine verknüpften Kinder gefunden.
          </p>
        ) : (
          <>
            <div className="space-y-4">
              {linkedChildren.map((child) => {
                const currentGrade = getDisplayGrade(child);
                const hasChanged = gradeUpdates[child.id] !== undefined;
                
                return (
                  <div key={child.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">{child.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Aktuelle Klasse: {child.grade}
                        </div>
                      </div>
                      {hasChanged && (
                        <Badge variant="secondary">Geändert</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Select
                        value={currentGrade.toString()}
                        onValueChange={(value) => handleGradeChange(child.id, parseInt(value))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Klasse" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                            <SelectItem key={grade} value={grade.toString()}>
                              Klasse {grade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasChanges && (
              <div className="flex justify-end pt-4 border-t">
                <Button 
                  onClick={saveGradeUpdates} 
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Save className="h-4 w-4 mr-2 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Änderungen speichern
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <GraduationCap className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Automatischer Klassenwechsel</h4>
                  <p className="text-sm text-blue-800 mt-1">
                    Am 1. August jeden Jahres werden alle Kinder automatisch in die nächste Klasse versetzt.
                    Kinder in Klasse 12 bleiben in Klasse 12.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}