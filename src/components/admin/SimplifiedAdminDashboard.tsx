import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTopics } from '@/hooks/useTopics';
import { useGenerateQuestions } from '@/hooks/useQuestions';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export const SimplifiedAdminDashboard = () => {
  const { topics, isLoading: topicsLoading } = useTopics();
  const { generateQuestions, isGenerating } = useGenerateQuestions();
  
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [questionCount, setQuestionCount] = useState<number>(10);

  const handleGenerate = async () => {
    if (!selectedTopic) {
      toast.error('Bitte wähle ein Thema aus');
      return;
    }

    try {
      const result = await generateQuestions(selectedTopic, questionCount);
      toast.success(`${result.generated_count} Fragen wurden erstellt!`);
    } catch (error) {
      toast.error('Fehler beim Erstellen der Fragen');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Verwalte Themen und generiere Fragen mit KI
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fragen generieren</CardTitle>
          <CardDescription>
            Wähle ein Thema und generiere neue Fragen mit KI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Thema</label>
              <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                <SelectTrigger>
                  <SelectValue placeholder="Thema wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {topicsLoading ? (
                    <SelectItem value="loading" disabled>
                      Lade Themen...
                    </SelectItem>
                  ) : (
                    topics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        Klasse {topic.grade} - {topic.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Anzahl Fragen</label>
              <Input
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                min={1}
                max={50}
              />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedTopic}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generiere Fragen...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Fragen generieren
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verfügbare Themen</CardTitle>
          <CardDescription>
            {topics.length} Themen in der Datenbank
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topicsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              topics.map((topic) => (
                <div
                  key={topic.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{topic.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Klasse {topic.grade} - {topic.subject}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTopic(topic.id)}
                  >
                    Auswählen
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
