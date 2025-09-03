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
    console.log('🌱 Math Curriculum Seeder starting...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { trigger, specificGrade, specificQuarter, specificDomain } = await req.json();
    
    console.log('📚 Seeder triggered:', { trigger, specificGrade, specificQuarter, specificDomain });

    // Updated comprehensive math curriculum for grades 1-10 - CORRECTED VERSION  
    const MATH_CURRICULUM = {
      1: {
        "Q1": {
          "Zahlen & Operationen": "Zahlen bis 10, Zahlzerlegung, Verdoppeln/Halbieren, Zahlen erkennen (mit Emojis symbolisieren)",
          "Größen & Messen": "Vergleiche (größer/kleiner, schwerer/leichter), Uhr volle Stunden"
        },
        "Q2": {
          "Zahlen & Operationen": "Add./Subtraktion bis 20 (ohne Übergang), Rechenstrategien, Verdoppeln/Halbieren",
          "Größen & Messen": "Längen vergleichen mit Zahlen, Uhr halbe Stunden", 
          "Daten & Zufall": "Bilddiagramme in Textform beschreiben"
        },
        "Q3": {
          "Zahlen & Operationen": "Add./Subtraktion mit Übergang, 10er Freunde, erste Multiplikation als wiederholte Addition",
          "Größen & Messen": "Geld kennenlernen, Uhr Viertelstunden"
        },
        "Q4": {
          "Zahlen & Operationen": "Zahlen bis 100, erste Multiplikation (gleich große Gruppen), Rechentricks",
          "Größen & Messen": "Längen in cm messen, Uhr volle/halbe/viertel Stunden sicher"
        }
      },
      2: {
        "Q1": {
          "Zahlen & Operationen": "Zahlen bis 100 sicher ordnen, Add./Subtraktion mit Übergang, Rechentricks, Umkehraufgaben",
          "Größen & Messen": "Geldrechnen bis 2 €, Uhr Minuten genau",
          "Daten & Zufall": "Einfache Kombinatorik"
        },
        "Q2": {
          "Zahlen & Operationen": "Einmaleins 2er/5er/10er, Malnehmen/Teilen als Umkehr, Add./Subtraktion festigen",
          "Größen & Messen": "Längen cm/m, Zeitdauern berechnen"
        },
        "Q3": {
          "Zahlen & Operationen": "Einmaleins 3er/4er/6er, Division als Aufteilen, Rechenstrategien (Tauschgesetz), Schlüsselaufgaben",
          "Größen & Messen": "Masse g/kg, Kalenderrechnen",
          "Daten & Zufall": "Zufallsbegriffe möglich/unmöglich/sicher, einfache Experimente"
        },
        "Q4": {
          "Zahlen & Operationen": "Einmaleins automatisieren, Rechentricks, Sachaufgaben Mal/Teilen",
          "Größen & Messen": "Längen umrechnen cm↔m, Geldrechnen bis 10 €",
          "Daten & Zufall": "Zufallsexperimente protokollieren"
        }
      },
      3: {
        "Q1": {
          "Zahlen & Operationen": "Zahlenraum 1000, Schriftliche Add./Sub.",
          "Größen & Messen": "Längen mm–cm–m, Zeitspannen"
        },
        "Q2": {
          "Zahlen & Operationen": "Multiplikation/Division, Stellenwert festigen",
          "Größen & Messen": "Gewicht g–kg, Geld (Wechselgeld)"
        },
        "Q3": {
          "Zahlen & Operationen": "Multiplikation mehrstellig, Division mit Rest",
          "Größen & Messen": "Flächenrechteck berechnen, Volumen Würfel/Quader (rechnen)"
        },
        "Q4": {
          "Zahlen & Operationen": "Dezimalzahlen (Geld), Stellenwertsystem",
          "Größen & Messen": "Zeitpläne lesen, Temperaturen in Zahlen"
        }
      },
      4: {
        "Q1": {
          "Zahlen & Operationen": "Zahlenraum bis 1 Mio, Schriftliche Add./Sub.",
          "Größen & Messen": "Einheiten m–km, g–kg; Zeitrechnen",
          "Daten & Zufall": "Mittelwert, Spannweite"
        },
        "Q2": {
          "Zahlen & Operationen": "Multiplikation/Division schriftlich",
          "Größen & Messen": "Volumen Quader, Flächen verschiedener Figuren"
        },
        "Q3": {
          "Zahlen & Operationen": "Dezimalzahlen (Zehntel/Hundertstel), Brüche als Anteile",
          "Größen & Messen": "Geld mit Dezimalzahlen, Geschwindigkeit (km/h)"
        },
        "Q4": {
          "Zahlen & Operationen": "Rechenstrategien reflektieren, kombinierte Aufgaben mit Klammern, Punkt- und Strichrechnung",
          "Größen & Messen": "Umrechnungen in Sachaufgaben, Maßstäbe (Textbasiert)",
          "Daten & Zufall": "Zufallsversuche, Baumskizzen textbasiert"
        }
      },
      5: {
        "Q1": {
          "Zahlen & Operationen": "Potenzen",
          "Größen & Messen": "Flächen zusammengesetzter Figuren, Volumen Quader",
          "Daten & Zufall": "Datenerhebung, Mittelwert"
        },
        "Q2": {
          "Zahlen & Operationen": "Dezimalzahlen, Brüche vergleichen",
          "Größen & Messen": "Einheiten systematisch, Skalen",
          "Gleichungen & Funktionen": "Vierecke in Rechenaufgaben",
          "Daten & Zufall": "Relative Häufigkeiten"
        },
        "Q3": {
          "Zahlen & Operationen": "Brüche addieren, Dezimal↔Bruch",
          "Größen & Messen": "Kreisumfang/Fläche berechnen, Maßstab rechnen",
          "Daten & Zufall": "Streuungsmaße, Quartile in Zahlen"
        },
        "Q4": {
          "Zahlen & Operationen": "Brüche multiplizieren/dividieren, Dreisatz einfach",
          "Größen & Messen": "Volumen Zylinder",
          "Gleichungen & Funktionen": "Lineare Gleichungen",
          "Daten & Zufall": "Diagrammvergleich"
        }
      },
      6: {
        "Q1": {
          "Zahlen & Operationen": "Rationale Zahlen, Proportionalität",
          "Größen & Messen": "Prozentrechnung Grundbegriffe",
          "Gleichungen & Funktionen": "Lineare Gleichungen, Koordinaten",
          "Daten & Zufall": "Baumdiagramm (textuell)"
        },
        "Q2": {
          "Zahlen & Operationen": "Proportionalität ↔ Funktion, Prozentanwendungen",
          "Größen & Messen": "Kreisberechnungen (Umfang/Fläche)",
          "Gleichungen & Funktionen": "Lineare Gleichungen mit Klammern/Brüchen",
          "Daten & Zufall": "Mittelwert/Median/Modus"
        },
        "Q3": {
          "Zahlen & Operationen": "Potenzgesetze, Terme umformen",
          "Größen & Messen": "Prozent Zuwachs/Abnahme, Zinsrechnung",
          "Gleichungen & Funktionen": "Lineare Funktionen y=mx+n, LGS grafisch",
          "Daten & Zufall": "Baumdiagramme mehrstufig"
        },
        "Q4": {
          "Zahlen & Operationen": "Terme mit Brüchen/Klammern",
          "Größen & Messen": "Volumen zusammengesetzter Körper",
          "Gleichungen & Funktionen": "Funktionen vergleichen",
          "Daten & Zufall": "Diagrammkritik"
        }
      },
      7: {
        "Q1": {
          "Zahlen & Operationen": "Rationale Zahlen, Potenzen, Prozent",
          "Gleichungen & Funktionen": "Lineare Gleichungssysteme",
          "Daten & Zufall": "Mehrstufige Zufallsversuche"
        },
        "Q2": {
          "Zahlen & Operationen": "Zins/Zinseszins, Skalierungen",
          "Gleichungen & Funktionen": "Lineare Modelle, Schnittpunkte",
          "Daten & Zufall": "Boxplot (nur numerische Werte, keine Zeichnung)"
        },
        "Q3": {
          "Zahlen & Operationen": "Terme umformen, Ungleichungen",
          "Gleichungen & Funktionen": "Lineare Funktionen systematisch, LGS",
          "Daten & Zufall": "Wahrscheinlichkeiten rechnen"
        },
        "Q4": {
          "Zahlen & Operationen": "Prozentketten, Exponentialbegriffe",
          "Gleichungen & Funktionen": "Lineare Modellierung, Funktionsterm ↔ Wertepaare",
          "Daten & Zufall": "Stichprobe vs. Grundgesamtheit"
        }
      },
      8: {
        "Q1": {
          "Zahlen & Operationen": "Terme Grad 1/2, Wurzeln",
          "Gleichungen & Funktionen": "Quadratische Gleichungen, Parabeln (textuelle Analyse)",
          "Daten & Zufall": "Boxplots (numerisch)"
        },
        "Q2": {
          "Zahlen & Operationen": "Exponentialbegriffe, Potenzgesetze",
          "Gleichungen & Funktionen": "Quadratische Funktionen (Scheitel, Nullstellen in Zahlen)",
          "Daten & Zufall": "Kombinatorik einführend"
        },
        "Q3": {
          "Zahlen & Operationen": "Terme mit Wurzeln, wissenschaftliche Notation",
          "Gleichungen & Funktionen": "Quadratische Gleichungen lösen, Funktionsscharen qualitativ",
          "Daten & Zufall": "Bedingte Wahrscheinlichkeiten"
        },
        "Q4": {
          "Zahlen & Operationen": "Logarithmen vorbereiten",
          "Gleichungen & Funktionen": "Quadratische Modelle, Schnittpunkte",
          "Daten & Zufall": "Datenkritik"
        }
      },
      9: {
        "Q1": {
          "Zahlen & Operationen": "Wurzeln, Exponenten, Terme mit Variablen",
          "Gleichungen & Funktionen": "Quadratische Funktionen vollständig analysieren",
          "Daten & Zufall": "Mehrstufige Zufallsrechnungen"
        },
        "Q2": {
          "Zahlen & Operationen": "Exponentialfunktionen, Zinseszins",
          "Gleichungen & Funktionen": "LGS 2×2/3×3",
          "Daten & Zufall": "Stichproben, Schätzungen"
        },
        "Q3": {
          "Zahlen & Operationen": "Exponential-/Wurzelgleichungen",
          "Gleichungen & Funktionen": "Funktionsscharen, quadratische Gleichungen",
          "Daten & Zufall": "Boxplot, Median"
        },
        "Q4": {
          "Zahlen & Operationen": "Logarithmen einführen",
          "Gleichungen & Funktionen": "Schnittpunkte, Gleichungssysteme Anwendungen",
          "Daten & Zufall": "Kombinatorik"
        }
      },
      10: {
        "Q1": {
          "Zahlen & Operationen": "Logarithmen, Exponentialfunktionen",
          "Gleichungen & Funktionen": "Quadratische Funktionen, Wurfparabeln (Berechnungen)",
          "Daten & Zufall": "Wahrscheinlichkeiten, Unabhängigkeit"
        },
        "Q2": {
          "Zahlen & Operationen": "Exponential-/Logarithmusgleichungen, Prozentanwendungen komplex",
          "Gleichungen & Funktionen": "Optimierung quadratischer Funktionen",
          "Daten & Zufall": "Stichprobendesign, Verzerrung"
        },
        "Q3": {
          "Zahlen & Operationen": "Binomische Formeln, Wurzelausdrücke",
          "Gleichungen & Funktionen": "Modellierungen, Gleichungssysteme",
          "Daten & Zufall": "Kombinatorik vertieft"
        },
        "Q4": {
          "Zahlen & Operationen": "Gesamtüberblick Exponential/Logarithmus",
          "Gleichungen & Funktionen": "Funktionenfamilien vergleichen",
          "Daten & Zufall": "Statistikprojekt (Daten interpretieren, keine Visualisierung nötig)"
        }
      }
    };

    // Determine which combinations to generate templates for
    let generationTargets = [];
    
    if (specificGrade && specificQuarter && specificDomain) {
      // Specific target requested
      generationTargets.push({ grade: specificGrade, quarter: specificQuarter, domain: specificDomain });
    } else {
      // Generate for all combinations
      for (let grade = 1; grade <= 10; grade++) {
        const gradeData = MATH_CURRICULUM[grade as keyof typeof MATH_CURRICULUM];
        if (!gradeData) continue;
        
        for (const quarter of ['Q1', 'Q2', 'Q3', 'Q4']) {
          const quarterData = gradeData[quarter as keyof typeof gradeData];
          if (!quarterData) continue;
          
          for (const domain of Object.keys(quarterData)) {
            generationTargets.push({ grade, quarter, domain });
          }
        }
      }
    }

    console.log(`🎯 Generation targets: ${generationTargets.length} combinations`);
    
    const results = [];
    let totalTemplatesGenerated = 0;

    // Generate templates for each target (20 per difficulty level = 60 total per combination)
    for (const target of generationTargets) {
      const { grade, quarter, domain } = target;
      const curriculumContent = MATH_CURRICULUM[grade as keyof typeof MATH_CURRICULUM]?.[quarter as keyof any]?.[domain];
      
      if (!curriculumContent) {
        console.log(`❌ No curriculum content for Grade ${grade} ${quarter} ${domain}`);
        continue;
      }

      console.log(`📝 Generating templates for Grade ${grade} ${quarter} ${domain}...`);
      
      // Generate 20 templates per difficulty level (AFB I, AFB II, AFB III)
      const difficulties = ['AFB I', 'AFB II', 'AFB III'];
      const templatesPerDifficulty = 20;
      
      for (const difficulty of difficulties) {
        try {
          const response = await supabase.functions.invoke('template-generator', {
            body: { 
              grade,
              quarter, 
              domain,
              difficulty,
              templatesCount: templatesPerDifficulty,
              curriculumContent,
              enhancedQuality: true,  // Enable high-quality explanations
              questionTypeRotation: true, // Enable question type rotation
              antiVisualConstraints: true // Enable anti-visual constraints
            }
          });

          if (response.error) {
            console.error(`❌ Error generating templates for ${grade}-${quarter}-${domain}-${difficulty}:`, response.error);
            results.push({ 
              target: `${grade}-${quarter}-${domain}-${difficulty}`, 
              success: false, 
              error: response.error.message,
              templatesGenerated: 0
            });
          } else {
            const templatesGenerated = response.data?.templatesGenerated || 0;
            totalTemplatesGenerated += templatesGenerated;
            results.push({ 
              target: `${grade}-${quarter}-${domain}-${difficulty}`, 
              success: true, 
              templatesGenerated 
            });
            console.log(`✅ Generated ${templatesGenerated} templates for ${grade}-${quarter}-${domain}-${difficulty}`);
          }
        } catch (error) {
          console.error(`❌ Exception for ${grade}-${quarter}-${domain}-${difficulty}:`, error);
          results.push({ 
            target: `${grade}-${quarter}-${domain}-${difficulty}`, 
            success: false, 
            error: error.message,
            templatesGenerated: 0
          });
        }
        
        // Small delay between requests to prevent API overload
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Summary statistics
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    console.log(`📊 Mass Generation Complete:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`   🎯 Total Templates: ${totalTemplatesGenerated}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Math curriculum seeder completed - Generated ${totalTemplatesGenerated} high-quality templates`,
      summary: {
        totalCombinations: generationTargets.length,
        totalTemplatesGenerated,
        successfulGenerations: successCount,
        failedGenerations: failureCount
      },
      detailedResults: results,
      trigger: trigger || 'manual'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Math curriculum seeder error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      details: 'Failed to seed math curriculum templates'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});