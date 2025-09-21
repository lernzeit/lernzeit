import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎈 First-Grade Cron: Regelmäßige Erstklässler-Fragen-Generierung');
    
    // Prüfe verfügbare First-Grade Templates nach Domain
    const FIRST_GRADE_DOMAINS = [
      'Zahlen & Operationen',
      'Raum & Form', 
      'Größen & Messen',
      'Daten & Zufall'
    ];
    
    const FIRST_GRADE_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
    const MIN_TEMPLATES_PER_COMBINATION = 8; // Minimum für Erstklässler
    
    let totalGenerated = 0;
    const results = [];

    for (const domain of FIRST_GRADE_DOMAINS) {
      for (const quarter of FIRST_GRADE_QUARTERS) {
        // Zähle existierende Templates
        const { data: existing, error: countError } = await supabase
          .from('templates')
          .select('id')
          .eq('status', 'ACTIVE')
          .eq('grade', 1)
          .eq('grade_app', 1)
          .eq('domain', domain)
          .eq('quarter_app', quarter);

        if (countError) {
          console.error(`❌ Fehler beim Zählen ${domain} ${quarter}:`, countError);
          continue;
        }

        const existingCount = existing?.length || 0;
        const needed = Math.max(0, MIN_TEMPLATES_PER_COMBINATION - existingCount);

        if (needed > 0) {
          console.log(`🎯 Generiere ${needed} Templates für ${domain} ${quarter} (${existingCount} vorhanden)`);
          
          try {
            const { data: generateResult, error: generateError } = await supabase
              .functions.invoke('first-grade-math-generator', {
                body: {
                  count: needed,
                  domain: domain,
                  quarter: quarter
                }
              });

            if (generateError) {
              console.error(`❌ Generierung fehlgeschlagen für ${domain} ${quarter}:`, generateError);
              continue;
            }

            const generated = generateResult?.questions?.length || 0;
            totalGenerated += generated;
            
            results.push({
              domain,
              quarter,
              existingCount,
              needed,
              generated,
              success: generated > 0
            });

            console.log(`✅ ${generated} Templates generiert für ${domain} ${quarter}`);
          } catch (error) {
            console.error(`💥 Fehler bei ${domain} ${quarter}:`, error);
            results.push({
              domain,
              quarter,
              existingCount,
              needed,
              generated: 0,
              success: false,
              error: error.message
            });
          }
        } else {
          console.log(`✅ ${domain} ${quarter} hat genügend Templates (${existingCount})`);
          results.push({
            domain,
            quarter,
            existingCount,
            needed: 0,
            generated: 0,
            success: true,
            status: 'sufficient'
          });
        }
      }
    }

    // Cleanup nach erfolgreicher Generierung
    if (totalGenerated > 0) {
      try {
        console.log('🧹 Starte automatische Duplikat-Bereinigung...');
        const { data: cleanupResult } = await supabase.functions.invoke('cleanup-duplicates', {
          body: { trigger: 'first-grade-cron', source: 'first-grade-cron' }
        });
        
        if (cleanupResult?.success) {
          console.log(`✅ Bereinigung abgeschlossen: ${cleanupResult.total_deactivated} Duplikate entfernt`);
        }
      } catch (cleanupError) {
        console.warn('⚠️ Bereinigung fehlgeschlagen, aber Generierung erfolgreich:', cleanupError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `First-Grade Cron abgeschlossen: ${totalGenerated} neue Templates generiert`,
      totalGenerated,
      results,
      summary: {
        processed: FIRST_GRADE_DOMAINS.length * FIRST_GRADE_QUARTERS.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        sufficient: results.filter(r => r.status === 'sufficient').length
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 First-Grade Cron Fehler:', error);
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