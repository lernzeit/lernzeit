import React, { useState } from 'react';
import { RealtimeQuestionGame } from '@/components/RealtimeQuestionGame';
import { useTopics } from '@/hooks/useTopics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export const RealtimeGameExample = () => {
  const [selectedGrade, setSelectedGrade] = useState<number>(1);
  const { topics, isLoading: topicsLoading } = useTopics(selectedGrade, 'math');
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const handleCorrectAnswer = () => {
    setScore(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }));
  };

  const handleWrongAnswer = () => {
    setScore(prev => ({ ...prev, total: prev.total + 1 }));
  };

  if (!selectedTopic) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Echtzeit-Fragen Spiel</h1>
          <p className="text-muted-foreground mt-2">
            Wähle ein Thema und die KI generiert Fragen in Echtzeit!
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Thema auswählen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Klassenstufe</label>
              <Select
                value={selectedGrade.toString()}
                onValueChange={(val) => {
                  setSelectedGrade(Number(val));
                  setSelectedTopic(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(grade => (
                    <SelectItem key={grade} value={grade.toString()}>
                      Klasse {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Thema</label>
              {topicsLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {topics.map(topic => (
                    <Button
                      key={topic.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setSelectedTopic(topic)}
                    >
                      {topic.title}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{selectedTopic.title}</h1>
          <p className="text-muted-foreground mt-1">
            Klasse {selectedGrade} • Mathematik
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{score.correct} / {score.total}</p>
          <p className="text-sm text-muted-foreground">Richtig beantwortet</p>
        </div>
      </div>

      <Button
        variant="outline"
        onClick={() => setSelectedTopic(null)}
      >
        ← Thema wechseln
      </Button>

      <RealtimeQuestionGame
        topic_id={selectedTopic.id}
        grade={selectedGrade}
        subject="math"
        topic_title={selectedTopic.title}
        onCorrectAnswer={handleCorrectAnswer}
        onWrongAnswer={handleWrongAnswer}
      />
    </div>
  );
};
