import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Send, Volume2, VolumeX, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface KITutorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionText: string;
  correctAnswer: string;
  userAnswer?: string;
  grade: number;
  subject?: string;
}

export function KITutorDialog({
  open,
  onOpenChange,
  questionText,
  correctAnswer,
  userAnswer,
  grade,
  subject = 'math',
}: KITutorDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Auto-start explanation when dialog opens
  useEffect(() => {
    if (open && !initializedRef.current && messages.length === 0) {
      initializedRef.current = true;
      streamTutorResponse([
        { role: 'user', content: `Ich habe diese Aufgabe falsch beantwortet und brauche Hilfe: "${questionText}"` },
      ]);
    }
    if (!open) {
      initializedRef.current = false;
      setMessages([]);
      stopSpeaking();
    }
  }, [open]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamTutorResponse = useCallback(async (chatMessages: Message[]) => {
    setIsLoading(true);
    let assistantContent = '';

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
        }
        return [...prev, { role: 'assistant', content: assistantContent }];
      });
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            messages: chatMessages,
            question: questionText,
            correctAnswer,
            userAnswer,
            grade,
            subject,
          }),
        }
      );

      if (!resp.ok || !resp.body) {
        throw new Error(`Failed: ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) updateAssistant(content);
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (err) {
      console.error('Tutor stream error:', err);
      if (!assistantContent) {
        updateAssistant('Entschuldigung, ich kann gerade nicht antworten. Versuche es gleich nochmal! 🙈');
      }
    } finally {
      setIsLoading(false);
    }
  }, [questionText, correctAnswer, userAnswer, grade, subject]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    streamTutorResponse(newMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Browser TTS
  const speakText = (text: string) => {
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = grade <= 2 ? 0.85 : 0.95;
    utterance.pitch = 1.1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const quickQuestions = grade <= 4
    ? ['Kannst du das nochmal erklären?', 'Warum ist das so?', 'Zeig mir ein Beispiel!']
    : ['Erklär mir den Rechenweg.', 'Warum ist meine Antwort falsch?', 'Gibt es eine andere Methode?'];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0 rounded-t-2xl">
        <SheetHeader className="px-4 pt-4 pb-2 border-b shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-primary" />
              KI-Tutor
            </SheetTitle>
            <div className="flex items-center gap-1">
              {isSpeaking && (
                <Button variant="ghost" size="icon" onClick={stopSpeaking} className="h-8 w-8">
                  <VolumeX className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content.replace(/\*\*/g, '').replace(/^#{1,3}\s/gm, '')}</p>
                  {msg.role === 'assistant' && msg.content && !isLoading && (
                    <button
                      onClick={() => speakText(msg.content)}
                      className="mt-1.5 flex items-center gap-1 text-xs opacity-60 hover:opacity-100 transition-opacity"
                      title="Vorlesen"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      Vorlesen
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Questions */}
        {messages.length <= 2 && !isLoading && (
          <div className="px-4 pb-2 flex gap-2 flex-wrap shrink-0">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => {
                  const userMsg: Message = { role: 'user', content: q };
                  const newMessages = [...messages, userMsg];
                  setMessages(newMessages);
                  streamTutorResponse(newMessages);
                }}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t shrink-0">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={grade <= 2 ? 'Frag mich etwas...' : 'Stelle eine Frage...'}
              disabled={isLoading}
              className="flex-1 rounded-full"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="rounded-full shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
