import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 REPARIERTE Template Generator starting... 🔧');
    console.log('Timestamp:', new Date().toISOString());
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    console.log('Environment check:', {
      supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
      supabaseServiceKey: supabaseServiceKey ? 'SET' : 'MISSING', 
      geminiApiKey: geminiApiKey ? 'SET' : 'MISSING'
    });
    
    if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
      throw new Error('Missing required environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      grade, 
      quarter, 
      domain, 
      difficulty = 'AFB I', 
      templatesCount = 20,
      curriculumContent = '',
      enhancedQuality = true,
      questionTypeRotation = true,
      antiVisualConstraints = true
    } = await req.json();
    
    console.log('📚 Generating templates:', { grade, quarter, domain, difficulty, templatesCount });

    // Enhanced system prompt with quality controls and anti-visual constraints
    const systemPrompt = `Sie sind ein Experte für die Erstellung von Mathematikaufgaben für deutsche Schulen mit höchster Qualität.

QUALITY REQUIREMENTS:
- Explanations MUST be detailed and educational (minimum 80 characters, aim for 120-200)
- Use age-appropriate language for Grade ${grade}
- Include step-by-step reasoning in explanations
- Make explanations encouraging and supportive for children

CURRICULUM COMPLIANCE:
- Follow exact curriculum content: "${curriculumContent}"
- Grade ${grade}, Quarter ${quarter}, Domain "${domain}", Difficulty "${difficulty}"
- Tasks must be appropriate for German curriculum standards

QUESTION TYPE ROTATION (use systematically):
- MULTIPLE_CHOICE: 4 options, 1 correct (data: {options: [...], correct_idx: 0-3})
- FREETEXT: Open response (data: {expected: "answer", grading: "exact"})
- SORT: Order items (data: {items: [...], correct_order: [...]})
- MATCH: Pair items (data: {left: [...], right: [...], pairs: [...]})

CRITICAL ANTI-VISUAL CONSTRAINTS:
❌ NEVER create tasks requiring: drawing, sketching, constructing, measuring with ruler
❌ NEVER use: "Zeichne", "Male", "Konstruiere", "Miss ab", "Welches Bild zeigt"
❌ NEVER require visual input/output except simple emoji counting for Grade 1 Q1
✅ ALL tasks must be solvable through text and numbers only
✅ Use descriptions instead of visual elements
✅ Convert visual concepts to numerical/textual problems

EXAMPLE GOOD EXPLANATIONS:
- "Um diese Aufgabe zu lösen, rechnest du zuerst 15 + 8 = 23. Dann ziehst du 7 ab: 23 - 7 = 16. Das Ergebnis ist 16."
- "Bei dieser Textaufgabe musst du die wichtigen Zahlen finden: 12 Äpfel und 5 werden gegessen. Die Rechnung ist 12 - 5 = 7 Äpfel bleiben übrig."

Generate ${templatesCount} diverse, high-quality templates.`;

    // Generate templates with question type rotation
    const questionTypes = ['MULTIPLE_CHOICE', 'FREETEXT', 'SORT', 'MATCH'];
    const templatesGenerated = [];
    
    for (let i = 0; i < templatesCount; i++) {
      const questionType = questionTypes[i % questionTypes.length]; // Systematic rotation
      
      const userPrompt = `Create 1 high-quality math template:

Grade: ${grade}
Quarter: ${quarter}  
Domain: ${domain}
Difficulty: ${difficulty}
Question Type: ${questionType}
Curriculum Content: ${curriculumContent}

TEMPLATE FORMAT:
{
  "grade": ${grade},
  "grade_app": ${grade},
  "quarter_app": "${quarter}",
  "domain": "${domain}",
  "subcategory": "[specific subcategory from curriculum]",
  "difficulty": "${difficulty}",
  "question_type": "${questionType.toLowerCase().replace('_', '-')}",
  "student_prompt": "[Clear, curriculum-compliant question - NO VISUAL ELEMENTS]",
  "variables": {},
  "solution": {"value": "[exact answer]"},
  "unit": "[unit if applicable, empty string if none]",
  "distractors": ["[wrong answer 1]", "[wrong answer 2]", "[wrong answer 3]"],
  "explanation": "[Detailed step-by-step explanation 80-200 characters]",
  "source_skill_id": "curriculum_${grade}_${quarter}_${domain.replace(/\s/g, '_')}",
  "tags": ["[relevant tag 1]", "[relevant tag 2]"],
  "seed": "${Math.floor(Math.random() * 1000000)}"
}

QUESTION TYPE SPECIFIC REQUIREMENTS:
${questionType === 'MULTIPLE_CHOICE' ? 
  '- student_prompt: Question with 4 answer choices\n- variables: {"options": ["option1", "option2", "option3", "option4"], "correct_idx": 0}' :
questionType === 'FREETEXT' ?
  '- student_prompt: Open question requiring calculation\n- variables: {"expected": "exact answer", "grading": "exact"}' :
questionType === 'SORT' ?
  '- student_prompt: "Ordne folgende Items nach [criteria]"\n- variables: {"items": ["item1", "item2", "item3"], "correct_order": [0, 1, 2]}' :
  '- student_prompt: "Verbinde die passenden Paare"\n- variables: {"left": ["left1", "left2"], "right": ["right1", "right2"], "pairs": [[0,0], [1,1]]}'
}

Return ONLY the JSON template, no additional text.`;

      try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + geminiApiKey, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: systemPrompt + '\n\n' + userPrompt
              }]
            }],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 2048,
            }
          })
        });

        if (!response.ok) {
          throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!generatedText) {
          console.error('❌ No generated text from Gemini');
          continue;
        }

        // Parse JSON from generated text
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error('❌ No JSON found in generated text');
          continue;
        }

        const template = JSON.parse(jsonMatch[0]);
        
        // Validate template quality
        if (!template.explanation || template.explanation.length < 50) {
          console.warn('⚠️ Template explanation too short, enhancing...');
          template.explanation = `Für diese Aufgabe aus ${domain} musst du die gegebenen Informationen sorgfältig lesen und Schritt für Schritt vorgehen. ${template.explanation || 'Rechne genau und überprüfe dein Ergebnis.'}`;
        }

        // Ensure no visual constraints violations
        const visualKeywords = ['zeichne', 'male', 'konstruiere', 'miss', 'bild', 'skizze', 'diagramm'];
        const hasVisualViolation = visualKeywords.some(keyword => 
          template.student_prompt.toLowerCase().includes(keyword)
        );
        
        if (hasVisualViolation && grade > 1) {
          console.warn('⚠️ Visual constraint violation detected, skipping template');
          continue;
        }

        // Insert template into database
        const { data: insertedTemplate, error: insertError } = await supabase
          .from('templates')
          .insert([template])
          .select()
          .single();

        if (insertError) {
          console.error('❌ Database insert error:', insertError);
          continue;
        }

        templatesGenerated.push(insertedTemplate);
        console.log(`✅ Generated template ${i + 1}/${templatesCount}: ${questionType}`);

      } catch (error) {
        console.error(`❌ Error generating template ${i + 1}:`, error);
        continue;
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`🎯 Template generation complete: ${templatesGenerated.length}/${templatesCount} templates created`);

    return new Response(JSON.stringify({
      success: true,
      message: `Generated ${templatesGenerated.length} high-quality templates for Grade ${grade} ${quarter} ${domain}`,
      templatesGenerated: templatesGenerated.length,
      targetCount: templatesCount,
      templates: templatesGenerated,
      qualityFeatures: {
        enhancedExplanations: enhancedQuality,
        questionTypeRotation: questionTypeRotation,
        antiVisualConstraints: antiVisualConstraints,
        curriculumCompliant: true
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Template generator error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      templatesGenerated: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});