import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, Award } from 'lucide-react';

interface GradeSelectorProps {
  onSelectGrade: (grade: number) => void;
}

const grades = [
  { grade: 1, label: 'Klasse 1', description: 'Zahlen 1-10, Addition & Subtraktion', icon: '🌟' },
  { grade: 2, label: 'Klasse 2', description: 'Zahlen 1-100, Einmaleins Basics', icon: '🎈' },
  { grade: 3, label: 'Klasse 3', description: 'Einmaleins, Division, Geometrie', icon: '🚀' },
  { grade: 4, label: 'Klasse 4', description: 'Größere Zahlen, Brüche Grundlagen', icon: '⭐' },
  { grade: 5, label: 'Klasse 5', description: 'Dezimalzahlen, Prozente', icon: '🎯' },
  { grade: 6, label: 'Klasse 6', description: 'Negative Zahlen, Algebra Basics', icon: '🏆' },
  { grade: 7, label: 'Klasse 7', description: 'Gleichungen, Winkel, Flächen', icon: '💎' },
  { grade: 8, label: 'Klasse 8', description: 'Terme, Funktionen, Pythagoras', icon: '🔥' },
  { grade: 9, label: 'Klasse 9', description: 'Quadratische Funktionen, Körper', icon: '⚡' },
  { grade: 10, label: 'Klasse 10', description: 'Trigonometrie, Exponentialfunktionen', icon: '🌟' },
];

export function GradeSelector({ onSelectGrade }: GradeSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-bg py-4">
      <div className="page-container">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            MathTime 📱⏰
          </h1>
          <p className="text-lg text-muted-foreground mb-2">
            Löse Lernaufgaben und verdiene Handyzeit!
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>Lerne spielerisch</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-secondary" />
              <span>Verdiene Belohnungen</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" />
              <span>Altersgerecht</span>
            </div>
          </div>
        </div>

        <Card className="mb-8 shadow-card">
          <CardHeader>
            <CardTitle className="text-center text-xl">Wähle deine Klassenstufe</CardTitle>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {grades.map((gradeInfo) => (
            <Card 
              key={gradeInfo.grade} 
              className="hover:shadow-card transition-all duration-300 hover:scale-105 cursor-pointer group"
              onClick={() => onSelectGrade(gradeInfo.grade)}
            >
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-3 group-hover:animate-bounce-gentle">
                  {gradeInfo.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  {gradeInfo.label}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {gradeInfo.description}
                </p>
                <Button variant="game" className="w-full">
                  Auswählen
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Card className="max-w-lg mx-auto shadow-card">
            <CardContent className="p-6">
              <div className="text-2xl mb-2">🎮</div>
              <h3 className="font-semibold mb-2">Wie funktioniert's?</h3>
              <p className="text-sm text-muted-foreground">
                Löse 5 Aufgaben korrekt und erhalte 15 Minuten zusätzliche Handyzeit!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}