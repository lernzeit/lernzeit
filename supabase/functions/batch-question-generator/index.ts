import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('🚀 Starting batch question generation...');
    console.log('OpenAI API Key:', !!openAIApiKey);
    console.log('Gemini API Key:', !!geminiApiKey);
    console.log('Supabase URL:', !!supabaseUrl);
    console.log('Supabase Service Key:', !!supabaseServiceKey);

    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { totalQuestions = 100, provider = 'mixed' } = await req.json();

    // Test API connections first
    console.log('🔍 Testing API connections...');
    
    let openAIWorks = false;
    let geminiWorks = false;

    // Test OpenAI
    if (openAIApiKey) {
      try {
        const testResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-5-2025-08-07',
            messages: [{ role: 'user', content: 'Hello' }],
            max_completion_tokens: 5
          }),
        });
        
        if (testResponse.ok) {
          openAIWorks = true;
          console.log('✅ OpenAI API working');
        } else {
          console.log('❌ OpenAI API failed:', await testResponse.text());
        }
      } catch (error) {
        console.log('❌ OpenAI API error:', error.message);
      }
    }

    // Test Gemini
    if (geminiApiKey) {
      try {
        const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hello' }] }]
          }),
        });
        
        if (testResponse.ok) {
          geminiWorks = true;
          console.log('✅ Gemini API working');
        } else {
          console.log('❌ Gemini API failed:', await testResponse.text());
        }
      } catch (error) {
        console.log('❌ Gemini API error:', error.message);
      }
    }

    if (!openAIWorks && !geminiWorks) {
      throw new Error('Neither OpenAI nor Gemini APIs are working');
    }

    // Generate questions in batches
    const batchSize = 10;
    const totalBatches = Math.ceil(totalQuestions / batchSize);
    let totalGenerated = 0;
    let totalInserted = 0;
    const results = [];

    console.log(`📦 Generating ${totalQuestions} questions in ${totalBatches} batches of ${batchSize}`);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const questionsInBatch = Math.min(batchSize, totalQuestions - totalGenerated);
      const currentProvider = provider === 'mixed' 
        ? (batchIndex % 2 === 0 && openAIWorks ? 'openai' : 'gemini')
        : provider === 'openai' && openAIWorks ? 'openai' : 'gemini';

      console.log(`🔄 Batch ${batchIndex + 1}/${totalBatches}: Generating ${questionsInBatch} questions with ${currentProvider.toUpperCase()}`);

      try {
        const templates = await generateQuestionsWithProvider(
          currentProvider, 
          questionsInBatch, 
          currentProvider === 'openai' ? openAIApiKey : geminiApiKey
        );

        if (templates && templates.length > 0) {
          // Insert into database
          const insertData = templates.map(template => ({
            grade: template.grade || Math.floor(Math.random() * 4) + 1,
            grade_app: template.grade || Math.floor(Math.random() * 4) + 1,
            domain: template.domain || "Zahlen & Operationen",
            subcategory: template.subcategory || "Grundlagen",
            question_type: template.question_type || "MULTIPLE_CHOICE",
            student_prompt: template.student_prompt || "Beispielaufgabe",
            solution: template.solution || { value: "42" },
            explanation: template.explanation || "Beispielerklärung",
            difficulty: template.difficulty || "medium",
            quarter_app: template.quarter_app || "Q1",
            variables: template.variables || {},
            distractors: template.distractors || [],
            quality_score: template.quality_score || 0.8,
            status: 'ACTIVE',
            tags: [template.domain || "Zahlen & Operationen"],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          const { data, error } = await supabase
            .from('templates')
            .insert(insertData)
            .select('id');

          if (error) {
            console.error(`❌ Batch ${batchIndex + 1} database error:`, error);
            results.push({
              batch: batchIndex + 1,
              provider: currentProvider,
              generated: templates.length,
              inserted: 0,
              error: error.message
            });
          } else {
            const insertedCount = data?.length || 0;
            totalInserted += insertedCount;
            console.log(`✅ Batch ${batchIndex + 1}: Generated ${templates.length}, Inserted ${insertedCount}`);
            
            results.push({
              batch: batchIndex + 1,
              provider: currentProvider,
              generated: templates.length,
              inserted: insertedCount,
              success: true
            });
          }

          totalGenerated += templates.length;
        } else {
          console.log(`⚠️ Batch ${batchIndex + 1}: No templates generated`);
          results.push({
            batch: batchIndex + 1,
            provider: currentProvider,
            generated: 0,
            inserted: 0,
            error: 'No templates generated'
          });
        }
      } catch (error) {
        console.error(`❌ Batch ${batchIndex + 1} error:`, error.message);
        results.push({
          batch: batchIndex + 1,
          provider: currentProvider,
          generated: 0,
          inserted: 0,
          error: error.message
        });
      }

      // Small delay between batches to avoid rate limits
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Quality check on generated questions
    console.log('🔍 Performing quality check...');
    const { data: recentTemplates } = await supabase
      .from('templates')
      .select('*')
      .eq('status', 'ACTIVE')
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
      .order('created_at', { ascending: false })
      .limit(20);

    const qualityReport = analyzeQuality(recentTemplates || []);

    console.log(`🎉 Batch generation complete! Generated: ${totalGenerated}, Inserted: ${totalInserted}`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        requested: totalQuestions,
        totalGenerated,
        totalInserted,
        successRate: totalInserted / totalQuestions,
        openAIWorking: openAIWorks,
        geminiWorking: geminiWorks
      },
      batches: results,
      qualityReport,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Batch generation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateQuestionsWithProvider(provider: string, count: number, apiKey: string) {
  const grade = Math.floor(Math.random() * 4) + 1; // Random grade 1-4
  const domains = ["Zahlen & Operationen", "Raum & Form", "Größen & Messen"];
  const domain = domains[Math.floor(Math.random() * domains.length)];

  const prompt = `Erstelle genau ${count} deutsche Grundschul-Mathematik-Aufgaben für Klasse ${grade} im Bereich "${domain}".

Antworte NUR mit einem JSON-Array in folgendem Format:
[
  {
    "grade": ${grade},
    "domain": "${domain}",
    "subcategory": "Grundlagen",
    "question_type": "MULTIPLE_CHOICE",
    "student_prompt": "Kindgerechte Aufgabe mit klarer Fragestellung",
    "solution": {"value": "korrekte_antwort"},
    "explanation": "Kurze, liebevolle Erklärung",
    "difficulty": "easy",
    "quarter_app": "Q1",
    "variables": {},
    "distractors": ["falsch1", "falsch2", "falsch3"],
    "quality_score": 0.9
  }
]

Wichtig:
- Genau ${count} Aufgaben
- Altersgerecht für Klasse ${grade}
- Nur JSON, kein zusätzlicher Text
- Deutsche Sprache
- Mathematisch korrekt`;

  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 3000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    return parseAIResponse(content);

  } else if (provider === 'gemini') {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('No content from Gemini API');
    }
    return parseAIResponse(content);
  }

  throw new Error(`Unknown provider: ${provider}`);
}

function parseAIResponse(content: string) {
  try {
    // Try direct parse first
    return JSON.parse(content);
  } catch {
    // Extract JSON array from markdown or other text
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Could not extract JSON from AI response');
  }
}

function analyzeQuality(templates: any[]) {
  if (!templates || templates.length === 0) {
    return { message: 'No templates to analyze' };
  }

  const analysis = {
    total: templates.length,
    avgQualityScore: 0,
    validPrompts: 0,
    validSolutions: 0,
    validExplanations: 0,
    questionTypes: {},
    grades: {},
    domains: {}
  };

  templates.forEach(template => {
    analysis.avgQualityScore += template.quality_score || 0;
    
    if (template.student_prompt && template.student_prompt.length > 10) {
      analysis.validPrompts++;
    }
    if (template.solution && typeof template.solution === 'object') {
      analysis.validSolutions++;
    }
    if (template.explanation && template.explanation.length > 5) {
      analysis.validExplanations++;
    }
    
    const qType = template.question_type || 'unknown';
    analysis.questionTypes[qType] = (analysis.questionTypes[qType] || 0) + 1;
    
    const grade = template.grade || 'unknown';
    analysis.grades[grade] = (analysis.grades[grade] || 0) + 1;
    
    const domain = template.domain || 'unknown';
    analysis.domains[domain] = (analysis.domains[domain] || 0) + 1;
  });

  analysis.avgQualityScore /= templates.length;
  
  return {
    ...analysis,
    validityRates: {
      prompts: Math.round((analysis.validPrompts / analysis.total) * 100),
      solutions: Math.round((analysis.validSolutions / analysis.total) * 100),
      explanations: Math.round((analysis.validExplanations / analysis.total) * 100)
    },
    overallQuality: analysis.avgQualityScore >= 0.7 && 
                   analysis.validPrompts >= analysis.total * 0.9 &&
                   analysis.validSolutions >= analysis.total * 0.9
  };
}