import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Award, Users } from 'lucide-react';

interface GradeSelectorProps {
  onSelectGrade: (grade: number) => void;
}

const grades = [
  { grade: 1, label: 'Klasse 1', description: 'Zahlen 1-10, Plus & Minus', icon: '🌟' },
  { grade: 2, label: 'Klasse 2', description: 'Zahlen 1-100, Einmaleins', icon: '🎈' },
  { grade: 3, label: 'Klasse 3', description: 'Einmaleins, Division', icon: '🚀' },
  { grade: 4, label: 'Klasse 4', description: 'Große Zahlen, Brüche', icon: '⭐' },
  { grade: 5, label: 'Klasse 5', description: 'Dezimalzahlen, Prozente', icon: '🎯' },
  { grade: 6, label: 'Klasse 6', description: 'Negative Zahlen, Algebra', icon: '🏆' },
  { grade: 7, label: 'Klasse 7', description: 'Gleichungen, Winkel', icon: '💎' },
  { grade: 8, label: 'Klasse 8', description: 'Terme, Funktionen', icon: '🔥' },
  { grade: 9, label: 'Klasse 9', description: 'Quadratische Funktionen', icon: '⚡' },
  { grade: 10, label: 'Klasse 10', description: 'Trigonometrie, Exponential', icon: '🌟' },
];

const youngGrades = grades.filter((g) => g.grade <= 4);
const teenGrades = grades.filter((g) => g.grade >= 5);

export function GradeSelector({ onSelectGrade }: GradeSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-bg py-4 pt-safe-top pb-safe-bottom">
      <div className="page-container">
        {/* Header */}
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

        {/* === Grundschule (1–4): big, colorful, emoji-first === */}
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-1 text-center">🏫 Grundschule</h2>
          <p className="text-sm text-muted-foreground text-center mb-4">Klasse 1 – 4</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {youngGrades.map((g) => (
              <Card
                key={g.grade}
                className="rounded-2xl border-2 shadow-lg hover:scale-105 cursor-pointer transition-all duration-300 group"
                onClick={() => onSelectGrade(g.grade)}
              >
                <CardContent className="p-6 text-center">
                  <div className="text-5xl mb-3 group-hover:animate-bounce-gentle">{g.icon}</div>
                  <h3 className="text-xl font-bold mb-1 text-foreground">{g.label}</h3>
                  <Button variant="game" size="lg" className="w-full mt-2">
                    Los geht's!
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* === Weiterführende Schule (5–10): compact, modern === */}
        <div>
          <h2 className="text-xl font-bold mb-1 text-center">🎓 Weiterführende Schule</h2>
          <p className="text-sm text-muted-foreground text-center mb-4">Klasse 5 – 10</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {teenGrades.map((g) => (
              <Card
                key={g.grade}
                className="rounded-lg shadow-card hover:scale-[1.02] cursor-pointer transition-all duration-200 group"
                onClick={() => onSelectGrade(g.grade)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <span className="text-2xl">{g.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-foreground">{g.label}</h3>
                    <p className="text-xs text-muted-foreground truncate">{g.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Bottom info */}
        <div className="mt-8 text-center">
          <Card className="max-w-lg mx-auto shadow-card">
            <CardContent className="p-6">
              <div className="text-2xl mb-2">🎮</div>
              <h3 className="font-semibold mb-2">Wie funktioniert's?</h3>
              <p className="text-sm text-muted-foreground">
                Löse Aufgaben korrekt und erhalte zusätzliche Handyzeit!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
