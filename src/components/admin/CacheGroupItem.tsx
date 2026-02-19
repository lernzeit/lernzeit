import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface CachedQuestion {
  id: string;
  question_text: string;
  correct_answer: any;
  options: any;
  question_type: string;
  difficulty: string;
  times_served: number;
}

interface CacheGroupItemProps {
  grade: number;
  subject: string;
  count: number;
  avgServed: number;
}

export function CacheGroupItem({ grade, subject, count, avgServed }: CacheGroupItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [questions, setQuestions] = useState<CachedQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const toggle = async () => {
    if (!isOpen && !loaded) {
      setLoading(true);
      const { data } = await supabase
        .from('ai_question_cache')
        .select('id, question_text, correct_answer, options, question_type, difficulty, times_served')
        .eq('grade', grade)
        .eq('subject', subject)
        .order('created_at', { ascending: false })
        .limit(50);
      setQuestions(data || []);
      setLoaded(true);
      setLoading(false);
    }
    setIsOpen(!isOpen);
  };

  const formatAnswer = (q: CachedQuestion) => {
    try {
      if (q.question_type === 'multiple-choice' && q.options) {
        const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        const idx = typeof q.correct_answer === 'string' ? parseInt(q.correct_answer) : q.correct_answer;
        if (Array.isArray(opts) && typeof idx === 'number' && opts[idx]) {
          return `${opts[idx]} (Index ${idx})`;
        }
      }
      return String(q.correct_answer);
    } catch {
      return String(q.correct_answer);
    }
  };

  const diffColor = (d: string) => {
    if (d === 'easy') return 'bg-green-100 text-green-800';
    if (d === 'hard') return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={toggle}
        className="flex items-center gap-3 p-3 w-full text-left hover:bg-muted/50 transition-colors"
      >
        {isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
        <span className="w-16 text-xs font-medium text-center shrink-0">Kl. {grade}</span>
        <span className="flex-1 text-sm capitalize">{subject}</span>
        <span className="text-sm font-bold">{count}</span>
        <span className="text-xs text-muted-foreground w-20 text-right">Ø {avgServed}× genutzt</span>
      </button>

      {isOpen && (
        <div className="border-t bg-muted/20 max-h-96 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Laden…</p>
          ) : questions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Keine Fragen gefunden.</p>
          ) : (
            <div className="divide-y">
              {questions.map((q) => (
                <div key={q.id} className="px-4 py-2.5 text-xs space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="font-medium flex-1 leading-relaxed">{q.question_text}</span>
                    <Badge className={`${diffColor(q.difficulty)} shrink-0 text-[10px]`}>{q.difficulty}</Badge>
                  </div>
                  <div className="text-muted-foreground">
                    <span className="font-medium text-foreground">Antwort:</span> {formatAnswer(q)}
                  </div>
                  {q.options && (
                    <div className="text-muted-foreground">
                      <span className="font-medium text-foreground">Optionen:</span>{' '}
                      {(() => {
                        try {
                          const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                          return Array.isArray(opts) ? opts.join(' | ') : String(q.options);
                        } catch { return String(q.options); }
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
