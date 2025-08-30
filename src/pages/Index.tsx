import React, { useState } from 'react';
import { GradeSelector } from '@/components/GradeSelector';
import { CategorySelector } from '@/components/CategorySelector';
import { CategoryMathProblem as CategoryLearningProblem } from '@/components/CategoryMathProblem';
import { AuthForm } from '@/components/auth/AuthForm';
import { UserProfile } from '@/components/auth/UserProfile';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Clock, RotateCcw, BookOpen, Sparkles, User, Shield } from 'lucide-react';

type Category = 'math' | 'german' | 'english' | 'geography' | 'history' | 'physics' | 'biology' | 'chemistry' | 'latin';

const Index = () => {
  const { user, loading } = useAuth();
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [earnedTime, setEarnedTime] = useState<number>(0);
  const [earnedCategory, setEarnedCategory] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const handleGradeSelect = (grade: number) => {
    setSelectedGrade(grade);
    setShowSuccess(false);
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
  };

  const handleStartGame = (grade: number) => {
    console.log('🎮 Starting game with grade:', grade);
    setSelectedGrade(grade);
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
  };

  const handleSignOut = () => {
    setSelectedGrade(null);
    setSelectedCategory(null);
    setShowSuccess(false);
    setEarnedTime(0);
    setEarnedCategory('');
  };

  const handleProblemComplete = (minutes: number, category: string) => {
    // Don't show success screen - go directly back to profile/grade selection
    if (user) {
      // For logged in users, go back to profile
      setSelectedGrade(null);
      setSelectedCategory(null);
      // Force reload of user profile when returning to update stats
      window.location.hash = 'reload-stats';
    } else {
      // For guest users, go back to grade selection
      setSelectedCategory(null);
    }
  };

  const handleBack = () => {
    if (selectedCategory) {
      setSelectedCategory(null);
    } else if (selectedGrade) {
      setSelectedGrade(null);
    }
    setShowSuccess(false);
  };

  const handleBackToGradeSelection = () => {
    setSelectedCategory(null);
  };

  // Convert English category types to German display names
  const convertCategoryToGerman = (category: Category): string => {
    switch (category) {
      case 'math': return 'Mathematik';
      case 'german': return 'Deutsch';
      case 'english': return 'Englisch';
      case 'geography': return 'Geographie';
      case 'history': return 'Geschichte';
      case 'physics': return 'Physik';
      case 'biology': return 'Biologie';
      case 'chemistry': return 'Chemie';
      case 'latin': return 'Latein';
      default: return 'Mathematik';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'math': return 'Mathematik';
      case 'german': return 'Deutsch';
      case 'english': return 'Englisch';
      case 'geography': return 'Geographie';
      case 'history': return 'Geschichte';
      case 'physics': return 'Physik';
      case 'biology': return 'Biologie';
      case 'chemistry': return 'Chemie';
      case 'latin': return 'Latein';
      default: return 'Lernen';
    }
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'math': return '🔢';
      case 'german': return '📚';
      case 'english': return '🇬🇧';
      case 'geography': return '🌍';
      case 'history': return '🏛️';
      case 'physics': return '⚡';
      case 'biology': return '🌱';
      case 'chemistry': return '🧪';
      case 'latin': return '🏺';
      default: return '📖';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-card">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">App wird geladen...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show auth form if no user and auth is requested
  if (!user && showAuth) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  // Show user profile if user is logged in and no game is active
  if (user && !selectedGrade) {
    return (
      <UserProfile 
        user={user} 
        onSignOut={handleSignOut} 
        onStartGame={handleStartGame} 
      />
    );
  }


  // Show math problems if grade and category are selected - FIXED: Pass German category name
  if (selectedGrade && selectedCategory) {
    const germanCategoryName = convertCategoryToGerman(selectedCategory);
    console.log('🔄 Converting category:', selectedCategory, '→', germanCategoryName);
    
    return (
      <CategoryLearningProblem 
        grade={selectedGrade}
        category={germanCategoryName}
        onComplete={handleProblemComplete}
        onBack={() => setSelectedCategory(null)}
      />
    );
  }

  // Show category selector if grade is selected but not category
  if (selectedGrade) {
    return (
      <CategorySelector
        grade={selectedGrade}
        onCategorySelect={handleCategorySelect}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full animate-pulse blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/20 rounded-full animate-pulse blur-3xl" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-accent/30 rounded-full animate-pulse blur-xl" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-primary to-secondary rounded-3xl mb-6 shadow-lg animate-scale-in">
            <BookOpen className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-6">
            LernZeit
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-2xl mx-auto leading-relaxed">
            Löse Lernaufgaben und verdiene Handyzeit!
          </p>
          
          <div className="flex items-center justify-center gap-3 mb-8 text-muted-foreground">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-lg">Alle Schulfächer • Individuelle Belohnungen • Fortschritt speichern</span>
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
            <Button 
              onClick={() => setShowAuth(true)} 
              size="lg" 
              className="h-14 px-8 text-lg font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <User className="w-5 h-5 mr-2" />
              Anmelden / Registrieren
            </Button>
            <Button 
              onClick={() => setSelectedGrade(3)} 
              variant="outline" 
              size="lg"
              className="h-14 px-8 text-lg font-medium border-2 hover:bg-muted/50 transition-all duration-200 hover:scale-105"
            >
              <Trophy className="w-5 h-5 mr-2" />
              Demo starten
            </Button>
          </div>
        </div>
        
        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8 animate-slide-up">
          <Card className="shadow-card border-0 backdrop-blur-sm bg-card/80 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Alle Schulfächer</h3>
              <p className="text-muted-foreground text-sm">
                Mathematik, Deutsch, Englisch, Naturwissenschaften und mehr
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-card border-0 backdrop-blur-sm bg-card/80 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Belohnungssystem</h3>
              <p className="text-muted-foreground text-sm">
                Verdiene Handyzeit durch das Lösen von Lernaufgaben
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-card border-0 backdrop-blur-sm bg-card/80 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Fortschritt verfolgen</h3>
              <p className="text-muted-foreground text-sm">
                Erfolge sammeln und Lernfortschritte dokumentieren
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground animate-fade-in">
          <p className="flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            Sicher, lehrreich und motivierend für alle Klassenstufen
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
